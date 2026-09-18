// app/api/generate-essay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pancerny ekstraktor JSON izolujący poprawny obiekt { ... } z dowolnej odpowiedzi AI
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
    // 1. Bezpieczna autoryzacja serwerowa getUser()
    const supabase = await getSupabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }
    userId = user.id;

    // 2. Walidacja tematu
    const { topic } = await req.json();
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "Brak tematu rozprawki." }, { status: 400 });
    }

    if (topic.length > 2000) {
      return NextResponse.json({ error: "Temat rozprawki jest zbyt długi (maksymalnie 2000 znaków)." }, { status: 400 });
    }

    // 3. Atomowe pobranie kredytu za pomocą procedury RPC (Ochrona przed Race Condition)
    const { data: deductedCredits, error: rpcError } = await supabaseAdmin
      .rpc('deduct_credit', { user_id_param: userId });

    if (rpcError || deductedCredits === null || deductedCredits === -1) {
      return NextResponse.json(
        { error: "Brak wolnych kredytów na wygenerowanie wypracowania." },
        { status: 403 }
      );
    }

    newCredits = deductedCredits;
    creditDeducted = true;

    // 4. Prompt systemowy
    const systemPrompt = `Jesteś polskim licealistą przygotowującym się do matury 2026 z języka polskiego na poziomie podstawowym (Formuła 2023). Twoim zadaniem jest napisanie przykładowego, wzorcowego wypracowania na podany przez użytkownika temat.

STYL I JĘZYK:
- Pisz naturalnym, poprawnym i bezpośrednim językiem ambitnego ucznia. Unikaj przesadnie archaicznego, kwiecistego stylu naukowego, ale pilnuj wysokiej poprawności językowej, ortograficznej i interpunkcyjnej. Tekst ma brzmieć autentycznie, jak wypracowanie napisane przez inteligentnego ucznia szkoły średniej, który doskonale rozumie lektury i argumentuje w sposób przejrzysty i logiczny.

WYMAGANIA DOTYCZĄCE LEKTUR (MATURA 2026):
- Odwołaj się wyłącznie do lektur obowiązkowych z podstawy programowej 2026 dla poziomu podstawowego (wybierz dokładnie 2 utwory, np.: Lalka Bolesława Prusa, Dziady cz. III Adama Mickiewicza, Zbrodnia i kara Fiodora Dostojewskiego, Dżuma Alberta Camusa, Rok 1984 George'a Orwella, Wesele Stanisława Wyspiańskiego, Makbet Williama Szekspira, Chłopi Władysława Reymonta).
- Przeanalizuj te utwory w sposób funkcjonalny, unikając suchego streszczania fabuły. Powiąż je bezpośrednio z tematem i argumentacją.

STRUKTURA:
- Praca musi zawierać: wstęp z jasno sformułowaną tezą, dwa akapity rozwinięcia (każdy oparty o jedną lekturę), oraz wnioski w zakończeniu.
- Całkowita długość tekstu musi przekraczać 300 słów (optymalnie 320–450 słów).

DODATEK (ALTERNATYWNE KONTEKSTY):
- Zaproponuj dokładnie 3 inne, bardzo ciekawe konteksty, które uczeń mógłby wykorzystać w tym samym temacie (mogą to być inne książki spoza bazy obowiązkowej lub popularne filmy/seriale, np. Truman Show, Matrix, Incepcja, Stowarzyszenie Umarłych Poetów itp.).

Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON o strukturze zgodnej z poniższym przykładem. Nie używaj znaczników markdown takich jak \`\`\`json.

{
  "essayText": "Pełna treść rozprawki z podziałem na akapity za pomocą znaków nowej linii \\n...",
  "alternativeContexts": [
    {
      "title": "Tytuł dzieła (np. Truman Show)",
      "type": "film | książka | serial",
      "description": "Zwięzłe i merytoryczne wyjaśnienie, jak ten kontekst odnosi się do tematu i w jaki sposób można go ująć w wypracowaniu."
    }
  ]
}`;

    // 5. 🎯 KASKADA MODELI ZE SPADKIEM W DÓŁ W RAZIE PRZECIĄŻENIA
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
      console.log(`-> Próba uruchomienia generatora na modelu: ${currentModelName}`);
      
      const model = genAI.getGenerativeModel({
        model: currentModelName,
        systemInstruction: systemPrompt,
      });

      let textRetries = 3;
      let textDelay = 4000;
      let modelSuccessInner = false;

      for (let i = 0; i < textRetries; i++) {
        try {
          console.log(`-> Wywołanie ${currentModelName} - Generowanie rozprawki (Próba ${i + 1}/${textRetries})...`);
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `Temat rozprawki: "${topic}"` }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.35,
            },
          });
          
          modelSuccessInner = true;
          finalModelUsed = currentModelName;
          break; // Sukces na tym modelu!
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
            console.warn(`  [PRZECIĄŻENIE ${currentModelName}] Automatyczny retry za ${(finalDelay / 1000).toFixed(2)}s...`);
            await new Promise((resolve) => setTimeout(resolve, finalDelay));
            textDelay *= 1.5;
            continue;
          }
          
          // Jeśli to nie jest błąd ponawialny lub skończyły się próby na tym modelu, przechodzimy do kolejnego modelu
          break;
        }
      }

      if (modelSuccessInner && result) {
        console.log(`-> Sukces! Rozprawka wygenerowana pomyślnie za pomocą modelu: ${finalModelUsed}`);
        modelSuccess = true;
        break; // Przerywamy pętlę modeli – mamy gotową pracę!
      }
    }

    if (!modelSuccess || !result) {
      console.error("!!! Wszystkie próby na wszystkich modelach zakończyły się niepowodzeniem:", lastError);
      throw new Error("SERVERS_OVERLOADED");
    }

    const responseText = result.response.text();

    // 6. Bezpieczne parsowanie JSON
    const parsedResult = extractAndParseJSON(responseText);

    return NextResponse.json({
      success: true,
      newCredits,
      essayText: parsedResult.essayText,
      alternativeContexts: parsedResult.alternativeContexts || [],
    });

  } catch (error: any) {
    console.error("Błąd podczas generowania wypracowania:", error);

    // 7. Atomowy Rollback tokena w razie awarii API
    if (creditDeducted && userId) {
      try {
        await supabaseAdmin.rpc('increment_credit', { user_id_param: userId });
        console.log(`[ROLLBACK] Zwrócono kredyt użytkownikowi ${userId} za pomocą RPC.`);
      } catch (rollbackError) {
        console.error("Błąd podczas wycofywania kredytu:", rollbackError);
      }
    }

    const isOverload = error?.message === "SERVERS_OVERLOADED" || error?.status === 503;
    const errorMessage = isOverload
      ? "Serwery Google AI są obecnie przeciążone. Twój kredyt został automatycznie zwrócony. Spróbuj wygenerować pracę ponownie za chwilę!"
      : "Wystąpił nieoczekiwany błąd podczas generowania wypracowania. Twój kredyt został zwrócony.";

    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}