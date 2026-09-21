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

// 🎯 SCHEMAT NARZĘDZIA Z WYMUSZONĄ PEŁNĄ LISTĄ BŁĘDÓW
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
        description: "KOMPLETNA I WYCZERPUJĄCA LISTA WSZYSTKICH BŁĘDÓW W TEKŚCIE. Zakaz podawania jedynie kilku próbek! Każda pojedyncza usterka (językowa, ortograficzna, każdy brakujący przecinek, błąd spacji czy błąd rzeczowy), którą odliczasz w punktacji, MUSI mieć tutaj swój osobny obiekt.",
        items: {
          type: "object",
          properties: {
            original: {
              type: "string",
              description: "Dokładny fragment (1-4 słowa) z tekstu ucznia (copy-paste 1:1)."
            },
            replacement: {
              type: "string",
              description: "Poprawna forma (np. wstawiony przecinek, poprawna litera, lepsze słowo)."
            },
            type: {
              type: "string",
              enum: ["rzeczowy", "językowy", "ortograficzny", "interpunkcyjny"],
              description: "Kategoria błędu"
            },
            explanation: {
              type: "string",
              description: "Krótkie wyjaśnienie reguły."
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

    // 🌟 KROK 5B: SZYBKI AUDYT FAKTÓW FABULARNYCH PRZEZ GEMINI FLASH (~1s)
    let factCheckContext = "";
    try {
      const factModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      const factPrompt = `Jesteś bezwzględnym weryfikatorem faktów literackich (CKE Matura z języka polskiego).
      Przeanalizuj poniższe wypracowanie i wskaż WYŁĄCZNIE obiektywne błędy rzeczowe/fabularne:
      - Czy bohaterowie nie zostali zamienieni? (np. kto z kim rozmawiał, kto co komu wręczył, kto kogo zabił)
      - Czy wydarzenia, miejsca akcji i motywy są w 100% zgodne z fabułą lektur?
      Nie oceniaj języka, stylu ani kompozycji. 

Zwróć odpowiedź w poprawnym formacie JSON:
{
  "has_factual_errors": boolean,
  "errors": [
    {
      "original": "dokładny krótki cytat 1-4 słowa z tekstu ucznia",
      "explanation": "zwięzłe wyjaśnienie błędu rzeczowego",
      "replacement": "poprawny fakt"
    }
  ]
}
Jeśli w wypracowaniu nie ma żadnych błędów rzeczowych, zwróć: {"has_factual_errors": false, "errors": []}

TEMAT ROZPRAWKI:
${topic}

TEKST WYPRACOWANIA:
${essayText}`;

      const factRes = await factModel.generateContent({
        contents: [{ role: "user", parts: [{ text: factPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const factJson = JSON.parse(factRes.response.text());
      if (factJson.has_factual_errors && Array.isArray(factJson.errors) && factJson.errors.length > 0) {
        factCheckContext = `\n\n=== AUDYT FAKTÓW FABULARNYCH DLA LEKTUR (GEMINI FACT-CHECK) ===\n` +
          factJson.errors.map((err: any, i: number) => 
            `${i + 1}. Fragment z błędem: "${err.original}" | Błąd: ${err.explanation} | Sprostowanie: ${err.replacement}`
          ).join("\n") +
          `\nZALECENIE: Powyższe błędy fabularne zostały zweryfikowane encyklopedycznie. Uwzględnij je przy punktacji KLiK (odejmij odpowiednio punkty) i dodaj do tablicy "annotations" jako type: "rzeczowy". Uważaj, aby nie powielać tego samego błędu wielokrotnie!`;
      }
    } catch (e) {
      console.warn("Błąd audytu faktów Gemini Flash (kontynuujemy bez asysty):", e);
    }

    // 6. TWÓJ ORYGINALNY PROMPT SYSTEMOWY (NIETKNIĘTY)
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
   - RYGOR FAKTOGRAFICZNY (ZERO POBŁAŻLIWOŚCI): Pod żadnym pozorem nie usprawiedliwiaj przeinaczeń fabularnych jako „drobnych niejednoznaczności”, „skrótów myślowych” czy „dopuszczalnych uproszczeń”! Egzaminator CKE bezwzględnie karze za błędy faktograficzne.
   - ODDZIELENIE SYMBOLIKI OD FAKTÓW: Nawet jeśli wywód ucznia brzmi dojrzale, a interpretacja motywu czy symbolu jest trafna, to jeśli fakt fabularny (kto, komu, co zrobił, w jakich okolicznościach, gdzie, kiedy) jest niezgodny z treścią utworu – JEST TO BEZWZGLĘDNY BŁĄD RZECZOWY!
   - CO STANOWI BŁĄD RZECZOWY (-1 PKT W KLiK):
     * Błędne przypisanie czynu, relacji, dialogu, symbolu, rekwizytu lub wydarzenia do niewłaściwego bohatera (np. pomylenie postaci w danej scenie, przypisanie jednemu bohaterowi doświadczeń innego).
     * Przeinaczenie faktów z fabuły utworu, motywacji postaci, chronologii zdarzeń lub finału losów bohaterów drugoplanowych.
     * Pomylenie imion, nazwisk, tytułów utworów, autorów lub faktów historycznych/biograficznych.
   - Za KAŻDY unikalny błąd rzeczowy bezwzględnie odejmij 1 punkt od wyjściowej punktacji KLiK (pamiętaj: błąd kardynalny zeruje całą pracę, a zwykły błąd rzeczowy odejmuje 1 pkt).
   - Skala bazowa KLiK (przed potrąceniami za błędy rzeczowe):
     * 13–16 pkt: Pogłębiona argumentacja, oba utwory w pełni funkcjonalne pod tezę.
     * 9–12 pkt: Zadowalająca argumentacja, poprawna analiza lektur.
     * 8 pkt: Jedna lektura funkcjonalna, druga częściowo funkcjonalna, powierzchowna argumentacja.
     * 1–4 pkt: Wyłącznie powierzchowne streszczenie fabuły.

3. KW: Kompozycja (0–7 pkt):
   - 3a (Struktura): 0–3 pkt.
   - 3b (Spójność): 0–3 pkt (zlicz zaburzenia logiczne i przeskoki).
   - 3c (Styl): 0–1 pkt.

4. JW: Język i styl (0–11 pkt) – APTEKARSKI AUDYT JĘZYKOWY:
   - Policz absolutnie WSZYSTKIE usterki: językowe, ortograficzne i interpunkcyjne.
   - BŁĘDY ORTOGRAFICZNE (Kryterium 4b): Zalicza się tu również pisanie małą literą nazw własnych, narodowości, mieszkańców krajów/miast oraz nazw zakonów (np. "krzyżaków" zamiast "Krzyżaków", "polak", "warszawiak"). Każde takie odstępstwo to bezwzględny błąd ortograficzny!
   - BŁĘDY INTERPUNKCYJNE (Kryterium 4c): Wymóg bezwzględnego ścigania zbędnych lub brakujących przecinków. Każdy zbędny przecinek przed spójnikami porównawczymi typu "niż", "jak" łączącymi równoważniki zdań MUSI zostać wykryty i odjęty w liczbie błędów!
   - Jeśli błędów językowych jest >= 18: przyznaj za 4a BEZWZGLĘDNIE 0/7 PKT!
   - 4b (Ortografia): 0–2 pkt (0-1 błąd = 2 pkt, 2-3 błędy = 1 pkt, 4+ = 0 pkt).
   - 4c (Interpunkcja): 0–2 pkt (0-4 błędy = 2 pkt, 5-14 błędów = 1 pkt, 15+ = 0-1 pkt).
   - APTEKARSKA SKRUPULATNOŚĆ JĘZYKOWA: Nie pomijaj błędów interpunkcyjnych oraz drobnych potknięć słownikowych. Analizuj tekst z bezwzględnym rygorem egzaminatora państwowego.

5. KRYTYCZNY WYMÓG: TABLICA "annotations" (PODŚWIETLENIA BŁĘDÓW W INTERFEJSIE):
   - ABSOLUTNY ZAKAZ PODAWANIA PRÓBEK! Jeśli w kryteriach piszesz "naliczono 14 błędów językowych i 10 interpunkcyjnych", to tablica "annotations" MUSI zawierać dokładnie WSZYSTKIE te błędy (np. 24 oddzielne obiekty)! Każda usterka, za którą odejmujesz punkty, musi mieć swój wpis.
   - JAK OZNACZAĆ BRAKUJĄCY PRZECINEK: W polu "original" podaj słowo przed i słowo po brakującym przecinku z tekstu ucznia (np. "bohaterka pomimo że"), a w "replacement" podaj poprawną formę z przecinkiem ("bohaterka, pomimo że").
   - JAK OZNACZAĆ BŁĘDNE SPACJE / INTERPUNKCJĘ: Np. "original": "Zewnętrznej , " -> "replacement": "Zewnętrznej,".
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
    ${factCheckContext}

    Oceń powyższą rozprawkę zgodnie z oficjalnymi kryteriami CKE Formuła 2023. 
WAŻNE DLA INTERFEJSU:
1. W tablicy "annotations" wypisz WSZYSTKIE wykryte usterki (językowe, ortograficzne, interpunkcyjne ze spacjami i brakującymi przecinkami, rzeczowe). 
2. Nie ograniczaj się do 2-3 przykładów! Liczba wpisów w "annotations" ma odpowiadać liczbie błędów podanych w kryterium JW i KLiK, aby uczeń widział każde podświetlenie w tekście.
Wywołaj narzędzie ocen_rozprawke_cke.`;

    // 7. WYWOŁANIE CLAUDE Z ZWIĘKSZONYM BUFOREM TOKENÓW (8000 ZAMIAST 4000)
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
          max_tokens: 8000,
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
      console.error("Odpowiedź bez tool_use:", JSON.stringify(claudeResponse.content));
      throw new Error("Model Claude nie wywołał narzędzia oceny.");
    }

    const parsedResult = toolUseBlock.input as any;
    console.log("-> Odebrano dane z Claude. Klucze:", Object.keys(parsedResult));

    // Normalizacja annotations
    if (!Array.isArray(parsedResult.annotations)) {
      parsedResult.annotations = [];
    }

    // 🛡️ ANTY-DUPLIKACJA I OCHRONA PRZED NAKŁADANIEM SIĘ BŁĘDÓW (GEMINI + CLAUDE)
    const dedupedAnnotations: any[] = [];
    for (const anno of parsedResult.annotations) {
      const cleanOrig = String(anno.original || "").trim().toLowerCase();
      if (!cleanOrig) continue;

      // Sprawdzamy czy w deduped nie ma już błędu o identycznym lub nakładającym się fragmencie
      const isDuplicate = dedupedAnnotations.some((existing) => {
        const existOrig = String(existing.original || "").trim().toLowerCase();
        const isSameOrContained = existOrig === cleanOrig || existOrig.includes(cleanOrig) || cleanOrig.includes(existOrig);
        // Jeśli ten sam fragment ma błąd tego samego typu lub rzeczowy, nie dublujemy
        return isSameOrContained && (existing.type === anno.type || existing.type === "rzeczowy" || anno.type === "rzeczowy");
      });

      if (!isDuplicate) {
        dedupedAnnotations.push(anno);
      }
    }
    parsedResult.annotations = dedupedAnnotations;

    // Normalizacja details (jeśli model zwrócił obiekt zamiast tablicy)
    if (!Array.isArray(parsedResult.details) && typeof parsedResult.details === "object" && parsedResult.details !== null) {
      parsedResult.details = Object.entries(parsedResult.details).map(([k, v]: [string, any]) => ({
        criterion: k,
        points: String(v?.points || v?.score || ""),
        comment: typeof v === "string" ? v : String(v?.comment || JSON.stringify(v))
      }));
    }

    // Fallback dla wyniku (gdyby model nazwał to np. total_score lub samą liczbą)
    if (!parsedResult.score) {
      parsedResult.score = parsedResult.total_score || parsedResult.points || "0/35";
    }

    // 🛡️ DODATKOWY AUTO-EXTRACTOR (Gdyby model pominął któryś z cytowanych w recenzji błędów)
    if (Array.isArray(parsedResult.details)) {
      parsedResult.details.forEach((d: any) => {
        const commentText = String(d?.comment || "");
        const regexPair = /['„"]([^'”"]+)['”"]\s+zamiast\s+['„"]([^'”"]+)['”"]/gi;
        let match: RegExpExecArray | null;

        while ((match = regexPair.exec(commentText)) !== null) {
          const originalCandidate = match[1].trim();
          const replacementCandidate = match[2].trim();

          const alreadyExists = parsedResult.annotations.some(
            (a: any) => a.original?.toLowerCase() === originalCandidate.toLowerCase()
          );

          if (!alreadyExists && essayText.toLowerCase().includes(originalCandidate.toLowerCase())) {
            parsedResult.annotations.push({
              original: originalCandidate,
              replacement: replacementCandidate,
              type: String(d.criterion).toLowerCase().includes("orto") ? "ortograficzny" : "językowy",
              explanation: `Błąd wskazany przez egzaminatora: powinno być „${replacementCandidate}”.`
            });
          }
        }
      });
    }

    // 8. Zapis oceny do bazy Supabase (z bezpiecznym fallbackiem)
    const { error: insertError } = await supabaseAdmin
      .from("essay_evaluations")
      .insert({
        user_id: userId,
        topic: topic,
        essay_text: essayText,
        score: String(parsedResult.score || "0/35"),
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