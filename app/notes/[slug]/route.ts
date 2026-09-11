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

  // 1. Pobieramy notatkę z bazy Supabase
  const { data: note, error } = await supabaseAdmin
    .from('notes')
    .select('title, era, difficulty, read_time, file_path, is_free, chips, content')
    .eq('slug', slug)
    .single();

  if (error || !note?.file_path) {
    return new NextResponse('Nie znaleziono notatki', { status: 404 });
  }

  const isNoteFree = Boolean(note.is_free);
  let hasAccess = false;

  // 2. Weryfikacja sesji użytkownika na serwerze
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

  // -------------------------------------------------------------
  // WARIANT A: ZALOGOWANY Z PAKIETEM -> 100% PEŁNA NOTATKA Z GITHUBA
  // -------------------------------------------------------------
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
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch (err) {
      console.error('Błąd GitHub API:', err);
      return new NextResponse('Błąd serwera', { status: 500 });
    }
  }

  // -------------------------------------------------------------
  // WARIANT B: GOŚĆ / BOT GOOGLE -> AUTORSKI, BEZPIECZNY PODGLĄD BEZ WYCIEKU TREŚCI
  // -------------------------------------------------------------
  
  // Pobieramy plik z GitHuba TYLKO po to, aby wyciągnąć same nazwy sekcji (np. "1. Informacje podstawowe...")
  let sectionTitles: string[] = [];
  try {
    const owner = 'skapon6';
    const repo = 'Notatki-Private-Matura-Projekt';

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${note.file_path}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_NOTES_PAT}`,
          Accept: 'application/vnd.github.v3.raw',
        },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const fullText = await res.text();
      // Wyciągamy nagłówki sekcji typu "1. ...", "2. ..."
      const matches = fullText.match(/(?:[1-8]\.\s*[^<>\n\r]{4,80})/g);
      if (matches && matches.length > 0) {
        sectionTitles = Array.from(new Set(matches.map(s => s.trim()))).slice(0, 8);
      }
    }
  } catch (_) {}

  // Jeśli nie udało się wyciągnąć, podajemy standardowe, profesjonalne sekcje maturalne
  if (sectionTitles.length === 0) {
    sectionTitles = [
      "1. Informacje podstawowe, geneza i tło historyczne",
      "2. Kluczowe motywy literackie i toposy",
      "3. Szczegółowa analiza problematyki i wątków",
      "4. Charakterystyka głównych i drugoplanowych bohaterów",
      "5. Konteksty kulturowe, filozoficzne i biograficzne",
      "6. Złote cytaty i frazy kluczowe do wypracowania",
      "7. Wzorcowe konspekty rozprawek i tezy maturalne",
      "8. Maturalny test sprawdzający wiedzę z odpowiedziami"
    ];
  }

  // Tagi
  const chipsHtml = Array.isArray(note.chips) && note.chips.length > 0
    ? note.chips.map((c: string) => `<span class="tag">#${c}</span>`).join(' ')
    : `<span class="tag">#matura</span> <span class="tag">#język polski</span> <span class="tag">#lektura</span>`;

  // W 100% Czysty, nowoczesny szablon HTML dla podglądu
  const safePreviewHtml = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title} — Opracowanie Maturalne | Wiedza Szyta na Miarę</title>
  <meta name="description" content="Kompleksowe opracowanie: ${note.title}. Epoka: ${note.era || 'Język polski'}. Motywy, konteksty, streszczenie i pytania do matury.">
  <link rel="canonical" href="https://wiedzaszytanamiare.pl/notes/${slug}">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #120e0c;
      color: #d4c5b9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(18, 14, 12, 0.95);
      border-bottom: 1px solid rgba(212, 197, 185, 0.1);
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(8px);
    }
    .nav a {
      color: #c68a4c;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 36px 20px;
      width: 100%;
      flex: 1;
    }
    .hero-card {
      background: #161210;
      border: 1px solid rgba(198, 138, 76, 0.25);
      border-radius: 24px;
      padding: 32px 28px;
      margin-bottom: 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(198, 138, 76, 0.12);
      color: #d89b5c;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid rgba(198, 138, 76, 0.25);
      margin-bottom: 14px;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 36px;
      color: #f5f0eb;
      margin: 0 0 10px 0;
      letter-spacing: -0.5px;
    }
    .subtitle {
      color: #a89f91;
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 18px 0;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag {
      background: rgba(30, 24, 20, 0.8);
      color: #8c827a;
      border: 1px solid rgba(212, 197, 185, 0.1);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
    }
    .section-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 36px;
    }
    .section-item {
      background: #161210;
      border: 1px solid rgba(212, 197, 185, 0.12);
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #f5f0eb;
    }
    .lock-btn {
      background: rgba(198, 138, 76, 0.1);
      color: #c68a4c;
      border: 1px solid rgba(198, 138, 76, 0.3);
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
    }
    .paywall-box {
      background: linear-gradient(180deg, rgba(28, 22, 18, 0.95), rgba(16, 12, 10, 0.98));
      border: 1px solid rgba(198, 138, 76, 0.35);
      border-radius: 24px;
      padding: 40px 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.7);
    }
    .cta-btn {
      display: inline-block;
      background: #c68a4c;
      color: #120e0c;
      font-weight: 800;
      font-size: 14px;
      padding: 15px 30px;
      border-radius: 14px;
      text-decoration: none;
      margin-top: 18px;
      transition: transform 0.2s, background 0.2s;
      box-shadow: 0 10px 20px rgba(198, 138, 76, 0.2);
    }
    .cta-btn:hover {
      background: #dba062;
      transform: scale(1.02);
    }
    footer {
      border-top: 1px solid rgba(212, 197, 185, 0.1);
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #736960;
    }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/notes">← Wróć do bazy notatek</a>
    <a href="/">📖 Wiedza Szyta na Miarę</a>
  </div>

  <div class="container">
    <div class="hero-card">
      <span class="badge">📍 ${note.era || 'Język Polski'} • Poziom: ${note.difficulty || 'Średni'}</span>
      <h1>${note.title}</h1>
      <p class="subtitle">
        ${typeof note.content === 'string' && note.content.length > 0 ? note.content : 'Kompleksowe opracowanie maturalne z epoki ' + (note.era || 'Język Polski') + ' zawierające motywy, konteksty i wzorce wypracowań.'}
      </p>
      <div class="tags">${chipsHtml}</div>
    </div>

    <div class="section-list">
      ${sectionTitles.map(title => `
        <div class="section-item">
          <span class="section-title">${title}</span>
          <span class="lock-btn">🔒 Zablokowane</span>
        </div>
      `).join('')}
    </div>

    <div class="paywall-box">
      <div style="font-size: 32px; margin-bottom: 10px;">🔒</div>
      <h2 style="color: #f5f0eb; font-family: Georgia, serif; font-size: 24px; margin: 0 0 10px 0;">
        Odblokuj całą notatkę z ${note.title}
      </h2>
      <p style="color: #a89f91; font-size: 14px; max-width: 520px; margin: 0 auto; line-height: 1.5;">
        Zaloguj się lub odblokuj pakiet dostępu, aby czytać pełne omówienia, analizy bohaterów, motywy oraz rozwiązywać quizy maturalne.
      </p>
      <a href="/" class="cta-btn">
        🚀 Przejdź do Pulpitu i Odblokuj Dostęp
      </a>
    </div>
  </div>

  <footer>
    © 2026 Wiedza Szyta na Miarę. Wszelkie prawa zastrzeżone.
  </footer>
</body>
</html>
  `;

  return new NextResponse(safePreviewHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}