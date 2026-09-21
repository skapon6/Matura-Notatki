// app/api/analyze-essay/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../../lib/supabaseServer";
import { ckeGuidelines } from "../../lib/ckeGuidelines";

export const dynamic = "force-dynamic";

// Klient Claude (Anthropic) do weryfikacji merytorycznej i językowej
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Klient Gemini wykorzystywany WYŁĄCZNIE do darmowych wektorów embedding dla bazy RAG
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 KULOODPORNY EKSTRAKTOR I WALIDATOR STRUKTURY JSON
const extractAndParseJSON = (rawText: string) => {
  if (!rawText) {
    throw new Error("Otrzymano pustą odpowiedź od AI.");
  }

  // 1. Usunięcie znaczników markdown ```json ... ```
  let text = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // 2. Znalezienie skrajnych nawiasów głównego obiektu
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Materiały wyjściowe AI nie zawierają obiektu JSON.");
  }

  const jsonCandidate = text.substring(firstBrace, lastBrace + 1);

  // 3. Pierwsza próba: bezpośredni parse całego obiektu
  try {
    const parsed = JSON.parse(jsonCandidate);
    if (parsed && typeof parsed === "object" && parsed.score && Array.isArray(parsed.details)) {
      return parsed;
    }
  } catch (err) {
    // 4. Druga próba: naprawa surowych znaków kontrolnych i niedozwolonych enterów w stringach
    try {
      const sanitized = jsonCandidate.replace(/[\u0000-\u001F]+/g, (match) => {
        if (match === "\n") return "\\n";
        if (match === "\r") return "\\r";
        if (match === "\t") return "\\t";
        return "";
      });

      const parsedSanitized = JSON.parse(sanitized);
      if (parsedSanitized && typeof parsedSanitized === "object" && parsedSanitized.score && Array.isArray(parsedSanitized.details)) {
        return parsedSanitized;
      }
    } catch (innerErr) {
      console.error("Błąd parsowania po sanityzacji:", innerErr);
    }
  }

  throw new Error("AI zwróciło uszkodzoną lub niekompletną strukturę raportu CKE (brak score lub details).");
};

