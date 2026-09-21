// app/api/analyze-essay/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../../lib/supabaseServer";
import { ckeGuidelines } from "../../lib/ckeGuidelines";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🎯 SCHEMAT NARZĘDZIA DLA CLAUDE: "annotations" NA SAMYM POCZĄTKU
const ckeEvaluationTool: Anthropic.Tool = {
  name: "ocen_rozprawke_cke",
  description: "Zapisz oficjalny protokół oceny wypracowania maturalnego CKE z języka polskiego.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "string",
        description: "Łączny wynik punktowy w formacie X/35, np. '24/35'."
      },
      annotations: {
        type: "array",
        description: "BEZWZGLĘDNIE WYMAGANA LISTA PODŚWIETLEŃ W TEKŚCIE. Każdy błąd językowy, ortograficzny, interpunkcyjny i rzeczowy, za który obniżasz punkty, MUSI znaleźć się w tej tablicy. Nigdy nie zostawiaj jej pustej, jeśli praca ma jakiekolwiek usterki!",
        items: {
          type: "object",
          properties: {
            original: {
              type: "string",
              description: "DOKŁADNY fragment z tekstu ucznia (1-4 słowa, czysty copy-paste 1:1), w którym występuje usterka."
            },
            replacement: {
              type: "string",
              description: "Poprawna forma lub wskazówka."
            },
            type: {
              type: "string",
              enum: ["rzeczowy", "językowy", "ortograficzny", "interpunkcyjny"],
              description: "Kategoria błędu"
            },
            explanation: {
              type: "string",
              description: "Krótkie wyjaśnienie reguły (1 zdanie)."
            }
          },
          required: ["original", "replacement", "type", "explanation"]
        }
      },
      details: {
        type: "array",
        description: "Szczegółowa ocena 4 kryteriów CKE (Spełnienie formalnych warunków, KLiK, KW, JW)",
        items: {
          type: "object",
          properties: {
            criterion: {
              type: "string",
              description: "Nazwa kryterium CKE"
            },
            points: {
              type: "string",
              description: "Punkty, np. '13/16' lub '1/1'"
            },
            comment: {
              type: "string",
              description: "Merytoryczne uzasadnienie oceny kryterium."
            }
          },
          required: ["criterion", "points", "comment"]
        }
      },
      summary: {
        type: "string",
        description: "Konstruktywne podsumowanie krytyka z wytycznymi dla ucznia."
      }
    },
    required: ["score", "annotations", "details", "summary"]
  }
};

export async function POST(req: NextRequest) {
  let creditDeducted = false;
  let newCredits = 0;
  let userId = "";

  try {
    // 1. Autoryzacja
    const supabase = await getSupabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }
    userId = user.id;

    // 2. Walidacja wejścia
    const { topic, essayText } = await req.json();
    if (!topic || !essayText) {
      return NextResponse.json({ error: "Brak tematu lub treści wypracowania." }, { status: 400 });
    }

    if (essayText.length > 10000) {
      return NextResponse.json({ error: "Tekst wypracowania jest zbyt długi (maksymalnie 10 000 znaków)." }, { status: 400 });
    }
    if (topic.length > 2000) {
      return NextResponse.json({ error: "Temat jest zbyt długi (maksymalnie 2000 znaków)." }, { status: 400 });
    }

    const topicWords = topic.split(/\s+/).filter(Boolean);
    const essayWords = essayText.split(/\s+/).filter(Boolean);

    if (topicWords.some((w: string) => w.length > 25) || essayWords.some((w: string) => w.length > 25)) {
      return NextResponse.json(
        { error: "Tekst zawiera nieprawidłowe słowa (maksymalna długość słowa to 25 znaków)." },
        { status: 400 }
      );
    }

    const wordCount = essayWords.length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Tekst jest zbyt krótki (minimum 50 słów)." }, { status: 400 });
    }
    if (wordCount > 1500) {
      return NextResponse.json({ error: "Tekst przekracza maksymalny limit 1500 słów." }, { status: 400 });
    }

    // 3. Pobranie kredytu
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

    // 4. KROK RAG: Embedding Gemini
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
      console.warn("Błąd embeddingu:", embedError);
    }

    // 5. Kontekst RAG
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

    // 6. TWÓJ ORYGINALNY PROMPT SYSTEMOWY
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
   - Przeprowadź bezwzględnie wnikliwą i surową analizę treści pod kątem wszelkiego rodzaju błędów rzeczowych, przeinaczeń fabularnych, fałszu merytorycznego, anachronizmów oraz błędów kardynalnych.
   - Za każdy unikalny błąd rzeczowy odetnij 1 punkt z kryterium KLiK (pamiętaj o zasadzie: błąd kardynalny lub zbyt wiele błędów rzeczowych może zniszczyć całą punktację).
   - 13–16 pkt: Pogłębiona argumentacja, oba utwory w pełni funkcjonalne pod tezę, brak błędów rzeczowych.
   - 9–12 pkt: Zadowalająca argumentacja, poprawna analiza lektur.
   - 8 pkt: Jedna lektura funkcjonalna, druga częściowo funkcjonalna, powierzchowna argumentacja.
   - 1–4 pkt: Wyłącznie powierzchowne streszczenie fabuły.

