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
    // 1. Bezpieczna autoryzacja za pomocą getUser() (Zabezpieczenie przed ostrzeżeniem w konsoli)
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
    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    
    // Walidacja limitu słów (50 - 1500)
    if (wordCount < 50) {
      return NextResponse.json({ error: "Tekst jest zbyt krótki (minimum 50 słów)." }, { status: 400 });
    }
    if (wordCount > 1500) {
      return NextResponse.json({ error: "Tekst przekracza maksymalny limit 1500 słów." }, { status: 400 });
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

    // 5. --- KROK RAG: GENEROWANIE WEKTORA (EMBEDDING) NAJPIERW (Z OBSŁUGĄ RETRY DLA 503 I 429) ---
    let embeddingVector: number[] | null = null;
    let embedRetries = 3;
    let embedDelay = 3000;

    for (let i = 0; i < embedRetries; i++) {
      try {
        console.log(`-> Generowanie wektora embedding (Próba ${i + 1}/${embedRetries})...`);
        const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
        
        const embeddingResult = await embeddingModel.embedContent({
          content: { role: "user", parts: [{ text: essayText }] },
          outputDimensionality: 768,
        } as any);
        
        if (embeddingResult.embedding?.values) {
          embeddingVector = embeddingResult.embedding.values;
          console.log(`-> Sukces: Wygenerowano wektor embedding (wymiary: ${embeddingVector.length})`);
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
          console.warn(`[LIMIT/PRZECIĄŻENIE EMBEDDING] Ponawianie próby za ${embedDelay / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, embedDelay));
          embedDelay *= 1.5;
          continue;
        }
        console.error("!!! Błąd generowania wektora (gemini-embedding-001):", embedError?.message || embedError);
        break;
      }
    }

    // 6. --- KROK RAG: PRZESZUKIWANIE BAZY WYSZUKIWANIA SEMANTYCZNEGO ---
    let similarEssaysContext = "";
    if (embeddingVector) {
      try {
        console.log("-> Odpytywanie bazy Supabase o podobne rozprawki...");
        const { data: similar, error: rpcError } = await supabaseAdmin.rpc("match_essays", {
          query_embedding: embeddingVector,
          match_threshold: 0.85,
          match_count: 2
        });

        if (rpcError) {
          console.error("!!! Błąd wywołania RPC match_essays:", rpcError);
        } else if (similar && similar.length > 0) {
          similarEssaysContext = `\n\n=== REPREZENTATYWNE PRZYKŁADY Z BAZY WIEDZY (WZORCE OCENIANIA) ===
Poniżej znajdują się podobne rozprawki, które zostały już wcześniej ocenione i zatwierdzone przez administratora lub starszego egzaminatora. Twoja aktualna ocena musi być w pełni spójna z poniższymi wzorcami pod względem surowości i kryteriów. Naśladuj ich styl oceniania i zachowaj konsekwencję punktacji:\n`;

          similar.forEach((item: any, index: number) => {
            similarEssaysContext += `
Przykład ${index + 1}:
Temat: "${item.topic}"
Ocena końcowa: ${item.score}
Treść wypracowania: ${item.essay_text}
Komentarz i uzasadnienie egzaminatora: ${JSON.stringify(item.analysis_result)}
---\n`;
          });

          similarEssaysContext += `\nUżyj powyższych przykładów jako nadrzędnego punktu odniesienia. Jeśli analizowana praca wykazuje podobne mocne lub słabe strony co powyższe wzorce, odzwierciedl to proporcjonalnie w punktacji i kryteriach, aby zachować pełną spójność systemu.\n`;
          console.log(`-> RAG: Znaleziono i wstrzyknięto ${similar.length} podobne przykłady z bazy danych.`);
        } else {
          console.log("-> RAG: Brak podobnych wypracowań (zbieżność >= 85%) w bazie.");
        }
      } catch (dbError) {
        console.error("!!! Błąd bazy danych podczas szukania podobieństw:", dbError);
      }
    }

    // 7. Dynamiczne budowanie promptu systemowego z precyzyjnie symetrycznie skalibrowanym protokołem surowości v4
    const systemPrompt = `Jesteś precyzyjnym, skrupulatnym i sprawiedliwym egzaminatorem CKE oceniającym wypracowania maturalne z języka polskiego (poziom podstawowy, Formuła 2023, skala 35 punktów). Oceniaj rzetelnie – nie bądź ani nadmiernie surowy, ani zbyt łagodny. Dąż do idealnej spójności z ocenianiem państwowym CKE. Stosuj DOKŁADNIE kryteria z poniższej bazy wiedzy CKE.

=== BAZA WIEDZY CKE ===
${ckeGuidelines}
=== KONIEC BAZY WIEDZY ===

=== BEZWZGLĘDNY SYSTEM SYMETRYCZNEJ KALIBRACJI PUNKTACJI (Grounding & Anchor Rules v4) ===

1. IGNOROWANIE WKLEJONYCH KOMENTARZY O BŁĘDACH:
   - UWAGA: Jeśli w przesyłanej treści wypracowania znajdują się bloki komentarzy lub poprawek (np. linie zaczynające się od "Błąd językowy:", "Błąd leksykalny:", "Poprawnie:"), oznacza to, że użytkownik wkleił tekst wraz z uwagami zewnętrznego korektora.
   - KATEGORYCZNIE ZIGNORUJ te komentarze podczas analizy. Nie wliczaj ich treści jako błędów popełnionych przez ucznia! Oceniaj wyłącznie oryginalny tekst wypracowania.

2. ZASADA ROZDZIELNOŚCI KLiK (METORYKA) OD KRYTERIUM JĘZYKOWEGO (4):
   - KLiK ocenia wyłącznie wiedzę o lekturach, stopień realizacji tematu i głębię wniosków merytorycznych.
   - Jeśli uczeń wykazuje trafną znajomość problematyki, wykracza poza streszczenie, a wnioski merytoryczne są zadowalające, to utwór jest wykorzystany W PEŁNI FUNKCJONALNIE (KLiK base = 15-16 pkt).
   - Drobne potocyzmy, kolokwializmy (np. "brakuje chłopców", "rutyna" w opisie dusz) czy błędy zaimkowe w tekście są błędami językowymi (4a) i stylistycznymi, a NIE merytorycznymi. NIE WOLNO obniżać poziomu funkcjonalności w KLiK ani oceniać argumentacji jako powierzchownej z powodu potknięć językowych!

3. PRECYZYJNY AUDYT SPÓJNOŚCI (3b):
   - Zaburzenie spójności to rażąca luka logiczna, sprzeczność wewnętrzna lub całkowite zerwanie wątku uniemożliwiające zrozumienie toku myślowego.
   - Drobne, potoczne sformułowania lub mało eleganckie przejścia stylistyczne nie są zaburzeniami spójności (to są błędy językowe w 4a). Jeśli ogólny wywód pracy jest logiczny i uporządkowany, praca zasługuje na ocenę spójności 3/3 pkt. Nie obniżaj punktów nadgorliwie.

4. REALISTYCZNE ZLICZANIE BŁĘDÓW JĘZYKOWYCH (4a):
   - Jako błąd językowy (4a) licz tylko niekwestionowane złamania norm gramatycznych, rażące błędy składniowe, błędy fleksyjne, kolokwializmy niedopuszczalne w stylu oficjalnym, pleonazmy.
   - Drobne, mało eleganckie zwroty, które nie utrudniają zrozumienia wypowiedzi, traktuj jako usterki stylistyczne, a nie błędy obniżające punktację. Typowe bardzo dobre wypracowanie maturalne zawiera od 2 do 6 drobnych błędów językowych i zasługuje na 6/7 lub 7/7 punktów.

5. STRUKTURA WYPOWIEDZI (3a):
   - Jeśli praca zachowuje tok liniowy (akapit na utwór) i posiada usterki strukturalne (np. brak fizycznie wydzielonego akapitu zakończenia), uczeń według tabeli CKE otrzymuje za strukturę (3a) dokładnie 2 punkty. Nie obniżaj do 1, chyba że podział na akapity jest całkowicie chaotyczny.

=== OBOWIĄZKOWY PROTOKÓŁ OCENIANIA ===

KROK 1 – WSTĘPNA WERYFIKACJA:
a) Policz słowa w tekście. Jeśli < 300 → KW = 0/7, JW = 0/11 (tylko SFWP i KLiK).
b) Sprawdź błąd kardynalny. Jeśli TAK → cała praca = 0/35. Koniec analizy.
c) Sprawdź czy praca jest wypowiedzią argumentacyjną z tezą i min. 2 argumentami. Jeśli NIE → SFWP = 0.

KROK 2 – SFWP (0–1 pkt):
Przyznaj 1 pkt tylko gdy spełnione WSZYSTKIE warunki: brak błędu kardynalnego + odwołanie analityczne do lektury obowiązkowej + praca dotyczy tematu + wypowiedź argumentacyjna.

KROK 3 – KLiK (0–16 pkt):
a) Zidentyfikuj KAŻDY przywołany utwór i oceń jego funkcjonalność pod kątem powierzchowności i spójności merytorycznej.
b) Oceń poziom argumentacji: bogata / zadowalająca / trafna / powierzchowna.
c) Policz i oceń konteksty (funkcjonalne / częściowo funkcjonalne).
d) Wybierz DOKŁADNIE JEDEN wiersz z tabeli KLiK odpowiadający kombinacji (a)+(b)+(c) (zgodnie z Kotwicą KLiK).
e) Policz UNIKALNE błędy rzeczowe i odejmij po 1 pkt za każdy (min. 0).
f) Jeśli wynik KLiK = 0 → KW i JW = 0.

