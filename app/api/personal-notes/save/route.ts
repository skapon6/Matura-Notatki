import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
          } catch (error) {
            // Ignorujemy w Route Handlerze
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignorujemy w Route Handlerze
          }
        },
      },
    }
  );

  // Pobieramy aktywną sesję użytkownika
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Niezalogowany użytkownik' }, { status: 401 });
  }

  try {
    const { text, source_note } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Brak tekstu do zapisania' }, { status: 400 });
    }

    // ZABEZPIECZENIE 1: Blokada zapisu zbyt długich cytatów (max 400 znaków)
    if (text.length > 400) {
      return NextResponse.json({ 
        error: 'Zaznaczony fragment jest za długi! Maksymalna długość cytatu to 400 znaków.' 
      }, { status: 400 });
    }

    // ZABEZPIECZENIE 2: Sprawdzamy zoptymalizowanym zapytaniem ile cytatów użytkownik ma już w bazie
    const { count, error: countError } = await supabase
      .from('personal_notes')
      .select('*', { count: 'exact', head: true }) // Pobiera same nagłówki, nie obciąża transferu bazy danych
      .eq('user_id', session.user.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const MAX_CYTATOW = 100; // Twój limit na użytkownika
    if (count !== null && count >= MAX_CYTATOW) {
      return NextResponse.json({ 
        error: `Osiągnąłeś maksymalny limit ${MAX_CYTATOW} zapamiętanych cytatów. Usuń niepotrzebne wpisy w swoim Zeszycie na stronie głównej, aby móc dodać nowe!` 
      }, { status: 403 });
    }

    // Zapisujemy wycięty cytat do tabeli personal_notes
    const { data, error } = await supabase
      .from('personal_notes')
      .insert({
        user_id: session.user.id,
        content: text,
        source: source_note,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}