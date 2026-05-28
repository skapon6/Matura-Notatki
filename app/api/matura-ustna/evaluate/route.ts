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
  * Zadanie 2 (Pytanie niejawne): uczeń musi zinterpretować dołączony materiał ikoniczny/literacki oraz rozwinąć zagadnienie w odwołaniu do innego tekstu kultury lub własnych doświadczeń (max 8 pkt).

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

  // 2. Weryfikacja tokenów (pobieramy 3 tokeny za pełny zestaw)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('essay_credits')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Nie znaleziono profilu' }, { status: 404 });
  }

  const KOSZT_EGZAMINU = 3;
  if (profile.essay_credits < KOSZT_EGZAMINU) {
    return NextResponse.json({ 
      error: `Niewystarczająca liczba tokenów. Potrzebujesz min. ${KOSZT_EGZAMINU} tokenów na egzamin ustny! Doładuj tokeny w panelu głównym.` 
    }, { status: 403 });
  }

  try {
    const { publicQuestion, unseenQuestion, draftPublic, draftUnseen, speech, unseenImageUrl } = await request.json();

    if (!publicQuestion || !unseenQuestion || !speech) {
      return NextResponse.json({ error: 'Brak wymaganych danych egzaminacyjnych' }, { status: 400 });
    }

    // 3. Konfiguracja promptu systemowego zwracającego obiekt JSON
    const systemInstruction = `
      Jesteś oficjalną, wymagającą ale życzliwą Państwową Komisją Egzaminacyjną na ustnej maturze z języka polskiego (Formuła 2023).
      Oceniasz pełny zestaw egzaminacyjny złożony z dwóch zadań zgodnie z poniższą oficjalną bazą wiedzy CKE:
      
      === OFICJALNA BAZA WIEDZY CKE (MATURA USTNA) ===
      ${ckeOralGuidelines}
      === KONIEC BAZY WIEDZY ===

      Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON o strukturze zgodnej z poniższym przykładem. Nie używaj znaczników markdown takich jak \`\`\`json.

      {
        "score": "X/30",
        "status": "ZDANE | NIEZDANE",
        "details": [
          {
            "criterion": "Aspekt merytoryczny (monolog)",
            "points": "X/16",
            "comment": "Szczegółowa ocena merytoryczna obu zadań. Zadanie 1 (jawne): wskaż mocne strony i błędy merytoryczne/brak odniesień. Zadanie 2 (niejawne): wskaż poprawność argumentacji i doboru kontekstów."
          },
          {
            "criterion": "Kompozycja wypowiedzi monologowych",
            "points": "X/4",
            "comment": "Uzasadnienie struktury, trójdzielności obu monologów, spójności i logiki wywodu."
          },
          {
            "criterion": "Aspekt merytoryczny w rozmowie (symulacja)",
            "points": "X/6",
            "comment": "Ocena przygotowania i przewidywanej jakości odpowiedzi ucznia na pytania dopytujące."
          },
          {
            "criterion": "Zakres i poprawność języka",
            "points": "X/4",
            "comment": "Ocena poprawności gramatycznej, stylistycznej, bogactwa leksykalnego i posługiwania się pojęciami naukowymi."
          }
        ],
        "imageAnalysis": "Osobna, szczegółowa ocena, czy uczeń poprawnie i głęboko zinterpretował dołączone dzieło sztuki (obraz) w Zadaniu 2, wskaż co odczytał poprawnie, a co pominął.",
        "summary": "Syntetyczne podsumowanie monologu, główne zalety, wady oraz praktyczna rada na egzamin państwowy.",
        "followUpQuestions": [
          "Pierwsze precyzyjne pytanie dopytujące komisji bezpośrednio oparte na wypowiedzi ucznia...",
          "Drugie precyzyjne pytanie dopytujące komisji bezpośrednio oparte na wypowiedzi ucznia..."
        ]
      }
    `;

    const promptText = `
      --- ZESTAW EGZAMINACYJNY UCZNIA ---
      
      ZADANIE 1 (Pytanie jawne): "${publicQuestion.question}"
      Brudnopis ucznia do Zadania 1: "${draftPublic || 'Brak notatek'}"
      
      ZADANIE 2 (Pytanie niejawne - oparte na obrazie): "${unseenQuestion.question}"
      Brudnopis ucznia do Zadania 2: "${draftUnseen || 'Brak notatek'}"
      
      PEŁNA WYGŁOSZONA ODPOWIEDŹ MONOLOGOWA UCZNIA (obejmująca oba zadania po kolei):
      "${speech}"
    `;

    const parts: any[] = [
      { text: `${systemInstruction}\n\n${promptText}` }
    ];

    // Jeśli do pytania niejawnego przypisany jest obraz, pobieramy go i przesyłamy w Base64
    if (unseenImageUrl) {
      const imgData = await getBase64Image(unseenImageUrl);
      if (imgData) {
        parts.push({
          inlineData: {  // <-- CamelCase
            mimeType: imgData.contentType, // <-- CamelCase
            data: imgData.base64
          }
        });
      }
    }

    // --- SYSTEM AUTOMATYCZNEGO PONAWIANIA PRÓB (RETRY ON 503) ---
    let response: any;
    let data: any;
    const maxRetries = 3;
    let delay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      console.log(`-> Wywołanie Gemini 3.5 Flash (Próba ${i + 1}/${maxRetries})...`);
      
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: parts }]
          })
        }
      );

      data = await response.json();

      // Jeżeli Google odpowie 503 (przeciążenie), czekamy i próbujemy ponownie
      if (response.status === 503 && i < maxRetries - 1) {
        console.warn(`[PRZECIĄŻENIE 503] Serwer Google zgłosił duże obciążenie. Automatyczna próba ponowna za ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential Backoff
        continue;
      }

      break;
    }

    // Weryfikacja poprawności ostatecznego żądania
    if (!response.ok) {
      console.error("!!! Szczegółowy błąd z Google Generative AI API:", JSON.stringify(data));
      throw new Error(`Google API Error: ${data.error?.message || response.statusText}`);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      console.error("!!! Odpowiedź Google pusta lub brakująca. Pełna struktura:", JSON.stringify(data));
      throw new Error("Brak odpowiedzi od modelu AI");
    }

    // Czyszczenie kodu JSON z ewentualnych znaczników markdown
    let cleanJson = resultText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedResult = JSON.parse(cleanJson.trim());
    console.log("-> Sukces: Otrzymano ocenę matury ustnej od Gemini w formacie JSON.");

    // Pobranie 3 tokenów z konta użytkownika po udanej weryfikacji
    await supabase
      .from('profiles')
      .update({ essay_credits: profile.essay_credits - KOSZT_EGZAMINU })
      .eq('id', session.user.id);

    return NextResponse.json({ result: parsedResult }); // Zwracamy obiekt JSON
  } catch (err: any) {
    console.error("Błąd krytyczny podczas przetwarzania matury ustnej:", err);
    return NextResponse.json({ error: 'Błąd serwera podczas analizy AI.' }, { status: 500 });
  }
}