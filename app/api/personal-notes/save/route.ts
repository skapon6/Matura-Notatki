import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // W Next.js 15 funkcja cookies() musi być asynchroniczna (oczekiwana słowem await)
  const cookieStore = await cookies();
  
  // Nowy oficjalny klient SSR zalecany przez Supabase
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
            // Ignorujemy błędy w Route Handlerze
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignorujemy błędy w Route Handlerze
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

    // Zapisujemy wycięty cytat do nowej tabeli personal_notes
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