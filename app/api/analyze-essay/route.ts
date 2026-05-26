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
  try {
    const supabase = await getSupabaseServer();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }

    const userId = session.user.id;

    const { topic, essayText } = await req.json();
    if (!topic || !essayText) {
      return NextResponse.json({ error: "Brak tematu lub treści wypracowania." }, { status: 400 });
    }

    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Tekst jest zbyt krótki (minimum 50 słów)." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("essay_credits")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Nie udało się pobrać profilu." }, { status: 500 });
    }

    if (profile.essay_credits <= 0) {
      return NextResponse.json({ error: "Brak wolnych kredytów." }, { status: 403 });
    }

    const newCredits = profile.essay_credits - 1;
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ essay_credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      console.error("Błąd zapisu kredytów przez admina:", updateError);
      return NextResponse.json({ error: "Nie udało się zaktualizować kredytów." }, { status: 500 });
    }

    // 5. Oficjalny prompt CKE 2023 (Skala 35 punktów)
    const systemPrompt = `Jesteś doświadczonym, obiektywnym egzaminatorem CKE. Oceniasz chłodno i zgodnie z rubryką — nie zaniżasz, ale też nie zawyżasz. Twoje oceny są identyczne z tym, co przyznałby średni egzaminator CKE podczas drugiego czytania pracy.

Poniżej znajduje się oficjalna baza wiedzy CKE, wytyczne oceniania oraz wypracowania wzorcowe. Musisz się do nich bezwzględnie zastosować podczas oceny:
=========================================
${ckeGuidelines}
=========================================

KALIBRACJA OCENIANIA (krytyczna):
- Wynik 30-35/35 oznacza pracę absolutnie wybitną — wzorcową dla innych egzaminatorów. Takich prac jest mniej niż 2% na maturze.
- Wynik 25-29/35 oznacza pracę bardzo dobrą, z bogatą erudycją i niemal bezbłędną kompozycją.
- Wynik 18-24/35 to typowy dobry poziom — praca spełnia wymogi, argumentacja jest rzetelna, ale bez głębszego namysłu.
- Wynik 12-17/35 to praca przeciętna — spełnia formalne warunki, ale argumentacja jest powierzchowna.
- Większość prac maturzystów mieści się w przedziale 14-24/35.

KONKRETNE ZAOSTRZENIA:
- KLiK (kryterium 2): 16/16 przyznaj TYLKO jeśli argumentacja jest wieloaspektowa, erudycyjna i oba konteksty są w pełni funkcjonalne z pogłębioną refleksją. Jeśli masz jakiekolwiek wątpliwości — przyznaj co najwyżej 14.
- Kompozycja (kryterium 3): jeśli akapity są krótkie lub brak wyraźnego toku problemowego (każdy akapit to inny tekst literacki bez spinającego problemu) — odejmij co najmniej 1 pkt w podkryterium struktury.
- Język (kryterium 4): policz błędy literalnie. Każde nieuzasadnione powtórzenie wyrazu to błąd językowy. Jeśli składnia jest prosta i monotonna — zakres środków = "zadowalający", nie "szeroki".
- Nie stosuj "zasady na korzyść zdającego" przy ocenie KLiK powyżej 13 pkt — ta zasada dotyczy sytuacji granicznych przy niskich wynikach, nie premiowania przeciętnej argumentacji.

    {
  "score": "X/35",
  "details": [
    {
      "criterion": "Spełnienie formalnych warunków polecenia",
      "points": "X/1",
      "comment": "Komentarz"
    },
    {
      "criterion": "Kompetencje literackie i kulturowe",
      "points": "X/16",
      "comment": "Komentarz"
    },
    {
      "criterion": "Kompozycja wypowiedzi",
      "points": "X/7",
      "comment": "Komentarz"
    },
    {
      "criterion": "Język wypowiedzi",
      "points": "X/11",
      "comment": "Komentarz"
    }
  ],
  "summary": "Zwięzłe podsumowanie całej rozprawki z konstruktywnymi, motywującymi i ciepłymi radami dla ucznia na przyszłość.",
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
        temperature: 0.2,
      },
    });

    const responseText = result.response.text();
    const parsedResult = JSON.parse(responseText);

    // [NOWOŚĆ] 7. Zapisanie analizy w bazie danych przy użyciu klienta Admina (omijającego RLS przy zapisie)
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
      console.error("Błąd zapisu oceny do historii bazy danych:", insertError);
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: parsedResult,
    });

  } catch (error) {
    console.error("Błąd podczas analizy wypracowania z Gemini:", error);
    return NextResponse.json(
      { error: "Wystąpił wewnętrzny błąd serwera podczas analizy AI." }, 
      { status: 500 }
    );
  }
}