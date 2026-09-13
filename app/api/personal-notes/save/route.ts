import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Czyści i estetycznie formatuje zaznaczony przez ucznia fragment
 */
function formatAndCleanQuote(rawText: string): string {
  if (!rawText) return '';

  let text = rawText
    // Zamiana twardych spacji i spacji wielokrotnych na pojedynczą spację
    .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    // Zachowanie pojedynczego podziału linii, jeśli zaznaczono kilka punktów
    .replace(/\n\s*\n+/g, '\n')
    .trim();

  // Usuwamy cudzysłowy z początku i końca (UI sam nakłada stylizowany cudzysłów)
  text = text.replace(/^[„"']+|["'”]+$/g, '').trim();

  if (text.length === 0) return '';

  // Automatyczna wielka litera na początku (naprawia ucięte zaznaczenia)
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Jeśli cytat nie kończy się znakiem interpunkcyjnym, dodajemy kropkę
  if (!/[.!?…]$/.test(text)) {
    text += '.';
  }

  return text;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignorujemy w Route Handlerze
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignorujemy w Route Handlerze
          }
        },
      },
    }
  );

  // 1. Bezpieczna autoryzacja serwerowa zgodna z wytycznymi Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Niezalogowany użytkownik' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawText = body.text;
    const rawSource = body.source_note;

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'Brak tekstu do zapisania' }, { status: 400 });
    }

    // 2. Inteligentne czyszczenie i formatowanie tekstu
    const formattedText = formatAndCleanQuote(rawText);

    if (formattedText.length < 5) {
      return NextResponse.json({ error: 'Zaznaczony fragment jest zbyt krótki.' }, { status: 400 });
    }

    // 3. Weryfikacja limitu długości po oczyszczeniu
    const MAX_CHAR_LENGTH = 400;
    if (formattedText.length > MAX_CHAR_LENGTH) {
      return NextResponse.json(
        {
          error: `Zaznaczony fragment jest za długi (${formattedText.length}/${MAX_CHAR_LENGTH} znaków). Wybierz bardziej zwięzłą myśl.`,
        },
        { status: 400 }
      );
    }

    // 4. Normalizacja źródła (zapobiega brakom tagu lub błędom wielkości liter)
    const sanitizedSource = typeof rawSource === 'string' && rawSource.trim().length > 0
      ? rawSource.trim()
      : 'Własny cytat';

    // 5. Sprawdzenie limitu 100 cytatów (Head query nie obciąża bazy)
    const MAX_CYTATOW = 100;
    const { count, error: countError } = await supabase
      .from('personal_notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (count !== null && count >= MAX_CYTATOW) {
      return NextResponse.json(
        {
          error: `Osiągnąłeś maksymalny limit ${MAX_CYTATOW} zapamiętanych cytatów. Usuń niepotrzebne wpisy w swoim Zeszycie, aby móc dodać nowe!`,
        },
        { status: 403 }
      );
    }

    // 6. Zapis do bazy
    const { data, error } = await supabase
      .from('personal_notes')
      .insert({
        user_id: user.id,
        content: formattedText,
        source: sanitizedSource,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Błąd serwera podczas zapisywania cytatu' }, { status: 500 });
  }
}