export async function POST(req: NextRequest) {
  let creditDeducted = false;
  let newCredits = 0;
  let userId = "";

  try {
    // 1. Bezpieczna autoryzacja za pomocą getUser()
    const supabase = await getSupabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }
    userId = user.id;

    // 2. Dane wejściowe
    const { topic, essayText } = await req.json();
    if (!topic || !essayText) {
      return NextResponse.json({ error: "Brak tematu lub treści wypracowania." }, { status: 400 });
    }

    // A. SZTYWNE LIMITY ZNAKOWE
    if (essayText.length > 10000) {
      return NextResponse.json({ error: "Tekst wypracowania jest zbyt długi (maksymalnie 10 000 znaków)." }, { status: 400 });
    }
    if (topic.length > 2000) {
      return NextResponse.json({ error: "Temat jest zbyt długi (maksymalnie 2000 znaków)." }, { status: 400 });
    }

    const topicWords = topic.split(/\s+/).filter(Boolean);
    const essayWords = essayText.split(/\s+/).filter(Boolean);

    // B. BLOKADA SPAMU / CIĄGÓW BEZ SPACJI
    const hasInvalidTopicWord = topicWords.some((word: string) => word.length > 25);
    const hasInvalidEssayWord = essayWords.some((word: string) => word.length > 25);

    if (hasInvalidTopicWord || hasInvalidEssayWord) {
      return NextResponse.json(
        { error: "Tekst zawiera nieprawidłowe, sztucznie wydłużone słowa (maksymalna długość słowa to 25 znaków)." },
        { status: 400 }
      );
    }

    // C. WALIDACJA LIMITÓW SŁÓW
    const topicWordCount = topicWords.length;
    if (topicWordCount > 200) {
      return NextResponse.json({ error: "Temat rozprawki przekracza maksymalny limit 200 słów." }, { status: 400 });
    }

    const wordCount = essayWords.length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Tekst jest zbyt krótki (minimum 50 słów)." }, { status: 400 });
    }
    if (wordCount > 1500) {
      return NextResponse.json({ error: "Tekst przekracza maksymalny limit 1500 słów." }, { status: 400 });
    }

    // 3. Atomowe pobranie kredytu z bazy
    const { data: deductedCredits, error: rpcError } = await supabaseAdmin
      .rpc('deduct_credit', { user_id_param: userId });

    if (rpcError || deductedCredits === null || deductedCredits === -1) {
      return NextResponse.json(
        { error: "Brak wolnych kredytów lub błąd podczas pobierania profilu." },
        { status: 403 }
      );
    }

    newCredits = deductedCredits;
    creditDeducted = true;

    // 4. KROK RAG: Generowanie wektora embedding przez Gemini
    let embeddingVector: number[] | null = null;
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
      const embeddingResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: essayText }] },
        outputDimensionality: 768,
      } as any);
      
      if (embeddingResult.embedding?.values) {
        embeddingVector = embeddingResult.embedding.values;
      }
    } catch (embedError) {
      console.warn("Błąd generowania embeddingu (kontynuujemy bez bazy RAG):", embedError);
    }

    // 5. KROK RAG: Odpytanie bazy Supabase o wzorce
    let similarEssaysContext = "";
    if (embeddingVector) {
      try {
        const { data: similar } = await supabaseAdmin.rpc("match_essays", {
          query_embedding: embeddingVector,
          match_threshold: 0.85,
          match_count: 2
        });

        if (similar && similar.length > 0) {
          similarEssaysContext = `\n\n=== PODOBNE PRACE Z BAZY WZORCÓW ===\n`;
          similar.forEach((item: any, index: number) => {
            similarEssaysContext += `Przykład ${index + 1}: Temat: "${item.topic}", Ocena: ${item.score}\n---\n`;
          });
        }
      } catch (dbError) {
        console.warn("Błąd wyszukiwania podobnych prac:", dbError);
      }
    }

    // 6. PROMPT SYSTEMOWY DLA CLAUDE
    const systemPrompt = `Jesteś oficjalnym, doświadczonym i skrupulatnym egzaminatorem CKE oceniającym wypracowania maturalne z języka polskiego (poziom podstawowy, Formuła 2023, skala 35 punktów). 

Twoim zadaniem jest dokładna, sprawiedliwa ocena pracy zgodnie z oficjalnym kluczem CKE. 
- ABSOLUTNY ZAKAZ SAMODZIELNEGO LICZENIA SŁÓW: Zawsze i bezwzględnie musisz opierać się TYLKO i WYŁĄCZNIE na liczbie słów podanej w sekcji [DANE TECHNICZNE WYPRACOWANIA] obliczonej przez serwer. Nie wolno Ci przeliczać słów na własną rękę ani kwestionować danych serwerowych!

=== BAZA WIEDZY I OFICJALNY ZŁOTY WZORZEC CKE ===
${ckeGuidelines}
=== KONIEC BAZY WIEDZY ===
${similarEssaysContext}

=== KRYTERIA I ZASADY PUNKTACJI CKE ===

1. WERYFIKACJA OBJĘTOŚCI:
   - Wymóg formalny: minimum 300 słów.
   - Jeśli słów < 300: przyznaj KW = 0/7 oraz JW = 0/11 (oficjalna zasada CKE!).
   - Jeśli słów >= 300: oceń pełne 4 kryteria.

2. KLiK (0–16 pkt) & BŁĘDY RZECZOWE:
   - Przeprowadź bezwzględnie wnikliwą i surową analizę treści pod kątem błędów rzeczowych, przeinaczeń fabularnych oraz błędów kardynalnych.
   - Za każdy unikalny błąd rzeczowy odetnij 1 punkt z kryterium KLiK.
   - 13–16 pkt: Pogłębiona argumentacja, oba utwory w pełni funkcjonalne pod tezę, brak błędów rzeczowych.
   - 9–12 pkt: Zadowalająca argumentacja, poprawna analiza lektur.
   - 8 pkt: Jedna lektura funkcjonalna, druga częściowo funkcjonalna, powierzchowna argumentacja.
   - 1–4 pkt: Wyłącznie powierzchowne streszczenie fabuły.

3. KW: Kompozycja (0–7 pkt):
   - 3a (Struktura): 0–3 pkt.
   - 3b (Spójność): 0–3 pkt.
   - 3c (Styl): 0–1 pkt.

4. JW: Język i styl (0–11 pkt) – APTEKARSKI AUDYT JĘZYKOWY:
   - Policz WSZYSTKIE usterki: językowe, ortograficzne i interpunkcyjne.
   - BŁĘDY ORTOGRAFICZNE (4b): Zalicza się tu również pisanie małą literą nazw własnych, narodowości, mieszkańców miast oraz nazw zakonów.
   - BŁĘDY INTERPUNKCYJNE (4c): Ścigaj brakujące i zbędne przecinki.
   - Jeśli błędów językowych jest >= 18: przyznaj za 4a BEZWZGLĘDNIE 0/7 PKT!
   - 4b (Ortografia): 0–2 pkt (0-1 błąd = 2 pkt, 2-3 błędy = 1 pkt, 4+ = 0 pkt).
   - 4c (Interpunkcja): 0–2 pkt (0-4 błędy = 2 pkt, 5-14 błędów = 1 pkt, 15+ = 0-1 pkt).

5. KRYTYCZNY WYMÓG: TABLICA "annotations" (PODŚWIETLENIA BŁĘDÓW W TEKŚCIE):
   - W tablicy "annotations" MUSISZ wypisać KAŻDY błąd językowy, ortograficzny, interpunkcyjny i rzeczowy.
   - "original": MUSI TO BYĆ KOPIA 1:1 (COPY-PASTE) fragmentu tekstu ucznia (1-4 słowa). WAŻNE DLA JSON: Jeśli w cytowanym fragmencie występuje cudzysłów (np. "), MUSISZ go bezwzględnie wyescape'ować (\\").
   - "replacement": poprawna forma.
   - "type": dokładnie jeden z: "rzeczowy" | "językowy" | "ortograficzny" | "interpunkcyjny".
   - "explanation": zwięzłe wyjaśnienie reguły (1 zdanie).

=== FORMAT ODPOWIEDZI ===
Zwróć WYŁĄCZNIE poprawny, kompletny obiekt JSON bez znaczników markdown:

{
  "_scoring_log": "Brudnopis oceniania...",
  "score": "X/35",
  "details": [
    {
      "criterion": "Spełnienie formalnych warunków polecenia",
      "points": "X/1",
      "comment": "Zwięzłe uzasadnienie."
    },
    {
      "criterion": "Kompetencje literackie i kulturowe",
      "points": "X/16",
      "comment": "Rzetelna ocena funkcjonalności utworów i argumentacji w oparciu o tabelę CKE."
    },
    {
      "criterion": "Kompozycja wypowiedzi",
      "points": "X/7",
      "comment": "Ocena układu trójdzielnego, akapitów i spójności wywodu."
    },
    {
      "criterion": "Język wypowiedzi",
      "points": "X/11",
      "comment": "Ocena zakresu oraz zliczonych błędów językowych, ortograficznych i interpunkcyjnych."
    }
  ],
  "summary": "Konstruktywne podsumowanie egzaminatora z wytycznymi.",
  "annotations": [
    {
      "original": "dokładny fragment z błędem z tekstu ucznia",
      "replacement": "poprawna forma",
      "type": "rzeczowy | językowy | ortograficzny | interpunkcyjny",
      "explanation": "Zwięzłe wyjaśnienie reguły."
    }
  ]
}`;

    const safeEssayText = essayText.replace(/<essay>/g, "").replace(/<\/essay>/g, "");
    const safeTopic = topic.replace(/<topic>/g, "").replace(/<\/topic>/g, "");
    const isUnder300Words = wordCount < 300;

    const userMessage = `
    [DANE TECHNICZNE WYPRACOWANIA]
    - Dokładna liczba słów (obliczona przez serwer): ${wordCount} słów.
    - Status limitu 300 słów: ${isUnder300Words ? "NIE SPEŁNIONO (mniej niż 300 słów - wyzeruj KW i JW)" : "SPEŁNIONO (300 słów lub więcej - oceń pełne kryteria KW i JW!)"}

    [TEMAT ROZPRAWKI]
    <topic>${safeTopic}</topic>

    [TREŚĆ ROZPRAWKI UCZNIA]
    <essay>
    ${safeEssayText}
    </essay>

    Oceń powyższą rozprawkę zgodnie z oficjalnymi kryteriami CKE Formuła 2023. 
WAŻNE: Opieraj się WYŁĄCZNIE na podanej liczbie słów (${wordCount} słów). Zwróć tylko czysty JSON z polami: score, details, summary, annotations.`;

    const CLAUDE_MODELS_TO_TRY = [
      "claude-sonnet-5",
      "claude-sonnet-4-6",
      "claude-haiku-4-5",
    ];

    let claudeResponse: any = null;
    let finalModelUsed = "";
    let modelSuccess = false;

    for (const modelName of CLAUDE_MODELS_TO_TRY) {
      try {
        console.log(`-> Wywołanie Claude (${modelName})...`);
        claudeResponse = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4000,
          thinking: { type: "disabled" },
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: userMessage,
            },
          ],
        });

        finalModelUsed = modelName;
        modelSuccess = true;
        console.log(`-> Sukces! Analiza ukończona za pomocą: ${finalModelUsed}`);
        break;
      } catch (claudeErr: any) {
        console.warn(`Błąd modelu ${modelName}:`, claudeErr?.message || claudeErr);
        continue;
      }
    }

    if (!modelSuccess || !claudeResponse) {
      throw new Error("CLAUDE_API_ERROR");
    }

    let responseText = "";
    if (Array.isArray(claudeResponse.content)) {
      for (const block of claudeResponse.content) {
        if (block.type === "text" && block.text) {
          responseText += block.text;
        }
      }
    }

    if (!responseText.trim()) {
      for (const block of claudeResponse.content) {
        if (block.text) responseText += block.text;
      }
    }

    if (!responseText.trim()) {
      throw new Error("Otrzymano pustą odpowiedź od AI.");
    }

    // Bezpieczne parsowanie z gwarancją kompletności
    const parsedResult = extractAndParseJSON(responseText);

    const clientResult = { ...parsedResult };
    delete clientResult._scoring_log;

    // 8. Zapis oceny do bazy Supabase z twardą kontrolą błędów
    const { error: insertError } = await supabaseAdmin
      .from("essay_evaluations")
      .insert({
        user_id: userId,
        topic: topic,
        essay_text: essayText,
        score: parsedResult.score,
        analysis_result: parsedResult,
        embedding: embeddingVector,
      });

    if (insertError) {
      console.error("Błąd zapisu do bazy:", insertError);
      throw new Error("Błąd podczas zapisywania oceny w bazie danych.");
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: clientResult,
    });

  } catch (error: any) {
    console.error("Błąd analizy Claude:", error);

    // Atomowy rollback tokena przy jakimkolwiek błędzie
    if (creditDeducted && userId) {
      try {
        await supabaseAdmin.rpc('increment_credit', { user_id_param: userId });
        console.log("-> Kredyt został pomyślnie zwrócony na konto (rollback).");
      } catch (rollbackError) {
        console.error("Błąd rollbacku kredytu:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Wystąpił błąd podczas analizy wypracowania przez Claude AI. Twój kredyt został automatycznie zwrócony." },
      { status: 500 }
    );
  }
}