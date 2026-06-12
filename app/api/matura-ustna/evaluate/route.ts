// app/api/matura-ustna/evaluate/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ckeOralGuidelines = `
WYTYCZNE CKE – OCENIANIE EGZAMINU USTNEGO Z JĘZYKA POLSKIEGO (FORMUŁA 2023 – POZIOM PODSTAWOWY)

MAKSYMALNA LICZBA PUNKTÓW: 30
PRÓG ZDANIA: 30% (minimum 9 punktów)

STRUKTURA OCENIANIA (CZTERY GŁÓWNE KRYTERIA):

Kryterium 1 – Aspekt merytoryczny wypowiedzi monologowych w zadaniach 1. i 2. (0–16 pkt):
- Ocenia zawartość merytoryczną, realizację tematu, argumentację oraz odwołania literackie i kulturowe dla obu zadań łącznie (Zadanie 1 - jawne, Zadanie 2 - niejawne).
  * Zadanie 1 (Pytanie jawne): uczeń musi w pełni rozwinąć zagadnienie z lektury obowiązkowej oraz poprawnie przywołać i funkcjonalnie wykorzystać wybrany kontekst (max 8 pkt).
  * Zadanie 2 (Pytanie niejawne): uczeń musi zinterpretować dołączony materiał ikoniczny (plakat/obraz) LUB tekst źródłowy (fragment utworu) osadzony w kontekście (max 8 pkt).

Kryterium 2 – Kompozycja wypowiedzi monologowych w zadaniach 1. i 2. (0–4 pkt):
- Ocenia strukturę wypowiedzi, spójność logiczną oraz zachowanie trójdzielności (wstęp, rozwinięcie, zakończenie) dla obu monologów.

Kryterium 3 – Aspekt merytoryczny wypowiedzi podczas rozmowy z komisją (0–6 pkt):
- Ocenia merytoryczną jakość odpowiedzi na pytania dopytujące (follow-up) zadawane przez Komisję Egzaminacyjną, umiejętność obrony własnego stanowiska i wejścia w merytoryczny dialog.