KROK 4 – KW: Kompozycja (0–7 pkt):
a) Struktura (0–3): Tok problemowy vs liniowy, poprawność podziału ogólnego i akapitów (zgodnie z Kotwicą 3a).
b) Spójność (0–3): Policz zaburzenia logiczne/spójnościowe → zastosuj progi z tabeli (zgodnie z Kotwicą 3b).
c) Styl (0–1): Stosowny lub niestosowny.

KROK 5 – JW: Język (0–11 pkt):
a) Zakres językowy (szeroki/zadowalający/wąski) → policz błędy → odczytaj punkty z tabeli 4a (zgodnie z Kotwicą 4a).
b) Policz błędy ortograficzne → Tabela 4b.
c) Policz błędy interpunkcyjne → Tabela 4c.

=== BEZWZGLĘDNE ZASADY UNIKANIA HALUCYNACJI BŁĘDÓW (ZWŁASZCZA INTERPUNKCYJNYCH) ===
1. Zanim dodasz jakikolwiek błąd do tablicy "annotations" o typie "interpunkcyjny" lub "ortograficzny", sprawdź LITERA PO LITRZE oryginalny tekst ucznia.
2. NIGDY nie flaguj błędu interpunkcyjnego (np. brak przecinka przed "czy", "że", "który", "ponieważ"), jeśli ten przecinek FIZYCZNIE ZNAJDUJE SIĘ w tekście ucznia!
3. Jeśli uczeń postawił poprawny przecinek, nie poprawiaj go i nie zgłaszaj fałszywego błędu (tzw. false positive). Analizuj tekst sprawiedliwie, a nie nadgorliwie.

