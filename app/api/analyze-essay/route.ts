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
  let creditDeducted = false;
  let originalCredits = 0;
  let userId = "";

  try {
    // 1. Autoryzacja
    const supabase = await getSupabaseServer();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }
    userId = session.user.id;

    // 2. Dane wejściowe
    const { topic, essayText } = await req.json();
    if (!topic || !essayText) {
      return NextResponse.json({ error: "Brak tematu lub treści wypracowania." }, { status: 400 });
    }
    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Tekst jest zbyt krótki (minimum 50 słów)." }, { status: 400 });
    }

    // 3. Kredyty
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

    // 4. Blokada kredytu
    const newCredits = originalCredits - 1;
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ essay_credits: newCredits })
      .eq("id", userId);
    if (updateError) {
      return NextResponse.json({ error: "Nie udało się zablokować kredytu." }, { status: 500 });
    }
    creditDeducted = true;

    // 5. Prompt systemowy
    const systemPrompt = `Jesteś precyzyjnym egzaminatorem CKE oceniającym wypracowania maturalne z języka polskiego (poziom podstawowy, Formuła 2023, skala 35 punktów). Oceniaj rzetelnie i sprawiedliwie – ani zbyt surowo, ani zbyt pobłażliwie. Stosuj DOKŁADNIE kryteria z poniższej bazy wiedzy CKE.

=== BAZA WIEDZY CKE ===
${ckeGuidelines}
=== KONIEC BAZY WIEDZY ===

=== OBOWIĄZKOWY PROTOKÓŁ OCENIANIA ===

KROK 1 – WSTĘPNA WERYFIKACJA:
a) Policz słowa w tekście. Jeśli < 300 → KW = 0/7, JW = 0/11 (tylko SFWP i KLiK).
b) Sprawdź błąd kardynalny: czy zdający całkowicie błędnie zidentyfikował głównych bohaterów lub główny wątek lektury obowiązkowej? Jeśli TAK → cała praca = 0/35. Koniec analizy.
c) Sprawdź czy praca jest wypowiedzią argumentacyjną z tezą i min. 2 argumentami. Jeśli NIE → SFWP = 0.

KROK 2 – SFWP (0–1 pkt):
Przyznaj 1 pkt tylko gdy spełnione WSZYSTKIE warunki: brak błędu kardynalnego + odwołanie analityczne (nie tylko informacyjne) do lektury obowiązkowej + praca dotyczy tematu + wypowiedź argumentacyjna.

KROK 3 – KLiK (0–16 pkt):
a) Zidentyfikuj KAŻDY przywołany utwór i oceń jego funkcjonalność:
   - W PEŁNI FUNKCJONALNY: zdający omówił OBA elementy tematu za pomocą tego utworu + wyszedł poza streszczenie
   - CZĘŚCIOWO FUNKCJONALNY: omówił tylko JEDEN element tematu LUB przywołał pobieżnie
   - NIEFUNKCJONALNY: samo streszczenie lub brak związku z tezą
b) Oceń poziom argumentacji: bogata / zadowalająca / trafna / powierzchowna
c) Policz i oceń konteksty (funkcjonalne / częściowo funkcjonalne)
d) Wybierz DOKŁADNIE JEDEN wiersz z tabeli KLiK odpowiadający kombinacji (a)+(b)+(c)
e) Policz UNIKALNE błędy rzeczowe i odejmij po 1 pkt za każdy (min. 0)
f) Jeśli wynik KLiK = 0 → KW i JW = 0

KROK 4 – KW: Kompozycja (0–7 pkt):
a) Struktura (0–3): Tok problemowy vs liniowy, poprawność podziału ogólnego i akapitów
b) Spójność (0–3): Policz zaburzenia logiczne/spójnościowe → zastosuj progi z tabeli
c) Styl (0–1): Stosowny lub niestosowny (potoczny w odmianie mówionej)

KROK 5 – JW: Język (0–11 pkt):
a) Zakres językowy (szeroki/zadowalający/wąski) → policz błędy → odczytaj punkty z tabeli 4a
b) Policz błędy ortograficzne → tabela 4b
c) Policz błędy interpunkcyjne → tabela 4c

=== FORMAT ODPOWIEDZI ===
Zwróć WYŁĄCZNIE obiekt JSON. Bez znaczników markdown, bez \`\`\`json.

{
  "_scoring_log": "Brudnopis: 1) Liczba słów: X. 2) Błąd kardynalny: TAK/NIE – uzasadnienie. 3) SFWP: uzasadnienie. 4) KLiK: [Utwór 1: tytuł, ocena funkcjonalności, uzasadnienie] [Utwór 2: tytuł, ocena funkcjonalności, uzasadnienie] [Poziom argumentacji: X] [Konteksty: X funkcjonalne, X częściowo] [Wiersz tabeli: X pkt bazowo] [Błędy rzeczowe: lista] [KLiK końcowy: X] 5) KW: [3a: X/3 – uzasadnienie] [3b: X błędów spójności, X/3] [3c: X/1] 6) JW: [Zakres: szeroki/zadowalający/wąski] [Błędy językowe: X, pkt: X/7] [Błędy ort.: X, pkt: X/2] [Błędy int.: X, pkt: X/2]",
  "score": "X/35",
  "details": [
    {
      "criterion": "Spełnienie formalnych warunków polecenia",
      "points": "X/1",
      "comment": "Precyzyjne uzasadnienie. Wymień konkretnie, które warunki są spełnione lub nie."
    },
    {
      "criterion": "Kompetencje literackie i kulturowe",
      "points": "X/16",
      "comment": "Podaj: (1) ocenę funkcjonalności każdego utworu z uzasadnieniem, (2) poziom argumentacji, (3) ocenę kontekstów, (4) wybrany wiersz tabeli, (5) listę błędów rzeczowych i ich wpływ."
    },
    {
      "criterion": "Kompozycja wypowiedzi",
      "points": "X/7",
      "comment": "Podaj punkty za 3a, 3b, 3c osobno z uzasadnieniem. Przy 3b podaj liczbę zaburzeń spójności."
    },
    {
      "criterion": "Język wypowiedzi",
      "points": "X/11",
      "comment": "Podaj: zakres językowy z uzasadnieniem, liczbę błędów językowych/ort./int. i punkty za 4a, 4b, 4c osobno."
    }
  ],
  "summary": "2–4 zdania podsumowania: mocne strony pracy + konkretne obszary do poprawy, napisane jako konstruktywna informacja zwrotna dla ucznia.",
  "annotations": [
    {
      "original": "dokładny fragment z tekstu ucznia zawierający błąd (min. kilka słów kontekstu)",
      "replacement": "poprawna wersja tego fragmentu",
      "type": "rzeczowy | językowy | ortograficzny | interpunkcyjny",
      "explanation": "Zwięzłe wyjaśnienie błędu i zasady poprawności."
    }
  ]
}`;

    const userMessage = `Temat: "${topic}"\n\nWypracowanie:\n${essayText}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const responseText = result.response.text();

    // Czyszczenie kodu JSON z ewentualnych znaczników markdown
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedResult = JSON.parse(cleanJson.trim());

    // --- GENEROWANIE WEKTORA (EMBEDDING) DLA PGVECTOR ---
    let embeddingVector: number[] | null = null;
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const embeddingResult = await embeddingModel.embedContent(essayText);
      if (embeddingResult.embedding?.values) {
        embeddingVector = embeddingResult.embedding.values;
      }
    } catch (embedError) {
      console.error("Błąd generowania wektora (embedding):", embedError);
    }

    // Zapis do historii z uwzględnieniem kolumny 'embedding'
    const { error: insertError } = await supabaseAdmin
      .from("essay_evaluations")
      .insert({
        user_id: userId,
        topic: topic,
        essay_text: essayText,
        score: parsedResult.score,
        analysis_result: parsedResult,
        embedding: embeddingVector, // nowa kolumna do dopasowań semantycznych pgvector
      });
    if (insertError) {
      console.error("Błąd zapisu oceny:", insertError);
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: parsedResult,
    });

  } catch (error) {
    console.error("Błąd analizy:", error);

    // Rollback kredytu
    if (creditDeducted && userId) {
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ essay_credits: originalCredits })
          .eq("id", userId);
      } catch (rollbackError) {
        console.error("Błąd rollbacku kredytu:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Wystąpił błąd podczas analizy AI. Twój kredyt został zwrócony." },
      { status: 500 }
    );
  }
}