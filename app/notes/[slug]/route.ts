// app/notes/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Pobieramy notatkę z bazy danych
  const { data: note, error } = await supabaseAdmin
    .from('notes')
    .select('title, era, difficulty, read_time, file_path, is_free, content')
    .eq('slug', slug)
    .single();

  if (error || !note?.file_path) {
    return new NextResponse('Nie znaleziono notatki', { status: 404 });
  }

  const isNoteFree = Boolean(note.is_free);
  let hasAccess = false;

  // 2. Weryfikacja sesji użytkownika
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, expires_at')
        .eq('id', user.id)
        .single();

      if (profile) {
        const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
        const isStatusActive = activeStatuses.includes(profile.subscription_status);

        let isExpired = false;
        if (profile.expires_at) {
          const expirationTime = new Date(profile.expires_at).getTime();
          isExpired = Date.now() > expirationTime;
        }

        if (isStatusActive && !isExpired) {
          hasAccess = true;
        }
      }
    }
  } catch (authErr) {
    console.warn('Weryfikacja autoryzacji:', authErr);
  }

  const canViewFullNote = isNoteFree || hasAccess;

  // 3. JEŚLI ZALOGOWANY Z PAKIETEM -> ZWRACAMY ORYGINALNĄ, PEŁNĄ NOTATKĘ Z GITHUBA
  if (canViewFullNote) {
    try {
      const owner = 'skapon6';
      const repo = 'Notatki-Private-Matura-Projekt';

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${note.file_path}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_NOTES_PAT}`,
            Accept: 'application/vnd.github.v3.raw',
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        return new NextResponse('Błąd pobierania pliku notatki z serwera', { status: 404 });
      }

      const rawHtml = await response.text();

      return new NextResponse(rawHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    } catch (err) {
      console.error('Błąd GitHub API:', err);
      return new NextResponse('Błąd serwera', { status: 500 });
    }
  }

  // 4. JEŚLI GOŚĆ LUB BOT GOOGLE/AHREFS -> ZWRACAMY PODGLĄD SEO + PAYWALL (KOD 200 OK)
  const previewHtml = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title} — Opracowanie i Notatka Maturalna | Wiedza Szyta na Miarę</title>
  <meta name="description" content="Kompleksowe opracowanie maturalne: ${note.title}. Epoka: ${note.era || 'Język polski'}. Motywy, konteksty i najważniejsze zagadnienia do matury.">
  <link rel="canonical" href="https://wiedzaszytanamiare.pl/notes/${slug}">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #120e0c;
      color: #d4c5b9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .nav {
      border-bottom: 1px solid rgba(212, 197, 185, 0.1);
      background-color: rgba(22, 17, 14, 0.9);
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav a {
      color: #c68a4c;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      flex: 1;
    }
    .tag {
      background: rgba(198, 138, 76, 0.15);
      color: #c68a4c;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid rgba(198, 138, 76, 0.3);
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 38px;
      color: #f5f0eb;
      margin: 16px 0 12px 0;
    }
    .excerpt {
      background: rgba(26, 21, 18, 0.6);
      border: 1px solid rgba(212, 197, 185, 0.1);
      padding: 24px;
      border-radius: 16px;
      line-height: 1.6;
      font-size: 15px;
      color: #a89f91;
      margin-bottom: 30px;
    }
    .paywall {
      background: linear-gradient(180deg, rgba(28, 22, 19, 0.9), rgba(18, 14, 12, 0.95));
      border: 1px solid rgba(198, 138, 76, 0.3);
      padding: 40px 24px;
      border-radius: 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .btn {
      display: inline-block;
      background: #c68a4c;
      color: #120e0c;
      font-weight: bold;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 14px;
      margin-top: 15px;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #dba062;
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/notes">← Wróć do bazy notatek</a>
    <a href="/">📖 Wiedza Szyta na Miarę</a>
  </div>
  <div class="container">
    <span class="tag">📍 ${note.era || 'Język Polski'}</span>
    <h1>${note.title}</h1>
    <div class="excerpt">
      <em>${typeof note.content === 'string' && note.content.length > 0 ? note.content : 'Kompleksowe opracowanie maturalne z epoki ' + (note.era || 'Język Polski') + ' zawierające motywy, konteksty i wzorce wypracowań.'}</em>
    </div>
    <div class="paywall">
      <div style="font-size: 32px; margin-bottom: 10px;">🔒</div>
      <h2 style="color: #f5f0eb; font-family: Georgia, serif; margin: 0 0 10px 0;">Odblokuj całą notatkę i bazę 42 lektur</h2>
      <p style="color: #8c827a; font-size: 14px; max-width: 500px; margin: 0 auto 20px auto; line-height: 1.5;">Zaloguj się na swoje konto lub wybierz pakiet dostępu na stronie głównej, aby czytać pełne opracowanie i korzystać z Asystenta Rozprawek AI.</p>
      <a href="/" class="btn">🚀 Przejdź do Pulpitu i Odblokuj</a>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(previewHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}