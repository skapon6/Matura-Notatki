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

export async function POST(req: NextRequest) {
  // Deklaracja zmiennych na początku funkcji (widoczne w try oraz catch)
  let creditDeducted = false;
  let originalCredits = 0;
  let userId = "";

  try {
    // 1. Autoryzacja użytkownika
    const supabase = await getSupabaseServer();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }

    userId = session.user.id;

    // 2. Pobranie danych wejściowych
    const { topic, essayText } = await req.json();
    if (!topic || !essayText) {
      return NextResponse.json({ error: "Brak tematu lub treści wypracowania." }, { status: 400 });
    }

    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Tekst jest zbyt krótki (minimum 50 słów)." }, { status: 400 });
    }

    // 3. Sprawdzenie kredytów
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

    // 4. Natychmiastowe zablokowanie kredytu (zabezpieczenie współbieżności)
    const newCredits = originalCredits - 1;
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ essay_credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      console.error("Błąd blokowania kredytu:", updateError);
      return NextResponse.json({ error: "Nie udało się zablokować kredytu." }, { status: 500 });
    }

    // Oznaczenie, że kredyt został fizycznie pobrany z bazy danych
    creditDeducted = true;

    // 5. Oficjalny prompt CKE 2023 (Skala 35 punktów)
    const systemPrompt = `Jesteś obiektywnym, precyzyjnym i sprawiedliwym egzaminatorem CKE. Twoim zadaniem jest ocena szkolnego wypracowania zgodnie z polskimi kryteriami CKE w Formule 2023 (skala 35 punktów). Nie bądź ani nadmiernie surowy, ani nadmiernie pobłażliwy. Mapuj tekst ucznia bezpośrednio na definicje i tabele z poniższej bazy wiedzy:

=========================================
${ckeGuidelines}
=========================================

KROKI ANalityczne (MUSISZ JE WYKONAĆ PRZED WYDANIEM PUNKTACJI):
1. Policz orientacyjną liczbę słów. Jeśli < 300 słów -> Kompozycja = 0/7, Język = 0/11.
2. Sprawdź, czy nie ma błędu kardynalnego (falsyfikacja losów głównego bohatera lektury obowiązkowej). Jeśli tak -> cała praca otrzymuje bezwzględne 0/35.
3. KLiK (Kompetencje literackie - 16 pkt) – Zidentyfikuj:
   - Ile utworów przywołał uczeń? (Dwa? Jeden?)
   - Jaka jest funkcjonalność każdego z nich? (W pełni funkcjonalne, częściowo funkcjonalne, niefunkcjonalne?)
   - Jaki jest poziom argumentacji? (Bogaty, zadowalający, powierzchowny?)
   - Ile jest funkcjonalnych kontekstów? (Co najmniej jeden? Dwa?)
   - Policz błędy rzeczowe. Za każdy błąd rzeczowy odejmij dokładnie 1 punkt od wyniku KLiK.
   - NA PODSTAWIE TYCH DANYCH dopasuj punktację KLiK DOKŁADNIE do odpowiedniego wiersza w "TABELI PUNKTACJI" z bazy wiedzy. Jeśli uczeń przywołał tylko 1 utwór częściowo funkcjonalnie z powierzchowną argumentacją, jego KLiK wynosi maksymalnie 1-2 punkty!
4. Kompozycja (7 pkt) – Oceń strukturę (3a), spójność logiczną (3b - policz zaburzenia) oraz styl (3c).
5. Język (11 pkt) – Policz błędy językowe (4a), ortograficzne (4b) oraz interpunkcyjne (4c). Zastosuj dokładnie progi punktowe z tabeli.

Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON o strukturze zgodnej z poniższym przykładem. Nie używaj znaczników markdown takich jak \`\`\`json.

{
  "_internal_scoring_checklist": "Tutaj rozpisz krok po kroku swoje wyliczenia: 1. Słowa, 2. Błąd kardynalny, 3. Analiza funkcjonalności utworów, dopasowanie do wiersza tabeli KLiK, odjęte błędy rzeczowe, 4. Wyliczenie błędów językowych/ortograficznych/interpunkcyjnych według progów tabeli JW. To pole służy jako Twój logiczny brudnopis przed wydaniem ocen.",
  "score": "X/35",
  "details": [
    {
      "criterion": "Spełnienie formalnych warunków polecenia",
      "points": "X/1",
      "comment": "Precyzyjne, merytoryczne uzasadnienie punktacji."
    },
    {
      "criterion": "Kompetencje literackie i kulturowe",
      "points": "X/16",
      "comment": "Wyjaśnienie, które utwory zostały uznane za w pełni/częściowo funkcjonalne, ocena poziomu argumentacji oraz wylistowanie błędów rzeczowych wraz z ich wpływem na punktację."
    },
    {
      "criterion": "Kompozycja wypowiedzi",
      "points": "X/7",
      "comment": "Ocena struktury, podziału na akapity, spójności i stylu. Jeżeli praca ma mniej niż 300 słów - przyznaj 0/7 pkt z wyjaśnieniem limitu."
    },
    {
      "criterion": "Język wypowiedzi",
      "points": "X/11",
      "comment": "Ocena poprawności językowej, leksykalnej, ortograficznej i interpunkcyjnej zgodnie z liberalnymi limitami błędów CKE. Jeżeli praca ma mniej niż 300 słów - przyznaj 0/11 pkt."
    }
  ],
  "summary": "Obiektywne podsumowanie rozprawki wskazujące mocne strony oraz konkretne obszary wymagające poprawy, napisane w tonie profesjonalnego egzaminatora.",
  "annotations": [
    {
      "original": "dokładny fragment z tekstu ucznia zawierający błąd",
      "replacement": "sugerowana poprawna wersja",
      "type": "rzeczowy | językowy | ortograficzny | interpunkcyjny",
      "explanation": "Krótkie wyjaśnienie, dlaczego jest to błąd i jaka jest zasada poprawności."
    }
  ]
}`;

    const userMessage = `Temat rozprawki: "${topic}"\n\nTreść rozprawki:\n${essayText}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.15,
      },
    });

    const responseText = result.response.text();
    const parsedResult = JSON.parse(responseText);

    // Zapisanie oceny w historii
    const { error: insertError } = await supabaseAdmin
      .from("essay_evaluations")
      .insert({
        user_id: userId,
        topic: topic,
        essay_text: essayText,
        score: parsedResult.score,
        analysis_result: parsedResult
      });

    if (insertError) {
      console.error("Błąd zapisu oceny do historii:", insertError);
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: parsedResult,
    });

  } catch (error) {
    console.error("Błąd podczas analizy wypracowania z Gemini:", error);

    // Rollback kredytu w przypadku niepowodzenia
    if (creditDeducted && userId) {
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ essay_credits: originalCredits })
          .eq("id", userId);
        console.log(`[ROLLBACK] Pomyślnie zwrócono kredyt dla użytkownika ${userId}`);
      } catch (rollbackError) {
        console.error("Krytyczny błąd podczas wycofywania kredytu (Rollback):", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Wystąpił błąd podczas analizy AI. Twój kredyt został zwrócony." }, 
      { status: 500 }
    );
  }
}