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

// 🎯 DEDYKOWANE NARZĘDZIE CKE DLA CLAUDE
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
        description: "Lista wszystkich unikalnych usterek w tekście. ZASADA: Na jeden konkretny wyraz przypada maksymalnie jeden błąd (nie powielaj ortografii jako błędu językowego). Jeśli w jednym zdaniu występuje kilka błędów na różnych słowach, zaznacz każdy z nich oddzielnie!",
        items: {
          type: "object",
          properties: {
            original: {
              type: "string",
              description: "Dokładny fragment (1-4 słowa) z tekstu ucznia (copy-paste 1:1)."
            },
            replacement: {
              type: "string",
              description: "Poprawna forma (np. wstawiony przecinek, poprawna litera, lepsze słowo, sprostowanie faktu)."
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

    // 🌟 KROK 5B: SZYBKI I PRECYZYJNY AUDYT FAKTÓW ORAZ BŁĘDÓW KARDYNALNYCH PRZEZ GEMINI FLASH
    let geminiFactAudit = "";
    try {
      const factModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      const factPrompt = `Jesteś bezwzględnym, encyklopedycznym weryfikatorem faktów literackich i historycznych do egzaminu maturalnego CKE z języka polskiego.

Twoim wyłącznym zadaniem jest wykrycie:
1. BŁĘDÓW KARDYNALNYCH:
   - Całkowicie nieuprawniona interpretacja lektury obowiązkowej, będąca falsyfikacją losów głównego bohatera lub głównego wątku (np. Wokulski żeni się z Izabelą i żyją szczęśliwie; Raskolnikow jest niewinny; Roland ucieka z pola walki).
2. BŁĘDÓW RZECZOWYCH (Faktograficznych):
   - Zamiana bohaterów (np. Stańczyk ukazuje się Poecie zamiast Dziennikarzowi; Cichowski wywieziony na Sybir zamiast więziony w Warszawie).
   - Pomylenie narzędzi, rekwizytów i sposobu czynów (np. Raskolnikow zabija lichwiarkę sztyletem/nożem zamiast siekierą ze stróżówki; Konrad Wallenrod używa pistoletu zamiast trucizny; Stańczyk wręcza Poecie kaduceusz).
   - Pomylenie wydarzeń historycznych i powstań (np. Rzecki walczący w powstaniu styczniowym zamiast w Wiośnie Ludów na Węgrzech).
   - Pomylenie imion, nazwisk, autorów i realiów.

Nie oceniaj stylu, języka, kompozycji ani ortografii!
Ważne zastrzeżenie: najpierw zanim uznasz coś za błąd rzeczowy sprawdź czy faktycznie jest błędem rzeczowym w kontekście faktów, bohaterów i wydarzeń z lektury. Nie uznawaj danego błędu za rzeczowy lub kardynalny jeżeli wynika on z mniejszego doprecyzowania ucznia lub twojej błędnej interpretacji. Oceniaj te błędy w kontekście całego wypracowania a nie pojedynczego zdania wyjętego z kontekstu
Błąd kardynalny to poważny błąd rzeczowy w pracy maturalnej z języka polskiego, który świadczy o całkowitej nieznajomości fabuły, głównych wątków lub losów bohaterów lektury obowiązkowej (omówionej w całości) i całkowicie zniekształca sens utworu, dlatego uzywaj go tylko w ostateczności jeżeli uczeń całkowiocie nie zna faktów lub wydarzeń.

Zwróć odpowiedź w czystym formacie JSON:
{
  "has_cardinal_error": boolean,
  "cardinal_error_description": string | null,
  "has_factual_errors": boolean,
  "errors": [
    {
      "original": "dokładny krótki cytat (1-4 słowa) z tekstu ucznia z błędem",
      "explanation": "konkretne wyjaśnienie błędu rzeczowego",
      "replacement": "poprawny fakt"
    }
  ]
}

TEMAT:
${topic}

WYPRACOWANIE UCZNIA:
${essayText}`;

      const factRes = await factModel.generateContent({
        contents: [{ role: "user", parts: [{ text: factPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const factJson = JSON.parse(factRes.response.text());

      if (factJson.has_cardinal_error) {
        geminiFactAudit += `\n🚨 WYKRYTO BŁĄD KARDYNALNY: ${factJson.cardinal_error_description} -> Zgodnie z CKE praca = 0/35 pkt (SFWP=0, KLiK=0, KW=0, JW=0)!\n`;
      }

      if (factJson.has_factual_errors && Array.isArray(factJson.errors) && factJson.errors.length > 0) {
        geminiFactAudit += `\n=== AUDYT FAKTÓW FABULARNYCH (GEMINI FLASH) ===\n` +
          factJson.errors.map((err: any, i: number) => 
            `${i + 1}. Fragment: "${err.original}" | Błąd: ${err.explanation} | Sprostowanie: ${err.replacement}`
          ).join("\n") +
          `\nWskazówka CKE: Każdy powyższy błąd fabularny potraktuj jako błąd RZECZOWY (-1 pkt w KLiK) i dodaj do tablicy annotations jako type: "rzeczowy".`;
      }
    } catch (e) {
      console.warn("Błąd audytu faktów Gemini Flash:", e);
    }

    // 6. PROMPT SYSTEMOWY DLA CLAUDE ZGODNY Z INFORMATOREM CKE
// 6. DYNAMICZNY PROMPT SYSTEMOWY DLA CLAUDE (TWOJA WERSJA + INTEGRACJA FAKTÓW GEMINI)
    const systemPrompt = `Jesteś oficjalnym, doświadczonym i skrupulatnym egzaminatorem CKE oceniającym wypracowania maturalne z języka polskiego (poziom podstawowy, Formuła 2023, skala 35 punktów). 

Twoim zadaniem jest dokładna, sprawiedliwa ocena pracy zgodnie z oficjalnym kluczem CKE. 
- ABSOLUTNY ZAKAZ SAMODZIELNEGO LICZENIA SŁÓW: Zawsze i bezwzględnie musisz opierać się TYLKO i WYŁĄCZNIE na liczbie słów podanej w sekcji [DANE TECHNICZNE WYPRACOWANIA] obliczonej przez serwer. Nie wolno Ci przeliczać słów na własną rękę ani kwestionować danych serwerowych!

=== ZASADA WSPÓŁPRACY Z MODUŁEM FAKTÓW (GEMINI) ===
- W sekcji poniżej możesz otrzymać oficjalny audyt faktograficzny wykonany przez zewnętrzny moduł ekspercki.
- Jeśli moduł ten wskaże błąd kardynalny lub błędy rzeczowe, **MUSISZ je bezwzględnie przyjąć za pewnik i nie wolno Ci z nimi polemizować**. Umieść je w tabeli "annotations" jako type: "rzeczowy" oraz uwzględnij odpowiednie potrącenia punktowe w SFWP (błąd kardynalny = 0 pkt) i KLiK (błędy rzeczowe). Skup się na swojej głównej roli: ocenie struktury, kompozycji, argumentacji (KLiK) oraz aptekarskim audycie językowym, ortograficznym i interpunkcyjnym (JW).

=== BAZA WIEDZY I OFICJALNY ZŁOTY WZORZEC CKE ===
${ckeGuidelines}
=== KONIEC BAZY WIEDZY ===
${similarEssaysContext}

=== OFICJALNE ZASADY I KRYTERIA CKE (INFORMATOR MATURALNY) ===

1. WERYFIKACJA OBJĘTOŚCI (< 300 słów):
   - Wymóg formalny: minimum 300 słów.
   - Jeśli słów < 300: przyznaj KW = 0/7 oraz JW = 0/11 (oficjalna zasada CKE!).
   - Jeśli słów >= 300: oceń pełne 4 kryteria.

2. SFWP – Spełnienie formalnych warunków polecenia (0–1 pkt):
   - Jeśli w pracy wystąpił BŁĄD KARDYNALNY (stwierdzony w audycie faktów lub w tekście) -> SFWP = 0/1 pkt.
     ZASADA CKE: SFWP = 0 pkt powoduje, że WSZYSTKIE pozostałe kryteria (KLiK, KW, JW) = 0 pkt! Cała praca = 0/35 pkt.
   - 1 pkt: brak błędu kardynalnego, odwołanie do lektury obowiązkowej (analityczne), praca dotyczy problemu i jest wypowiedzią argumentacyjną.

3. KLiK – Kompetencje literackie i kulturowe (0–16 pkt):
   Polecenie CKE wymaga: (1) wybranej lektury obowiązkowej, (2) innego utworu literackiego oraz (3) wybranych kontekstów.
   
   TABELA CKE DLA LICZBY UTWORÓW I KONTEKSTÓW:
   A. [TYLKO JEDEN UTWÓR LITERACKI W PRACY (brak drugiego utworu / brak drugiego argumentu)]:
      - Jeśli uczeń odwołał się tylko do 1 utworu (nawet jeśli w pełni funkcjonalnie), MAKSYMALNA NOTA W KLIK TO ZALEDWIE 1–4 PKT:
        * 4 pkt: 1 utwór funkcjonalny + 2 konteksty funkcjonalne
        * 3 pkt: 1 utwór funkcjonalny + 1 kontekst funkcjonalny
        * 2 pkt: 1 utwór funkcjonalny + konteksty częściowo funkcjonalne
        * 1 pkt: 1 utwór funkcjonalny + brak funkcjonalnych kontekstów
      - Kategoryczny zakaz przyznawania 5, 8, 12 czy 14 punktów, jeśli praca nie zawiera drugiego utworu literackiego!
   
   B. [DWA UTWORY LITERACKIE W PEŁNI FUNKCJONALNE]:
      - 16 pkt: 2 utwory funkcjonalne + 2 konteksty funkcjonalne + erudycja
      - 15 pkt: 2 utwory funkcjonalne + min. 1 kontekst funkcjonalny
      - 14 pkt: 2 utwory funkcjonalne + konteksty częściowo funkcjonalne
      - 13 pkt: 2 utwory funkcjonalne + BRAK funkcjonalnych kontekstów (brak kontekstów ścina ocenę do 13 pkt!)
   
   C. [JEDEN W PEŁNI + DRUGI CZĘŚCIOWO FUNKCJONALNY]:
      - 12 pkt (2 konteksty funkcjonalne), 11 pkt (1 kontekst), 10 pkt (częściowe konteksty), 9 pkt (brak funkcjonalnych kontekstów).
   
   D. [DWA UTWORY CZĘŚCIOWO FUNKCJONALNE]:
      - 8-5 pkt w zależności od kontekstów.

   BŁĘDY RZECZOWE: Odejmij bezwzględnie 1 punkt za każdy unikalny błąd rzeczowy potwierdzony w audycie faktów lub w tekście.

4. KW – Kompozycja (0–7 pkt):
   - 3a (Struktura): 0–3 pkt. Jeśli uczeń przywołał tylko 1 utwór i 1 argument, struktura jest niepełna (max 1-2 pkt).
   - 3b (Spójność): 0–3 pkt.
   - 3c (Styl): 0–1 pkt.

5. JW – Język i styl (0–11 pkt) – APTEKARSKI AUDYT JĘZYKOWY:
   - Policz dokładnie wszystkie usterki i precyzyjnie przypisz kategorię:
     * "interpunkcyjny": brakujące lub zbędne przecinki (np. przed niż/jak), spacje przed znakami interpunkcyjnymi.
     * "ortograficzny": błędy pisowni (ó/u, rz/ż, ch/h, nie z częściami mowy, mała litera w nazwach własnych, narodowościach i zakonach).
     * "językowy": błędy leksykalne, frazeologiczne, pleonazmy, błędy składniowe, odmiana wyrazów.
   - 4a (Zakres i poprawność językowa): 0-7 pkt (≤5 błędów = 7-6 pkt, 6-8 = 6-5 pkt, 9-11 = 5-4 pkt, 12-14 = 4-3 pkt, 15-17 = 3-2 pkt, 18-21 = 2-1 pkt, ≥22 = 0 pkt).
   - 4b (Ortografia): 0-1 błąd = 2 pkt, 2-3 błędy = 1 pkt, ≥5 błędów = 0 pkt.
   - 4c (Interpunkcja): 0-8 błędów = 2 pkt, 9-16 błędów = 1 pkt, ≥17 błędów = 0 pkt.

6. ZASADY TABLICY "annotations" (INTERFEJS):
   - 1 KONKRETNY WYRAZ = MAKSYMALNIE 1 KATEGORIA BŁĘDU (jeśli wyraz ma błąd ortograficzny, oznacz go wyłącznie jako 'ortograficzny', nie dubluj jako 'językowy').
   - WIELE BŁĘDÓW W TYM SAMYM ZDANIU: Jeśli w jednym zdaniu występuje kilka usterek na RÓŻNYCH słowach (np. błąd interpunkcyjny, błąd ortograficzny i błąd rzeczowy) – OZNACZ KAŻDY Z NICH JAKO OSOBNY WPIS! Nie pomijaj drugiego błędu tylko dlatego, że w tym samym zdaniu był już inny.
   - "original": dokładny fragment (1-4 słowa) skopiowany 1:1 z tekstu ucznia.
   - "replacement": poprawna forma.

Wywołaj narzędzie ocen_rozprawke_cke.`;

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
    ${geminiFactAudit}

    Oceń powyższą rozprawkę zgodnie z oficjalnymi kryteriami CKE Formuła 2023. 
WAŻNE DLA OCENY:
1. Zwróć uwagę na liczbę argumentów i utworów literackich (jeśli uczeń użył TYLKO JEDNEGO utworu, KLiK wynosi max 1-4 pkt wg tabeli CKE!).
2. Uwzględnij błędy rzeczowe i kardynalne z audytu faktów. INSTRUKCJA DLA CIEBIE: Powyższe błędy rzeczowe/kardynalne zostały zweryfikowane przez niezależny moduł ekspercki. Nie podważaj ich! Musisz bezwzględnie przyjąć je za prawdę, uwzględnić w punktacji KLiK (i SFWP jeśli to błąd kardynalny) oraz umieścić w tablicy "annotations"
3. Wypisz usterki w tablicy "annotations". Na jedno słowo przypada max 1 błąd, ale jeśli w zdaniu są błędy na różnych słowach, oznacz każdy z nich.

Wywołaj narzędzie ocen_rozprawke_cke.`;

    // 7. WYWOŁANIE CLAUDE Z ZWIĘKSZONYM BUFOREM DO 12 000 TOKENÓW
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
        console.log(`-> Wywołanie Claude (${modelName}) z limitem 12k tokenów...`);
        claudeResponse = await anthropic.messages.create({
          model: modelName,
          max_tokens: 12000, // 🎯 12 000 tokenów wyjściowych zgodnie z życzeniem
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

    if (!Array.isArray(parsedResult.annotations)) {
      parsedResult.annotations = [];
    }

    // 🛡️ PRECYZYJNA ANTY-DUPLIKACJA:
    // Nie nakładamy dwóch błędów na DOKŁADNIE TO SAMO SŁOWO,
    // ale zachowujemy wszystkie różne błędy w tym samym zdaniu na osobnych słowach!
    const dedupedAnnotations: any[] = [];
    for (const anno of parsedResult.annotations) {
      const cleanOrig = String(anno.original || "").trim().toLowerCase();
      if (!cleanOrig) continue;

      const isSameWordDuplicate = dedupedAnnotations.some((existing) => {
        const existOrig = String(existing.original || "").trim().toLowerCase();
        if (existOrig === cleanOrig) return true;

        // Sprawdzamy pokrycie wyrazów
        const existWords = existOrig.split(/[\s,.;:!?]+/).filter(Boolean);
        const cleanWords = cleanOrig.split(/[\s,.;:!?]+/).filter(Boolean);
        const commonWords = existWords.filter((w) => cleanWords.includes(w));

        // Dubel występuje tylko wtedy, gdy oba wpisy wskazują na to samo pojedyncze słowo
        return commonWords.length > 0 && (existWords.length === 1 && cleanWords.length === 1);
      });

      if (!isSameWordDuplicate) {
        dedupedAnnotations.push(anno);
      }
    }
    parsedResult.annotations = dedupedAnnotations;

    // Normalizacja details
    if (!Array.isArray(parsedResult.details) && typeof parsedResult.details === "object" && parsedResult.details !== null) {
      parsedResult.details = Object.entries(parsedResult.details).map(([k, v]: [string, any]) => ({
        criterion: k,
        points: String(v?.points || v?.score || ""),
        comment: typeof v === "string" ? v : String(v?.comment || JSON.stringify(v))
      }));
    }

    if (!parsedResult.score) {
      parsedResult.score = parsedResult.total_score || parsedResult.points || "0/35";
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