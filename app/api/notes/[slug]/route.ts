// app/api/notes/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'

// Tworzymy klienta admina, który bezpiecznie omija RLS do odczytu profili
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // 1. Pobieramy z bazy ścieżkę do pliku oraz informację, czy ta notatka jest darmowa
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('file_path, is_free')
    .eq('slug', slug)
    .single()

  if (error || !data?.file_path) {
    return new NextResponse('Nie znaleziono notatki', { status: 404 })
  }

  const isNoteFree = data.is_free || false

  // 2. Jeśli notatka NIE JEST darmowa, sprawdzamy uprawnienia użytkownika
  if (!isNoteFree) {
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Brak dostępu: Zaloguj się!', { status: 401 })
    }

    // Pobieramy profil, aby zweryfikować status płatności (Premium lub Admin)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const hasAccess = profile?.subscription_status === 'paid' || profile?.subscription_status === 'admin'

    if (!hasAccess) {
      return new NextResponse('Brak dostępu: Ta notatka wymaga konta Premium! 🔒', { status: 403 })
    }
  }

  // 3. Jeśli użytkownik ma dostęp lub notatka jest darmowa -> odczytujemy i zwracamy plik HTML z GitHub API
  try {
    const owner = "skapon6"
    const repo = "Notatki-Private-Matura-Projekt"
    
    // Zmienna 'data.file_path' to ścieżka do pliku zapisana w Twojej bazie Supabase (np. "notatka1.html").
    // Ponieważ wrzuciłeś notatki do nowego repozytorium, ścieżka ta idealnie mapuje się na strukturę plików w tym repozytorium.
    const gitHubPath = data.file_path 

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${gitHubPath}`,
      {
        headers: {
          // Pobieramy token ze zmiennych środowiskowych
          Authorization: `Bearer ${process.env.GITHUB_NOTES_PAT}`,
          // Pobieramy surowy kod pliku HTML (raw) zamiast obiektu JSON
          Accept: 'application/vnd.github.v3.raw',
        },
        // Wyłączamy cache, aby aktualizacje na GitHubie były od razu widoczne
        cache: 'no-store' 
      }
    )

    if (!response.ok) {
      console.error(`Błąd API GitHuba: ${response.status} ${response.statusText}`)
      return new NextResponse('Nie znaleziono pliku notatki w prywatnym repozytorium', { status: 404 })
    }

    const html = await response.text()

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (err) {
    console.error('Błąd pobierania pliku:', err)
    return new NextResponse('Błąd odczytu pliku z zewnętrznego serwera', { status: 500 })
  }
}