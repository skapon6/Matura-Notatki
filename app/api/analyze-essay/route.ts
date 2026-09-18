// app/api/analyze-essay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../../lib/supabaseServer";
import { ckeGuidelines } from "../../lib/ckeGuidelines";

export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pancerny ekstraktor JSON izolujący poprawny obiekt { ... } z dowolnego tekstu AI
const extractAndParseJSON = (text: string) => {
  if (!text) {
    throw new Error("Otrzymano pustą odpowiedź od AI.");
  }

  let firstBrace = text.indexOf('{');
  if (firstBrace === -1) {
    throw new Error("Materiały wyjściowe AI nie zawierają prawidłowego obiektu JSON.");
  }

  while (firstBrace !== -1) {
    let lastBrace = text.lastIndexOf('}');
    
    while (lastBrace > firstBrace) {
      const jsonString = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonString);
      } catch (err) {
        lastBrace = text.lastIndexOf('}', lastBrace - 1);
      }
    }
    firstBrace = text.indexOf('{', firstBrace + 1);
  }

  throw new Error("Nie udało się wyodrębnić i sparsować poprawnej struktury JSON z odpowiedzi AI.");
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
    const hasInvalidTopicWord = topicWords.some((word: string) => word.length > 20);
    const hasInvalidEssayWord = essayWords.some((word: string) => word.length > 20);

    if (hasInvalidTopicWord || hasInvalidEssayWord) {
      return NextResponse.json(
        { error: "Tekst zawiera nieprawidłowe, sztucznie wydłużone słowa (maksymalna długość słowa to 20 znaków)." },
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

    // 4. Generowanie wektora embedding dla RAG
    let embeddingVector: number[] | null = null;
    let embedRetries = 3;
    let embedDelay = 3000;

    for (let i = 0; i < embedRetries; i++) {
      try {
        const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
        const embeddingResult = await embeddingModel.embedContent({
          content: { role: "user", parts: [{ text: essayText }] },
          outputDimensionality: 768,
        } as any);
        
        if (embeddingResult.embedding?.values) {
          embeddingVector = embeddingResult.embedding.values;
          break;
        }
      } catch (embedError: any) {
        const isRetryable = 
          embedError?.status === 429 || 
          embedError?.status === 503 || 
          embedError?.message?.includes("429") || 
          embedError?.message?.includes("503") || 
          embedError?.message?.includes("RESOURCE_EXHAUSTED") || 
          embedError?.message?.includes("UNAVAILABLE");

        if (isRetryable && i < embedRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, embedDelay));
          embedDelay *= 1.5;
          continue;
        }
        break;
      }
    }

    // 5. Dopasowanie podobnych wypracowań z bazy (RAG)
    let similarEssaysContext = "";
    if (embeddingVector) {
      try {
        const { data: similar } = await supabaseAdmin.rpc("match_essays", {
          query_embedding: embeddingVector,
          match_threshold: 0.85,
          match_count: 2
        });

        if (similar && similar.length > 0) {
          similarEssaysContext = `\n\n=== REPREZENTATYWNE PRZYKŁADY Z BAZY WIEDZY ===\n`;
          similar.forEach((item: any, index: number) => {
            similarEssaysContext += `
Przykład ${index + 1}:
Temat: "${item.topic}"
Ocena: ${item.score}
---\n`;
          });
        }
      } catch (dbError) {
        console.error("Błąd RAG:", dbError);
      }
    }

    // 6. 🎯 WYWAŻONY, SPRAWIEDLIWY SYSTEM PROMPT Z RZETELNYM WYMOGIEM 300 SŁÓW
    const systemPrompt = `Jesteś doświadczonym, profesjonalnym i wyważonym egzaminatorem CKE oceniającym wypracowania maturalne z języka polskiego (poziom podstawowy, Formuła 2023, skala 35 punktów). 

Twoim celem jest SPRAWIEDLIWA, DOKŁADNA i REALISTYCZNA ocena – dokładnie taka, jaką uczeń otrzymałby od egzaminatora na oficjalnym egzaminie maturalnym. Nie bądź mściwy ani przesadnie dosłowny, ale rzetelnie stosuj zasady państwowe CKE.

=== BAZA WIEDZY CKE ===
${ckeGuidelines}
=== KONIEC BAZY WIEDZY ===
${similarEssaysContext}

=== PROTOKÓŁ I ZASADY OCENIANIA CKE ===

1. KROK 1 – WERYFIKACJA FORMALNA I OBJĘTOŚĆ (MINIMUM 300 SŁÓW):
   - Policz dokładnie słowa w tekście wypracowania.
   - JEŚLI PRACA LICZY MNIEJ NIŻ 300 SŁÓW:
     * Zgodnie z oficjalną zasadą CKE przyznaj: KW = 0/7 oraz JW = 0/11!
     * W takim wypadku oceniasz WYŁĄCZNIE kryteria: SFWP (0-1) oraz KLiK (0-16). Maksymalny możliwy wynik wynosi 17/35.
     * W podsumowaniu wpisz wyraźne wyjaśnienie: "Praca nie osiągnęła wymaganego progu 300 słów (liczy X słów). Zgodnie z oficjalnymi zasadami CKE skutkuje to wyzerowaniem punktów za kompozycję (KW: 0/7) oraz za język (JW: 0/11)."
   - JEŚLI PRACA LICZY 300 SŁÓW LUB WIĘCEJ:
     * Praca podlega pełnej ocenie we wszystkich 4 kryteriach: SFWP (0-1), KLiK (0-16), KW (0-7), JW (0-11).

2. KROK 2 – SFWP: Spełnienie formalnych warunków polecenia (0–1 pkt):
   - 1 pkt: Praca jest wypowiedzią argumentacyjną, zawiera tezę lub hipotezę, odwołuje się do lektury obowiązkowej i nie zawiera błędu kardynalnego.
   - 0 pkt: Brak tezy, praca niebędąca rozprawką lub wystąpienie błędu kardynalnego (wtedy cała praca otrzymuje 0/35).

3. KROK 3 – KLiK: Kompetencje literackie i kulturowe (0–16 pkt):
   - Oceniaj sprawiedliwie poziom rozwinięcia argumentacji i funkcjonalność utworów:
     * 13–16 pkt: Pogłębiona, dojrzała argumentacja, trafne wnioski, utwory i konteksty wykorzystane w pełni funkcjonalnie pod tezę.
     * 9–12 pkt: Zadowalająca argumentacja, poprawna analiza lektur powiązana z tematem (nawet z drobnymi uproszczeniami lub skrótami).
     * 5–8 pkt: Argumentacja częściowa – uczeń streszcza elementy fabuły, ale wiąże je z tezą; występują uogólnienia lub drobne błędy rzeczowe nienaruszające sensu lektury.
     * 1–4 pkt: Wyłącznie powierzchowne streszczenie, brak argumentacji, rażące zniekształcenie lektury.
     * 0 pkt: Brak odwołania do lektur lub całkowicie błędna interpretacja.

4. KROK 4 – KW: Kompozycja wypowiedzi (0–7 pkt):
   - 3a (Układ tekstu: 0–3 pkt): 3 pkt za wyraźną trójdzielność (wstęp, rozwinięcie z podziałem na akapity, zakończenie). 2 pkt przy drobnych zachwianiach proporcji.
   - 3b (Spójność tekstu: 0–3 pkt): 3 pkt za płynny, logiczny wywód. 2 pkt przy sporadycznych przeskokach myślowych, które nie zaburzają ogólnego sensu. 1 pkt tylko przy wyraźnym chaosie.
   - 3c (Styl: 0–1 pkt): 1 pkt za styl stosowny do sytuacji egzaminacyjnej.

5. KROK 5 – JW: Język wypowiedzi (0–11 pkt):
   - 4a (Poprawność językowa: 0–7 pkt): Oceniasz naturalny, szkolny język:
     * 6–7 pkt: Bardzo wysoka poprawność, bogata leksyka, zaledwie pojedyncze potknięcia.
     * 4–5 pkt: Typowy, dobry poziom uczniowski (kilka drobnych usterek składniowych lub leksykalnych nieutrudniających odbioru).
     * 2–3 pkt: Liczne błędy utrudniające zrozumienie myśli.
   - 4b (Ortografia: 0–2 pkt): 2 pkt (0–1 błąd), 1 pkt (2–3 błędy), 0 pkt (4+).
   - 4c (Interpunkcja: 0–2 pkt): 2 pkt (pojedyncze błędy), 1 pkt (powtarzające się usterki przecinkowe), 0 pkt (całkowity brak przecinków).

6. IDENTYFIKACJA BŁĘDÓW DO PODŚWIETLEŃ (annotations):
   - Podświetlaj tylko RZECZYWISTE usterki w tekście ucznia (rzeczowe, językowe, ortograficzne, interpunkcyjne).
   - Podaj dokładny fragment, zwięzłe wyjaśnienie reguły oraz poprawną propozycję zamiennika.

=== FORMAT ODPOWIEDZI ===
Zwróć WYŁĄCZNIE poprawny obiekt JSON (bez znaczników \`\`\`json).

{
  "_scoring_log": "Brudnopis oceniania: liczba słów (czy >= 300), błąd kardynalny (TAK/NIE), kalkulacja KLiK, KW, JW.",
  "score": "X/35",
  "details": [
    {
      "criterion": "Spełnienie formalnych warunków polecenia",
      "points": "X/1",
      "comment": "Zwięzłe uzasadnienie spełnienia wymogów formalnych."
    },
    {
      "criterion": "Kompetencje literackie i kulturowe",
      "points": "X/16",
      "comment": "Sprawiedliwa ocena poziomu argumentacji, doboru lektur i funkcjonalności odwołań."
    },
    {
      "criterion": "Kompozycja wypowiedzi",
      "points": "X/7",
      "comment": "Ocena układu trójdzielnego, akapitów i spójności logicznej wywodu."
    },
    {
      "criterion": "Język wypowiedzi",
      "points": "X/11",
      "comment": "Podsumowanie poprawności językowej, ortografii i interpunkcji."
    }
  ],
  "summary": "Konstruktywne, wyważone podsumowanie. Pochwal dobre pomysły i wskaż 2-3 najważniejsze rzeczy do dopracowania.",
  "annotations": [
    {
      "original": "dokładny fragment tekstu z błędem",
      "replacement": "poprawna forma",
      "type": "rzeczowy | językowy | ortograficzny | interpunkcyjny",
      "explanation": "Zwięzłe wyjaśnienie reguły."
    }
  ]
}`;

    const safeEssayText = essayText.replace(/<essay>/g, "").replace(/<\/essay>/g, "");
    const safeTopic = topic.replace(/<topic>/g, "").replace(/<\/topic>/g, "");

    const userMessage = `
[TEMAT ROZPRAWKI]
<topic>${safeTopic}</topic>

[TREŚĆ ROZPRAWKI UCZNIA]
<essay>
${safeEssayText}
</essay>

Oceń powyższe wypracowanie obiektywnie, sprawiedliwie i zgodnie z oficjalnymi wytycznymi CKE Formuła 2023.
`;

    // 7. Kaskada modeli z płynnym fallbackiem
    const MODELS_TO_TRY = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash"
    ];

    let result: any = null;
    let finalModelUsed = "";
    let modelSuccess = false;
    let lastError: any = null;

    for (const currentModelName of MODELS_TO_TRY) {
      console.log(`-> Próba uruchomienia analizy na modelu: ${currentModelName}`);
      
      const model = genAI.getGenerativeModel({
        model: currentModelName,
        systemInstruction: systemPrompt,
      });

      let textRetries = 3;
      let textDelay = 4000;
      let modelSuccessInner = false;

      for (let i = 0; i < textRetries; i++) {
        try {
          console.log(`-> Wywołanie Gemini (${currentModelName}) - Analiza (Próba ${i + 1}/${textRetries})...`);
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          });
          
          modelSuccessInner = true;
          finalModelUsed = currentModelName;
          break;
        } catch (error: any) {
          lastError = error;
          const isRetryable = 
            error?.status === 429 || 
            error?.status === 503 || 
            error?.message?.includes("429") || 
            error?.message?.includes("503") || 
            error?.message?.includes("RESOURCE_EXHAUSTED") || 
            error?.message?.includes("UNAVAILABLE");

          if (isRetryable && i < textRetries - 1) {
            const jitter = Math.floor(Math.random() * 1500) + 1000;
            const finalDelay = textDelay + jitter;
            console.warn(`  [PRZECIĄŻENIE ${currentModelName}] Retry za ${(finalDelay / 1000).toFixed(2)}s...`);
            await new Promise((resolve) => setTimeout(resolve, finalDelay));
            textDelay *= 1.5;
            continue;
          }
          break;
        }
      }

      if (modelSuccessInner && result) {
        console.log(`-> Sukces! Analiza ukończona za pomocą: ${finalModelUsed}`);
        modelSuccess = true;
        break;
      }
    }

    if (!modelSuccess || !result) {
      console.error("Wszystkie próby na modelach zakończyły się niepowodzeniem:", lastError);
      throw new Error("SERVERS_OVERLOADED");
    }

    const responseText = result.response.text();
    const parsedResult = extractAndParseJSON(responseText);

    const clientResult = { ...parsedResult };
    delete clientResult._scoring_log;

    // 8. Zapis do bazy
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
      console.error("Błąd zapisu oceny do bazy:", insertError);
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: clientResult,
    });

  } catch (error: any) {
    console.error("Błąd analizy:", error);

    if (creditDeducted && userId) {
      try {
        await supabaseAdmin.rpc('increment_credit', { user_id_param: userId });
        console.log("-> Kredyt został pomyślnie zwrócony na konto (rollback).");
      } catch (rollbackError) {
        console.error("Błąd rollbacku kredytu:", rollbackError);
      }
    }

    const isOverload = error?.message === "SERVERS_OVERLOADED" || error?.status === 503;
    const errorMessage = isOverload
      ? "Serwery Google AI są obecnie przeciążone. Twój kredyt nie został pobrany. Spróbuj ponownie za chwilę!"
      : "Wystąpił nieoczekiwany błąd podczas analizy. Twój kredyt został zwrócony.";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}