3. KW: Kompozycja (0–7 pkt):
   - 3a (Struktura): 0–3 pkt.
   - 3b (Spójność): 0–3 pkt (zlicz zaburzenia logiczne i przeskoki).
   - 3c (Styl): 0–1 pkt.

4. JW: Język i styl (0–11 pkt) – APTEKARSKI AUDYT JĘZYKOWY:
   - Policz absolutnie WSZYSTKIE usterki: językowe, ortograficzne i interpunkcyjne.
   - BŁĘDY ORTOGRAFICZNE (Kryterium 4b): Zalicza się tu również pisanie małą literą nazw własnych, narodowości, mieszkańców krajów/miast oraz nazw zakonów (np. "krzyżaków" zamiast "Krzyżaków", "polak", "warszawiak"). Każde takie odstępstwo to bezwzględny błąd ortograficzny!
   - BŁĘDY INTERPUNKCYJNE (Kryterium 4c): Wymóg bezwzględnego ścigania zbędnych lub brakujących przecinków. Każdy zbędny przecinek przed spójnikami porównawczymi typu "niż", "jak" łączącymi równoważniki zdań (np. "ważniejsze, niż szczęście") MUSI zostać wykryty, umieszczony w sekcji "annotations" z typem "interpunkcyjny" i odjęty w liczbie błędów! Nie pomijaj takich błędów.
   - Jeśli błędów językowych jest >= 18: przyznaj za 4a BEZWZGLĘDNIE 0/7 PKT!
   - 4b (Ortografia): 0–2 pkt (0-1 błąd = 2 pkt, 2-3 błędy = 1 pkt, 4+ = 0 pkt).
   - 4c (Interpunkcja): 0–2 pkt (0-4 błędy = 2 pkt, 5-14 błędów = 1 pkt, 15+ = 0-1 pkt).
   - APTEKARSKA SKRUPULATNOŚĆ JĘZYKOWA: Nie pomijaj błędów interpunkcyjnych oraz drobnych potknięć słownikowych. Analizuj tekst z bezwzględnym rygorem egzaminatora państwowego.

5. KRYTYCZNY WYMÓG: TABLICA "annotations" (PODŚWIETLENIA BŁĘDÓW W INTERFEJSIE):
   - W tablicy "annotations" MUSISZ bezwzględnie wypisać KAŻDY błąd językowy, ortograficzny, interpunkcyjny i rzeczowy.
   - KATEGORYCZNY ZAKAZ wymieniania błędów wyłącznie w tekście komentarza! Jeśli widzisz błąd (np. "Chcę pochować brata", "na która", "rządze dusz"), Twoim pierwszym obowiązkiem jest dodać go do tablicy "annotations"!
   - "original": MUSI TO BYĆ BEZWZGLĘDNA KOPIA 1:1 (COPY-PASTE) fragmentu tekstu ucznia (1-4 słowa).
   - "replacement": poprawna forma.
   - "type": dokładnie jeden z: "rzeczowy" | "językowy" | "ortograficzny" | "interpunkcyjny".
   - "explanation": zwięzłe wyjaśnienie reguły (1 zdanie).

