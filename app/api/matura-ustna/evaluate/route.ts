// app/api/matura-ustna/evaluate/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Deklarujemy wytyczne bezpośrednio w pliku, aby uniknąć problemów ze ścieżkami kompilatora TypeScript
const ckeOralGuidelines = `
WYTYCZNE CKE – OCENIANIE EGZAMINU USTNEGO Z JĘZYKA POLSKIEGO (FORMUŁA 2023 – POZIOM PODSTAWOWY)

MAKSYMALNA LICZBA PUNKTÓW: 30
PRÓG ZDANIA: 30% (minimum 9 punktów)

STRUKTURA OCENIANIA (CZTERY GŁÓWNE KRYTERIA):

Kryterium 1 – Aspekt merytoryczny wypowiedzi monologowych w zadaniach 1. i 2. (0–16 pkt):
- Ocenia zawartość merytoryczną, realizację tematu, argumentację oraz odwołania literackie i kulturowe dla obu zadań łącznie (Zadanie 1 - jawne, Zadanie 2 - niejawne).
  * Zadanie 1 (Pytanie jawne): uczeń musi w pełni rozwinąć zagadnienie z lektury obowiązkowej oraz poprawnie przywołać i funkcjonalnie wykorzystać wybrany kontekst (max 8 pkt).
  * Zadanie 2 (Pytanie niejawne): uczeń musi zinterpretować dołączony materiał ikoniczny/literacki osadzony w kontekście (max 8 pkt).

Kryterium 2 – Kompozycja wypowiedzi monologowych w zadaniach 1. i 2. (0–4 pkt):
- Ocenia strukturę wypowiedzi, spójność logiczną oraz zachowanie trójdzielności (wstęp, rozwinięcie, zakończenie) dla obu monologów.

Kryterium 3 – Aspekt merytoryczny wypowiedzi podczas rozmowy z komisją (0–6 pkt):
- Ocenia merytoryczną jakość odpowiedzi na pytania dopytujące (follow-up) zadawane przez Komisję Egzaminacyjną, umiejętność obrony własnego stanowiska i wejścia w merytoryczny dialog.

Kryterium 4 – Zakres i poprawność środków językowych w wypowiedziach monologowych oraz podczas rozmowy (0–4 pkt):
- Ocenia poprawność językową, styl, bogactwo słownictwa oraz posługiwanie się terminologią naukową i literacką przez cały czas trwania egzaminu (monologi + rozmowa).
`;

