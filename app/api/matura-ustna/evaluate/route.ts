import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Pomocnicza funkcja pobierająca obraz i konwertująca go na Base64
async function getBase64Image(url: string) {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { base64, contentType };
  } catch (e) {
    console.error("Błąd pobierania obrazu bodźcowego do analizy AI:", e);
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

    // 3. Konfiguracja promptu systemowego (Komisja CKE oceniająca Zestaw)
    const systemInstruction = `
      Jesteś oficjalną, wymagającą ale życzliwą Państwową Komisją Egzaminacyjną na ustnej maturze z języka polskiego (Formuła 2023).
      Oceniasz pełny zestaw egzaminacyjny złożony z dwóch zadań:
      
      ZADANIE 1: Pytanie jawne z lektury obowiązkowej.
      ZADANIE 2: Pytanie niejawne oparte na dołączonym materiale ikonicznym (obrazie/plakacie).
      
      Kryteria oceniania CKE (Maksymalnie 30 punktów za cały zestaw):
      - Meritum wypowiedzi monologowej dla obu zadań (zawartość merytoryczna, argumentacja, odwołanie do lektur, interpretacja dołączonego obrazu/plakatu i konteksty) - max 16 pkt.
      - Organizacja wypowiedzi monologowej (struktura obu odpowiedzi, spójność) - max 4 pkt.
      - Język i styl (poprawność, słownictwo naukowe) - max 10 pkt.
      
      Przeanalizuj odpowiedź ucznia (która obejmuje oba zadania). Podaj szczegółową recenzję z podziałem na te 3 sekcje i wystaw ostateczną ocenę (np. 24/30).
      Zwróć szczególną uwagę, czy uczeń poprawnie zinterpretował dołączone dzieło sztuki (obraz) w Zadaniu 2!
      Na samym końcu, jako komisja, zadaj uczniowi 2 trudne pytania dopytujące (follow-up questions) oparte o jego monolog, które uczeń mógłby usłyszeć na prawdziwym egzaminie, aby zmusić go do refleksji.
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
          inline_data: {
            mime_type: imgData.contentType,
            data: imgData.base64
          }
        });
      }
    }

    // Wywołanie Gemini 1.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }]
        })
      }
    );

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("Brak odpowiedzi od modelu AI");
    }

    // Pobranie 3 tokenów z konta użytkownika po udanej weryfikacji
    await supabase
      .from('profiles')
      .update({ essay_credits: profile.essay_credits - KOSZT_EGZAMINU })
      .eq('id', session.user.id);

    return NextResponse.json({ result: resultText });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Błąd serwera podczas analizy AI.' }, { status: 500 });
  }
}