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

    // Pobieramy profil wraz z datą wygaśnięcia, aby zweryfikować status płatności
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, expires_at') // <--- Pobieramy status oraz expires_at
      .eq('id', user.id)
      .single()

    // Logika weryfikacji dostępu dla wielu pakietów
    let hasAccess = false
    if (profile) {
      const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid']
      const isStatusActive = activeStatuses.includes(profile.subscription_status)
      
      // Sprawdzamy w czasie rzeczywistym, czy data ważności już minęła
      let isExpired = false
      if (profile.expires_at) {
        const expirationTime = new Date(profile.expires_at).getTime()
        const currentTime = new Date().getTime()
        isExpired = currentTime > expirationTime
      }
      
      // Dostęp jest aktywny tylko gdy status się zgadza i pakiet nie wygasł
      if (isStatusActive && !isExpired) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return new NextResponse('Brak dostępu: Ta notatka wymaga konta Premium! 🔒', { status: 403 })
    }
  }

  // 3. Jeśli użytkownik ma dostęp lub notatka jest darmowa -> odczytujemy i zwracamy plik HTML z GitHub API
  try {
    const owner = "skapon6"
    const repo = "Notatki-Private-Matura-Projekt"
    
    const gitHubPath = data.file_path 

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${gitHubPath}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_NOTES_PAT}`,
          Accept: 'application/vnd.github.v3.raw',
        },
        cache: 'no-store' 
      }
    )

    if (!response.ok) {
      console.error(`Błąd API GitHuba: ${response.status} ${response.statusText}`)
      return new NextResponse('Nie znaleziono pliku notatki w prywatnym repozytorium', { status: 404 })
    }

    const html = await response.text()

    // Definiujemy politykę CSP dla kodu HTML notatki pobranej z GitHuba
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://kgycvgcvceaaaopjhato.supabase.co;
      font-src 'self';
      object-src 'none';
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim();

    return new NextResponse(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': cspHeader,      // Usuwa błąd "CSP Header Not Set" w ZAP
        'X-Frame-Options': 'DENY',                 // Chroni przed osadzaniem w ramkach (Clickjacking)
        'X-Content-Type-Options': 'nosniff',       // Blokuje próby MIME sniffingu
      }
    })
  } catch (err) {
    console.error('Błąd pobierania pliku:', err)
    return new NextResponse('Błąd odczytu pliku z zewnętrznego serwera', { status: 500 })
  }
}