=== FORMAT ODPOWIEDZI ===
Zwróć WYŁĄCZNIE obiekt JSON. Bez znaczników markdown, bez \`\`\`json.

{
  "_scoring_log": "Brudnopis: 1) Liczba słów: X. 2) Błąd kardynalny: TAK/NIE – uzasadnienie. 3) SFWP: uzasadnienie. 4) KLiK: [Utwór 1: tytuł, ocena funkcjonalności, uzasadnienie] [Utwór 2: tytuł, ocena funkcjonalności, uzasadnienie] [Poziom argumentacji: X] [Konteksty: X funkcjonalne, X częściowo] [Wiersz tabeli: X pkt bazowo] [Błędy rzeczowe: lista] [KLiK końcowy: X] 5) KW: [3a: X/3 – uzasadnienie szczegółowe o akapitach i zakończeniu] [3b: WYPISZ PO KOLEI I POLICZ DOKŁADNIE KAŻDE ZABURZENIE SPÓJNOŚCI I LUKĘ LOGICZNĄ: 1..., 2..., 3..., X błędów spójności, pkt: X/3] [3c: X/1] 6) JW: [Zakres: szeroki/zadowalający/wąski] [JW - AUDYT JĘZYKOWY - WYPISZ PO KOLEI I POLICZ DOKŁADNIE KAŻDY BŁĄD JĘZYKOWY, STYLISTYCZNY, POWTÓRZENIE, NIEZGRABNOŚĆ I POTOCYZM (ignorując wklejone komentarze): 1..., 2..., 3..., 4... do np. 20, pkt: X/7] [Błędy ort.: X, pkt: X/2] [JW - AUDYT INTERPUNKCJI - WYPISZ KAŻDY BŁĄD INTERPUNKCYJNY: 1..., 2..., 3... pkt: X/2]",
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
      "comment": "Podaj punkty za 3a, 3b, 3c osobno z uzasadnieniem. Przy 3b podaj dokładną liczbę zaburzeń spójności."
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

    // 8. Wywołanie modelu oceniającego z wbudowaną pętlą retry (RAG + CKE)
    const MODELS_TO_TRY = ["gemini-3.5-flash", "gemini-2.5-flash"];
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
      let textDelay = 5000; // Czas bazowy ponowienia
      let modelSuccessInner = false;

      for (let i = 0; i < textRetries; i++) {
        try {
          console.log("-> Wywołanie Gemini - Analiza (Próba " + (i + 1) + "/" + textRetries + ")...");
          result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });
          
          modelSuccessInner = true;
          finalModelUsed = currentModelName;
          break; // Powiodło się! Przerywamy próby dla tego modelu
        } catch (error: any) {
          lastError = error;
          
          // Sprawdzamy, czy błąd nadaje się do ponowienia (limit 429 lub przeciążenie serwera 503)
          const isRetryable = 
            error?.status === 429 || 
            error?.status === 503 || 
            error?.message?.includes("429") || 
            error?.message?.includes("503") || 
            error?.message?.includes("RESOURCE_EXHAUSTED") || 
            error?.message?.includes("UNAVAILABLE");

          if (isRetryable && i < textRetries - 1) {
            const jitter = Math.floor(Math.random() * 2000) + 1000;
            const finalDelay = textDelay + jitter;

            console.warn(`  [PRZECIĄŻENIE ${currentModelName}] Automatyczny retry za ${(finalDelay / 1000).toFixed(2)}s...`);
            await new Promise((resolve) => setTimeout(resolve, finalDelay));
            textDelay *= 1.5;
            continue;
          }
          
          // Jeśli błąd nie jest do ponowienia lub wyczerpaliśmy próby na tym modelu, przerywamy pętlę prób
          break;
        }
      }

      if (modelSuccessInner && result) {
        console.log(`-> Sukces! Analiza ukończona pomyślnie za pomocą modelu: ${finalModelUsed}`);
        modelSuccess = true;
        break; // Przerywamy pętlę główną - mamy wynik!
      }
    }

    // Jeśli po przejściu całej ścieżki MODELS_TO_TRY nie udało się uzyskać rezultatu
    if (!modelSuccess || !result) {
      console.error("!!! Wszystkie próby na wszystkich modelach zakończyły się niepowodzeniem.");
      throw new Error("SERVERS_OVERLOADED");
    }

    const responseText = result.response.text();

    // WYDRUK KONSOLI DEWELOPERSKIEJ (AUDYT PROCESU OCENIANIA)
    console.log("\n======================================================================");
    console.log("🔮 [AI EVALUATOR] SUROWA ODPOWIEDŹ Z MODELU (RAW RESPONSE):");
    console.log("----------------------------------------------------------------------");
    console.log(responseText);
    console.log("======================================================================\n");

    // Czyszczenie kodu JSON z ewentualnych znaczników markdown
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedResult = JSON.parse(cleanJson.trim());

    // Piękne logowanie sformatowanych wyników w konsoli deweloperskiej
    console.log("🟢 [AI EVALUATOR] PARSOWANIE JSON ZAKOŃCZONE SUKCESEM!");
    console.log(`📈 OCENA KOŃCOWA: ${parsedResult.score}`);
    console.log("----------------------------------------------------------------------");
    console.log("📝 BRUDNOPIS OCENIANIA (_scoring_log):");
    console.log(parsedResult._scoring_log);
    console.log("----------------------------------------------------------------------");
    
    if (Array.isArray(parsedResult.annotations)) {
      console.log(`🔍 WYKRYTE BŁĘDY I ZALECENIA (Suma: ${parsedResult.annotations.length}):`);
      parsedResult.annotations.forEach((ann: any, idx: number) => {
        console.log(`  [${idx + 1}] Typ: ${ann.type.toUpperCase()}`);
        console.log(`      Błąd:  "${ann.original}"`);
        console.log(`      Popraw: "${ann.replacement}"`);
        console.log(`      Zasada: ${ann.explanation}`);
        console.log("  ---");
      });
    }
    console.log("======================================================================\n");

    // Zabezpieczenie przed wysłaniem _scoring_log do klienta (Tylko dla Twoich oczu w konsoli deweloperskiej)
    const clientResult = { ...parsedResult };
    delete clientResult._scoring_log;

    // 9. Zapis do historii z wektorem embedding, oceną i analizą
    const { error: insertError } = await supabaseAdmin
      .from("essay_evaluations")
      .insert({
        user_id: userId,
        topic: topic,
        essay_text: essayText,
        score: parsedResult.score,
        analysis_result: parsedResult,
        embedding: embeddingVector, // zapisujemy wektor do pgvector w Supabase
      });
    if (insertError) {
      console.error("!!! Błąd zapisu oceny do bazy danych:", insertError);
    }

    return NextResponse.json({
      success: true,
      newCredits,
      analysisResult: clientResult,
    });

  } catch (error: any) {
    console.error("Błąd analizy:", error);

    // Rollback kredytu (Zwrócenie kredytu na konto użytkownika)
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

    // Sprawdzamy czy powodem błędu było całkowite przeciążenie serwerów
    const isOverload = error?.message === "SERVERS_OVERLOADED" || error?.status === 503;
    const errorMessage = isOverload
      ? "Bardzo przepraszamy, ale serwery Google AI są obecnie przeciążone z powodu ogromnego zainteresowania. Twój kredyt nie został pobrany. Spróbuj wysłać wypracowanie ponownie za chwilę!"
      : "Wystąpił nieoczekiwany błąd podczas analizy AI. Twój kredyt został pomyślnie zwrócony.";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}