Zwróć pełną ocenę za pomocą dedykowanego narzędzia ocen_rozprawke_cke.`;

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
WAŻNE: 
1. Opieraj się WYŁĄCZNIE na podanej wyżej liczbie słów z serwera (${wordCount} słów).
2. KRYTYCZNE DLA INTERFEJSU: Wypełnij tablicę "annotations" wszystkimi wykrytymi błędami. Bez tego uczeń nie zobaczy kolorowych podświetleń w edytorze! Nie ograniczaj się tylko do wypisania ich w komentarzu.
Wywołaj narzędzie ocen_rozprawke_cke.`;

    // 7. WYWOŁANIE CLAUDE
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
        console.log(`-> Wywołanie Claude (${modelName}) z Tool Calling...`);
        claudeResponse = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4000,
          thinking: { type: "disabled" },
          tools: [ckeEvaluationTool],
          tool_choice: { type: "tool", name: "ocen_rozprawke_cke" },
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

    const toolUseBlock = claudeResponse.content?.find((b: any) => b.type === "tool_use");
    if (!toolUseBlock || !toolUseBlock.input) {
      throw new Error("Model Claude nie wywołał narzędzia oceny.");
    }

    const parsedResult = toolUseBlock.input as any;

    // 🛡️ PANZERNY FALLBACK: Jeśli Claude wypisał błędy w komentarzu zamiast w annotations, wyciągamy je automatycznie!
    if (!Array.isArray(parsedResult.annotations)) {
      parsedResult.annotations = [];
    }

    if (parsedResult.annotations.length === 0 && Array.isArray(parsedResult.details)) {
      console.warn("-> Claude zwrócił pustą tablicę annotations. Uruchamiam Auto-Extractor z komentarzy...");
      
      parsedResult.details.forEach((d: any) => {
        const commentText = String(d?.comment || "");
        // Wyłapuje konstrukcje typu: 'błąd' zamiast 'poprawnie' lub „błąd” zamiast „poprawnie”
        const regexPair = /['„"]([^'”"]+)['”"]\s+zamiast\s+['„"]([^'”"]+)['”"]/gi;
        let match: RegExpExecArray | null;

        while ((match = regexPair.exec(commentText)) !== null) {
          const originalCandidate = match[1].trim();
          const replacementCandidate = match[2].trim();

          // Sprawdzamy, czy ten fragment rzeczywiście istnieje w tekście wypracowania
          if (essayText.toLowerCase().includes(originalCandidate.toLowerCase())) {
            parsedResult.annotations.push({
              original: originalCandidate,
              replacement: replacementCandidate,
              type: String(d.criterion).toLowerCase().includes("język") ? "językowy" : "rzeczowy",
              explanation: `Błąd wskazany przez egzaminatora: powinno być „${replacementCandidate}”.`
            });
          }
        }
      });

      if (parsedResult.annotations.length > 0) {
        console.log(`-> Auto-Extractor pomyślnie odzyskał ${parsedResult.annotations.length} podświetleń!`);
      }
    }

    if (!parsedResult.score || !Array.isArray(parsedResult.details)) {
      throw new Error("Otrzymano niekompletną strukturę oceny z modelu.");
    }

    // 8. Zapis oceny do bazy Supabase
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
      throw new Error("Nie udało się zapisać wyniku analizy w bazie.");
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: parsedResult,
    });

  } catch (error: any) {
    console.error("Błąd analizy Claude:", error);

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