// Pomocnicza funkcja pobierająca obraz i konwertująca go na Base64
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

  // 1. Weryfikacja zalogowania
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Niezalogowany użytkownik' }, { status: 401 });
  }

  // 2. Weryfikacja tokenów
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('essay_credits')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Nie znaleziono profilu' }, { status: 404 });
  }

  try {
    const { publicQuestion, unseenQuestion, draftPublic, draftUnseen, speech, unseenImageUrl, examMode } = await request.json();

    if (!publicQuestion || !unseenQuestion || !speech) {
      return NextResponse.json({ error: 'Brak wymaganych danych egzaminacyjnych' }, { status: 400 });
    }

    // Określamy tryb egzaminu (domyślnie "both")
    const mode = examMode || "both";
    const KOSZT_EGZAMINU = mode === "both" ? 3 : 2; // Koszt 2 kredyty za 1 zadanie, 3 kredyty za oba!

    if (profile.essay_credits < KOSZT_EGZAMINU) {
      return NextResponse.json({ 
        error: `Niewystarczająca liczba tokenów. Potrzebujesz min. ${KOSZT_EGZAMINU} tokenów na ten zakres egzaminu!` 
      }, { status: 403 });
    }

    // Walidacja limitu słów (50 - 2000 słów) [8]
    const wordCount = speech.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ error: "Wypowiedź jest zbyt krótka (minimum 50 słów)." }, { status: 400 });
    }
    if (wordCount > 2000) {
      return NextResponse.json({ error: "Wypowiedź przekracza maksymalny limit 2000 słów." }, { status: 400 });
    }

    // DYNAMICZNY MODYFIKATOR SKALI PUNKTOWEJ (DLA 1 ZADANIA - 15 PKT)
    let scaleInstruction = "";
    if (mode === "public_only" || mode === "unseen_only") {
      const activeTaskName = mode === "public_only" ? "ZADANIE 1 (Pytanie jawne o lekturę)" : "ZADANIE 2 (Pytanie niejawne o obraz)";
      scaleInstruction = `
      
      === BEZWZGLĘDNY WYMÓG SKALI PUNKTOWEJ (ZADANIE JEDNOSTKOWE - MAX 15 PKT) ===
      Uczeń wybrał ćwiczenie wyłącznie jednego zadania: ${activeTaskName}.
      Musisz bezwzględnie dostosować całe ocenianie i obiekt JSON do skali MAKSYMALNIE 15 PUNKTÓW, dzieląc wszystkie kryteria CKE dokładnie na pół:
      - Aspekt merytoryczny (monolog): maksymalnie 8 punktów (oceniasz tylko to jedno wybrane zadanie, drugie ignorujesz i dajesz mu 0).
      - Kompozycja monologu: maksymalnie 2 punkty.
      - Aspekt merytoryczny w rozmowie (symulacja): maksymalnie 3 punkty (ZADAJ TYLKO JEDNO [1] PRECYZYJNE PYTANIE DOPYTUJĄCE ZAMIAST DWÓCH).
      - Zakres i poprawność języka: maksymalnie 2 punkty.
      - Suma końcowa: maksymalnie 15 punktów.
      Status ZDANE przyznaj przy osiągnięciu minimum 5 punktów (30% z 15 pkt).
      W szablonie odpowiedzi JSON dostosuj pola punktacji do skali 15-punktowej. W tablicy "followUpQuestions" wygeneruj dokładnie jedno (1) pytanie dopytujące.
      `;
    }

    // 3. Konfiguracja promptu systemowego (Komisja CKE oceniająca Zestaw)
    const systemInstruction = `
      Jesteś oficjalną, wymagającą ale życzliwą Państwową Komisją Egzaminacyjną na ustnej maturze z języka polskiego (Formuła 2023).
      Oceniasz zestaw egzaminacyjny zgodnie z poniższą oficjalną bazą wiedzy CKE:
      
      === OFICJALNA BAZA WIEDZY CKE (MATURA USTNA) ===
      ${ckeOralGuidelines}
      === KONIEC BAZY WIEDZY ===

      WYMÓG FORMALNY I ESTETYCZNY (BARDZO WAŻNE):
      Zwróć odpowiedź sformatowaną w przejrzysty, uporządkowany sposób jako czysty tekst. 
      BEZWZGLĘDNIE ZAKAZANE JEST UŻYWANIE ZNAKÓW MARKDOWN (takich jak #, ##, ###, *, **). Tekst jest wyświetlany bezpośrednio na ekranie jako zwykły tekst bez renderera markdown.
      Używaj linii ze znaków równości (====) i myślników (----), aby stworzyć ładne obramowania i sekcje dokumentu. Stosuj tabulatory i wcięcia.
      ${scaleInstruction}

      Użyj poniższego szablonu tekstowego jako ścisłego wzorca struktury odpowiedzi:

      ============================================================
      🎓 OFICJALNY PROTOKÓŁ EGZAMINU USTNEGO (Formuła 2023)
      ============================================================
      
      📊 PODSUMOWANIE PUNKTOWE
      
      - WYNIK CAŁKOWITY: X / [Wpisz 15 lub 30 w zależności od trybu] punktów (Status: ZDANE / NIEZDANE)
      - 1. Aspekt merytoryczny (monolog): X / [Wpisz 8 lub 16] pkt
           (Zadanie 1: X/8 pkt | Zadanie 2: X/8 pkt)
      - 2. Kompozycja wypowiedzi monologowych: X / [Wpisz 2 lub 4] pkt
      - 3. Aspekt merytoryczny w rozmowie (symulacja): X / [Wpisz 3 lub 6] pkt
      - 4. Zakres i poprawność języka: X / [Wpisz 2 lub 4] pkt
      
      ------------------------------------------------------------
      
      📚 ZADANIE 1: PYTANIE JAWNE (Lektura obowiązkowa)
      [Jeśli uczeń pominął to zadanie z uwagi na tryb - wpisz: "Pominięte w tym trybie nauki"]
      
      - Temat pytania: "${publicQuestion.question}"
      - Ocena zadania: X / 8 pkt
      
      - Mocne strony wypowiedzi:
        + [Opis mocnej strony pod kątem merytoryki CKE]
        
      - Obszary wymagające poprawy:
        + [Opis błędu lub braku merytorycznego]
      
      ------------------------------------------------------------
      
      🎨 ZADANIE 2: PYTANIE NIEJAWNE (Materiał ikoniczny / tekst)
      [Jeśli uczeń pominął to zadanie z uwagi na tryb - wpisz: "Pominięte w tym trybie nauki"]
      
      - Temat pytania: "${unseenQuestion.question}"
      - Ocena zadania: X / 8 pkt
      
      - Analiza i interpretacja materiału:
        [Recenzja, czy uczeń poprawnie zinterpretował plakat/obraz]
        
      - Mocne strony wypowiedzi:
        + [Opis merytorycznej zalety interpretacji]
        
      - Obszary wymagające poprawy:
        + [Opis braku interpretacyjnego]
      
      ------------------------------------------------------------
      
      ✍️ STRUKTURA, SPÓJNOŚĆ I STYL JĘZYKOWY
      
      - Kompozycja (Kryterium 2): X / [Wpisz 2 lub 4] pkt
        Komentarz: [Uzasadnienie logiczności wywodu, trójdzielności monologów i spójności]
        
      - Język i styl (Kryterium 4): X / [Wpisz 2 lub 4] pkt
        Komentarz: [Ocena poprawności językowej i stylu wypowiedzi]
      
      ------------------------------------------------------------
      
      💬 PYTANIA DOPYTUJĄCE OD KOMISJI (Follow-up)
      
      Jako Komisja Egzaminacyjna, zadaj zdającemu precyzyjne pytania dopytujące bezpośrednio oparte na jego monologu (wygeneruj 1 pytanie w trybie 15-punktowym, lub 2 pytania w trybie 30-punktowym):
      
      Pytanie 1: [Pierwsze dociekliwe pytanie komisji]
      Pytanie 2: [Drugie dociekliwe pytanie komisji - jeśli dotyczy]
      
      ============================================================
    `;

    const promptText = `
      --- ZESTAW EGZAMINACYJNY UCZNIA ---
      
      ZADANIE 1 (Pytanie jawne): "${publicQuestion.question}"
      Brudnopis ucznia do Zadania 1: "${draftPublic || 'Brak notatek'}"
      
      ZADANIE 2 (Pytanie niejawne - oparte na obrazie): "${unseenQuestion.question}"
      Brudnopis ucznia do Zadania 2: "${draftUnseen || 'Brak notatek'}"
      
      PEŁNA WYGŁOSZONA ODPOWIEDŹ MONOLOGOWA UCZNIA:
      "${speech}"
    `;

    const parts: any[] = [
      { text: `${systemInstruction}\n\n${promptText}` }
    ];

    // Obraz przesyłamy tylko wtedy, gdy uczeń faktycznie wykonuje Zadanie 2 (tryby "both" lub "unseen_only")
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

    // --- SYSTEM AUTOMATYCZNEGO PONAWIANIA PRÓB Z JITTEREM (RETRY ON 503/429) --- [3.1.2]
    let response: any;
    let data: any;
    const maxRetries = 3;
    let delay = 3000; 

    for (let i = 0; i < maxRetries; i++) {
      console.log(`-> Wywołanie Gemini 2.5 Flash - Ustna (Próba ${i + 1}/${maxRetries})...`);
      
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

      break;
    }

    if (!response.ok) {
      console.error("!!! Szczegółowy błąd z Google Generative AI API:", JSON.stringify(data));
      throw new Error(`Google API Error: ${data.error?.message || response.statusText}`);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      console.error("!!! Odpowiedź Google pusta lub brakująca. Pełna struktura:", JSON.stringify(data));
      throw new Error("Brak odpowiedzi od modelu AI");
    }

    console.log("-> Sukces: Otrzymano ocenę matury ustnej od Gemini.");

    // Pobranie odpowiedniej liczby tokenów po udanej weryfikacji
    await supabase
      .from('profiles')
      .update({ essay_credits: profile.essay_credits - KOSZT_EGZAMINU })
      .eq('id', session.user.id);

    return NextResponse.json({ result: resultText });
  } catch (err: any) {
    console.error("Błąd krytyczny podczas przetwarzania matury ustnej:", err);
    return NextResponse.json({ error: 'Błąd serwera podczas analizy AI.' }, { status: 500 });
  }
}