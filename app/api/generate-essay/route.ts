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

export async function POST(req: NextRequest) {
  let creditDeducted = false;
  let originalCredits = 0;
  let userId = "";

  try {
    const supabase = await getSupabaseServer();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }

    userId = session.user.id;

    const { topic } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: "Brak tematu rozprawki." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("essay_credits")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Nie udało się pobrać profilu." }, { status: 500 });
    }

    originalCredits = profile.essay_credits;

    if (originalCredits <= 0) {
      return NextResponse.json({ error: "Brak wolnych kredytów." }, { status: 403 });
    }

    const newCredits = originalCredits - 1;
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ essay_credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      console.error("Błąd blokowania kredytu:", updateError);
      return NextResponse.json({ error: "Nie udało się zablokować kredytu." }, { status: 500 });
    }

    creditDeducted = true;

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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    // --- SYSTEM AUTOMATYCZNEGO PONAWIANIA PRÓB (RETRY ON 503) ---
    let result: any;
    const maxRetries = 3;
    let delay = 5000; // Czekamy 5 sekund w razie przeciążenia

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`-> Wywołanie Gemini 2.5 Flash - Generowanie Przykładowej (Próba ${i + 1}/${maxRetries})...`);
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: `Temat rozprawki: "${topic}"` }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.35,
          },
        });
        break;
      } catch (error: any) {
        const is503 = error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE") || error?.status === 503;
        if (is503 && i < maxRetries - 1) {
          console.warn(`[PRZECIĄŻENIE GENERATORA 503] Serwer obciążony. Automatyczny retry za ${delay / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }
        throw error;
      }
    }

    const responseText = result.response.text();
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedResult = JSON.parse(cleanJson.trim());

    return NextResponse.json({
      success: true,
      newCredits,
      essayText: parsedResult.essayText,
      alternativeContexts: parsedResult.alternativeContexts,
    });

  } catch (error) {
    console.error("Błąd podczas generowania wypracowania:", error);

    if (creditDeducted && userId) {
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ essay_credits: originalCredits })
          .eq("id", userId);
        console.log(`[ROLLBACK] Zwrócono kredyt użytkownikowi ${userId}`);
      } catch (rollbackError) {
        console.error("Błąd podczas wycofywania kredytu:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Wystąpił błąd podczas generowania wypracowania przez AI. Twój kredyt został zwrócony." }, 
      { status: 500 }
    );
  }
}