Kryterium 4 – Zakres i poprawność środków językowych w wypowiedziach monologowych oraz podczas rozmowy (0–4 pkt):
- Ocenia poprawność językową, styl, bogactwo słownictwa oraz posługiwanie się terminologią naukową i literacką przez cały czas trwania egzaminu (monologi + rozmowa).
`;

async function getBase64Image(url: string) {
  try {
    let absoluteUrl = url;
    if (url.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      absoluteUrl = `${baseUrl}${url}`;
    }
    
    console.log("-> Serwer pobiera obraz z absolutnego URL:", absoluteUrl);
    
    const response = await fetch(absoluteUrl);
    if (!response.ok) {
      throw new Error(`Błąd pobierania obrazu. Status HTTP: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    console.log("-> Obraz pomyślnie pobrany i przekonwertowany na Base64");
    return { base64, contentType };
  } catch (e: any) {
    console.error("!!! Błąd pobierania obrazu bodźcowego do analizy AI:", e?.message || e);
    return null;
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove(name: string, options: any) { try { cookieStore.set({ name, value: '', ...options }); } catch {} }
      }
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Niezalogowany użytkownik' }, { status: 401 });
  }

  // Pobranie danych profilu
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('essay_credits')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Nie znaleziono profilu' }, { status: 404 });
  }

  const originalCredits = profile.essay_credits;
  let creditDeducted = false;

  try {
    const { publicQuestion, unseenQuestion, draftPublic, draftUnseen, speech, unseenImageUrl, examMode } = await request.json();

    if (!publicQuestion || !unseenQuestion || !speech) {
      return NextResponse.json({ error: 'Brak wymaganych danych egzaminacyjnych' }, { status: 400 });
    }

    const mode = examMode || "both";
    const KOSZT_EGZAMINU = mode === "both" ? 3 : 2;

    if (originalCredits < KOSZT_EGZAMINU) {
      return NextResponse.json({ 
        error: `Niewystarczająca liczba tokenów. Potrzebujesz min. ${KOSZT_EGZAMINU} tokenów na ten zakres egzaminu!` 
      }, { status: 403 });
    }

    const wordCount = speech.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Wypowiedź jest zbyt krótka (minimum 50 słów)." }, { status: 400 });
    }
    if (wordCount > 2000) {
      return NextResponse.json({ error: "Wypowiedź przekracza maksymalny limit 2000 słów." }, { status: 400 });
    }

    // 1. NATYCHMIASTOWA BLOKADA KREDYTÓW PRZED WYWOŁANIEM AI (Zabezpieczenie przed nadużyciem i odświeżaniem)
    const newCredits = originalCredits - KOSZT_EGZAMINU;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ essay_credits: newCredits })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: "Nie udało się zablokować tokenów." }, { status: 500 });
    }
    creditDeducted = true;

    let scaleInstruction = "";
    if (mode === "public_only" || mode === "unseen_only") {
      const activeTaskName = mode === "public_only" ? "ZADANIE 1 (Pytanie jawne o lekturę)" : "ZADANIE 2 (Pytanie niejawne o obraz/tekst)";
      scaleInstruction = `
      
      === BEZWZGLĘDNY WYMÓG SKALI PUNKTOWEJ (ZADANIE JEDNOSTKOWE - MAX 15 PKT) ===
      Uczeń wybrał ćwiczenie wyłącznie jednego zadania: ${activeTaskName}.
      Musisz bezwzględnie dostosować całe ocenianie i obiekt JSON do skali MAKSYMALNIE 15 PUNKTÓW, dzieląc wszystkie kryteria CKE dokładnie na pół:
      - Aspekt merytoryczny (monolog): maksymalnie 8 punktów (oceniasz tylko to jedno wybrane zadanie, drugie ignorujesz i dajesz mu 0).
      - Kompozycja monologu: maksymalnie 2 punkty.
      - Aspekt merytoryczny w rozmowie (symulacja): maksymalnie 3 punkty (ZADAJ TYLKO JEDNO PRECYZYJNE PYTANIE DOPYTUJĄCE ZAMIAST DWÓCH).
      - Zakres i poprawność języka: maksymalnie 2 punkty.
      - Suma końcowa: maksymalnie 15 punktów.
      Status ZDANE przyznaj przy osiągnięciu minimum 5 punktów (30% z 15 pkt).
      W szablonie odpowiedzi JSON dostosuj pola punktacji do skali 15-punktowej. W tablicy "followUpQuestions" wygeneruj dokładnie jedno (1) pytanie dopytujące.
      `;
    }

    const systemInstruction = `
      Jesteś oficjalną, wymagającą ale życzliwą Państwową Komisją Egzaminacyjną na ustnej maturze z języka polskiego (Formuła 2023).
      Oceniasz zestaw egzaminacyjny zgodnie z poniższą oficjalną bazą wiedzy CKE:
      
      === OFICJALNA BAZA WIEDZY CKE (MATURA USTNA) ===
      ${ckeOralGuidelines}
      === KONIEC BAZY WIEDZY ===

      ${scaleInstruction}

      === WYTYCZNE DLA GENEROWANIA MODELOWYCH PLANÓW ("modelOutlines") ===
      1. W polu "modelOutlines.public" wygeneruj pełne, szczegółowe opracowanie wzorcowe dla Zadania 1 (pytanie jawne) na poziomie eksperckim CKE. Musi zawierać: (1) Uniwersalną, dojrzałą tezę, (2) Propozycje logicznych argumentów i odwołań merytorycznych do lektury obowiązkowej, (3) Rekomendowany funkcjonalny kontekst. Sformatuj to bardzo czytelnie, używając akapitów i myślników (używaj znaku \\n do nowej linii). 
      2. W polu "modelOutlines.unseen" wygeneruj pełne, szczegółowe opracowanie wzorcowe dla Zadania 2 (pytanie niejawne) na poziomie eksperckim CKE. Musi zawierać: (1) Uniwersalną tezę, (2) Szczegółową analizę i interpretację dołączonego materiału bodźcowego (obrazu/plakatu lub tekstu źródłowego), (3) Rekomendowany funkcjonalny kontekst dopełniający. Sformatuj to bardzo czytelnie, używając akapitów i myślników (używaj znaku \\n do nowej linii).
      3. BEZWZGLĘDNY I KATEGORYCZNY ZAKAZ KOPIOWANIA TYCH INSTRUKCJI LUB PYTAŃ POMOCNICZYCH DO WYNIKU. Wygenerowany tekst w polach "modelOutlines.public" oraz "modelOutlines.unseen" ma zaczynać się bezpośrednio od treści merytorycznej (np. od razu od nagłówków "**TEZA:**" lub "**ROZWINIĘCIE:**").
      4. Jeśli uczeń pominął dane zadanie w tym trybie (np. wybrał tylko jedno zadanie) - wpisz w odpowiednim polu po prostu: "Zadanie pominięte w tym trybie nauki."

      === FORMAT ODPOWIEDZI ===
      Zwróć wyłącznie prawidłowy, sformatowany obiekt JSON. Bez znaczników markdown, bez \`\`\`json na początku ani na końcu.

      {
        "score": "X/30" (lub X/15 w zależności od wybranego trybu),
        "status": "ZDANE" (jeśli suma punktów stanowi min. 30%) lub "NIEZDANE",
        "details": [
          {
            "criterion": "Aspekt merytoryczny (monolog)",
            "points": "X/16" (lub X/8),
            "comment": "Szczegółowa, konstruktywna ocena merytoryczna monologów. Oceń osobno Zadanie 1 (Pytanie jawne o lekturę) i Zadanie 2 (Pytanie niejawne o obraz lub tekst)."
          },
          {
            "criterion": "Kompozycja wypowiedzi monologowych",
            "points": "X/4" (lub X/2),
            "comment": "Ocena struktury wypowiedzi, spójności logicznej oraz zachowania trójdzielności."
          },
          {
            "criterion": "Aspekt merytoryczny w rozmowie (symulacja)",
            "points": "X/6" (lub X/3),
            "comment": "Uzasadnienie punktacji za symulację rozmowy z komisją."
          },
          {
            "criterion": "Zakres i poprawność języka",
            "points": "X/4" (lub X/2),
            "comment": "Ocena poprawności językowej, stylu i słownictwa."
          }
        ],
        "imageAnalysis": "Analiza i interpretacja materiału bodźcowego z Zadania 2 (obrazu/plakatu LUB tekstu źródłowego). Skomentuj czy uczeń poprawnie odczytał sensy i motywy.",
        "summary": "Podsumowanie komisji: zwięzłe, mądre słowa otuchy i wskazówki do nauki.",
        "followUpQuestions": [
          "Pierwsze precyzyjne pytanie dopytujące nawiązujące bezpośrednio do monologu ucznia",
          "Drugie precyzyjne pytanie dopytujące (wygeneruj tylko w trybie 30-punktowym)"
        ],
        "modelOutlines": {
          "public": "[Tutaj wygeneruj czyste opracowanie merytoryczne Zadania 1 zgodnie z wytycznymi]",
          "unseen": "[Tutaj wygeneruj czyste opracowanie merytoryczne Zadania 2 zgodnie z wytycznymi]"
        }
      }
    `;

    const promptText = `
      --- ZESTAW EGZAMINACYJNY UCZNIA ---
      
      ZADANIE 1 (Pytanie jawne): "${publicQuestion.question}"
      Brudnopis ucznia do Zadania 1: "${draftPublic || 'Brak notatek'}"
      
      ZADANIE 2 (Pytanie niejawne - oparte na obrazie lub tekście): "${unseenQuestion.question}"
      ${unseenQuestion.stimulus_text ? `DOŁĄCZONY TEKST ŹRÓDŁOWY DO ZADANIA 2 (materiał bodźcowy): "${unseenQuestion.stimulus_text}"` : ""}
      Brudnopis ucznia do Zadania 2: "${draftUnseen || 'Brak notatek'}"
      
      PEŁNA WYGŁOSZONA ODPOWIEDŹ MONOLOGOWA UCZNIA:
      "${speech}"
    `;

    const parts: any[] = [
      { text: `${systemInstruction}\n\n${promptText}` }
    ];

    if (unseenImageUrl && (mode === "both" || mode === "unseen_only")) {
      const imgData = await getBase64Image(unseenImageUrl);
      if (imgData) {
        parts.push({
          inlineData: {  
            mimeType: imgData.contentType, 
            data: imgData.base64
          }
        });
      }
    }

    // --- PODWÓJNY SYSTEM ZABEZPIECZEŃ (FALLBACK MODELI DLA MATURY USTNEJ) ---
    const MODELS_TO_TRY = ["gemini-3.5-flash", "gemini-2.5-flash"];
    let response: any = null;
    let data: any = null;
    let finalModelUsed = "";
    let modelSuccess = false;
    let lastError: any = null;

    for (const currentModelName of MODELS_TO_TRY) {
      console.log(`-> Ustna: Próba uruchomienia analizy na modelu: ${currentModelName}`);
      const maxRetries = 3;
      let delay = 3000; 

      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`  -> Wywołanie ${currentModelName} - Ustna (Próba ${i + 1}/${maxRetries})...`);
          
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${currentModelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: parts }]
              })
            }
          );

          data = await response.json();

          const isRetryable = 
            response.status === 429 || 
            response.status === 503 || 
            data.error?.status === "UNAVAILABLE" || 
            data.error?.status === "RESOURCE_EXHAUSTED";

          if (isRetryable && i < maxRetries - 1) {
            const jitter = Math.floor(Math.random() * 2000) + 1000;
            const finalDelay = delay + jitter;

            console.warn(`[LIMIT/PRZECIĄŻENIE USTNEJ 503/429] Serwer obciążony. Automatyczny retry za ${(finalDelay / 1000).toFixed(2)}s...`);
            await new Promise((resolve) => setTimeout(resolve, finalDelay));
            delay *= 1.5; 
            continue;
          }

          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            modelSuccess = true;
            finalModelUsed = currentModelName;
            break; 
          } else {
            throw new Error(`Google API Error: ${data.error?.message || response.statusText}`);
          }
        } catch (err: any) {
          lastError = err;
          break; 
        }
      }

      if (modelSuccess && response?.ok) {
        console.log(`-> Sukces! Egzamin ustny oceniony za pomocą modelu: ${finalModelUsed}`);
        break; 
      }
    }

    if (!response || !response.ok) {
      console.error("!!! Wszystkie próby na wszystkich modelach matury ustnej zakończyły się niepowodzeniem.");
      throw new Error("SERVERS_OVERLOADED");
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Czyszczenie kodu JSON z ewentualnych znaczników markdown
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedResult = JSON.parse(cleanJson.trim());

    return NextResponse.json({ result: parsedResult });
  } catch (err: any) {
    console.error("Błąd krytyczny podczas przetwarzania matury ustnej:", err);
    
    // ZWROT KREDYTÓW (ROLLBACK) W RAZIE BŁĘDU PO STRONIE SERWERA
    if (creditDeducted && user.id) {
      try {
        await supabase
          .from('profiles')
          .update({ essay_credits: originalCredits })
          .eq('id', user.id);
        console.log("-> Sukces: Zwrócono kredyty na konto użytkownika po wystąpieniu błędu.");
      } catch (rollbackError) {
        console.error("!!! Błąd krytyczny podczas rollbacku kredytów:", rollbackError);
      }
    }

    const isOverload = err?.message === "SERVERS_OVERLOADED" || err?.status === 503;
    const errorMessage = isOverload
      ? "Bardzo przepraszamy, ale serwery Google AI są obecnie przeciążone z powodu ogromnego zainteresowania. Twój kredyt nie został pobrany. Spróbuj wysłać wypowiedź ponownie za chwilę!"
      : "Wystąpił nieoczekiwany błąd podczas analizy AI. Twoje tokeny nie zostały pobrane.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}