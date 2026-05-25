// app/api/notes/[slug]/route.ts
import { readFile } from 'fs/promises'
import path from 'path'
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

  // 3. Jeśli użytkownik ma dostęp lub notatka jest darmowa -> odczytujemy i zwracamy plik HTML
  try {
    const filePath = path.join(process.cwd(), 'private', 'notes', data.file_path)
    const html = await readFile(filePath, 'utf-8')
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch {
    return new NextResponse('Błąd odczytu pliku', { status: 500 })
  }
}