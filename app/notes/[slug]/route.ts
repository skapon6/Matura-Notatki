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

  // 3. Pobieramy plik z GitHuba
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

    // -------------------------------------------------------------
    // WARIANT A: ZALOGOWANY Z PAKIETEM -> 100% PEŁNA NOTATKA
    // -------------------------------------------------------------
    if (canViewFullNote) {
      // Dynamiczny, nowoczesny skrypt z automatycznym tytułem z bazy oraz obsługą punktorów
      const noteTitleEscaped = JSON.stringify(note.title || 'Lektura');

      const modernStarScript = `
<script>
  (function() {
    const starBtn = document.getElementById('floating-star');
    let textToSave = "";
    let isSaving = false;

    // Blokada kopiowania
    document.addEventListener('copy', function(e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // Funkcja zachowująca strukturę punktorów i enterów
    function getFormattedSelection(selection) {
      if (!selection || selection.rangeCount === 0) return '';
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());

      // Zamiana elementów li na estetyczne punkty z nową linią
      container.querySelectorAll('li').forEach(function(li) {
        li.textContent = '\\n• ' + (li.textContent || '').trim();
      });
      // Zamiana bloków tekstowych na nowe linie
      container.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(function(el) {
        el.textContent = (el.textContent || '').trim() + '\\n';
      });

      let text = (container.innerText || container.textContent || '').trim();
      return text.replace(/\\n{3,}/g, '\\n\\n');
    }

    function handleSelection(target) {
      if (target === starBtn) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        if (starBtn) starBtn.style.display = 'none';
        return;
      }

      const formattedText = getFormattedSelection(selection);
      if (formattedText.length >= 5 && formattedText.length <= 500) {
        textToSave = formattedText;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (starBtn) {
          starBtn.style.left = (rect.left + window.scrollX + (rect.width / 2) - 18) + 'px';
          starBtn.style.top = (rect.top + window.scrollY - 48) + 'px';
          starBtn.style.display = 'flex';
        }
      } else {
        if (starBtn) starBtn.style.display = 'none';
      }
    }

    document.addEventListener('mouseup', function(e) { handleSelection(e.target); });
    document.addEventListener('keyup', function() { handleSelection(); });
    document.addEventListener('touchend', function(e) {
      setTimeout(function() { handleSelection(e.target); }, 100);
    });

    async function saveNote() {
      if (isSaving || !textToSave || !starBtn) return;
      isSaving = true;
      starBtn.innerText = "⏳";
      starBtn.disabled = true;

      try {
        // Obsługa endpointu (sprawdza standardowy URL)
        const response = await fetch('/api/personal-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSave,
            source_note: ${noteTitleEscaped}
          })
        });

        if (response.ok) {
          starBtn.innerText = "✅";
          setTimeout(function() {
            if (starBtn) {
              starBtn.style.display = 'none';
              starBtn.innerText = "⭐";
              starBtn.disabled = false;
            }
            textToSave = "";
            isSaving = false;
            if (window.getSelection) {
              window.getSelection().removeAllRanges();
            }
          }, 1000);
        } else {
          starBtn.innerText = "❌";
          setTimeout(function() {
            if (starBtn) {
              starBtn.innerText = "⭐";
              starBtn.disabled = false;
            }
            isSaving = false;
          }, 1500);
        }
      } catch (err) {
        if (starBtn) {
          starBtn.innerText = "❌";
          starBtn.disabled = false;
        }
        isSaving = false;
      }
    }

    if (starBtn) {
      starBtn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); });
      starBtn.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); saveNote(); });
      starBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); saveNote(); });
    }
  })();
</script>
`;

      // 🪄 Podmieniamy stary skrypt z Barokiem w locie dla wszystkich 43 notatek naraz:
      let processedHtml = rawHtml;
      const scriptRegex = /<script\b[^>]*>[\s\S]*?saveNote[\s\S]*?<\/script>/gi;

      if (scriptRegex.test(processedHtml)) {
        processedHtml = processedHtml.replace(scriptRegex, modernStarScript);
      } else if (processedHtml.includes('</body>')) {
        processedHtml = processedHtml.replace('</body>', `${modernStarScript}\n</body>`);
      } else {
        processedHtml += modernStarScript;
      }

      return new NextResponse(processedHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // -------------------------------------------------------------
    // WARIANT B: GOŚĆ / BOT GOOGLE -> POBIERAMY PRAWDZIWE TYTUŁY I PODTYTUŁY
    // -------------------------------------------------------------
    
    // 1. Całkowicie usuwamy head, style i skrypty, aby wyczyścić plik ze śmieci CSS
    const bodyOnly = rawHtml
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Wyciągamy dokładnie te bloki, które znajdują się przed przyciskami "Pokaż / ukryj"
    const parsedSections: { title: string; desc: string }[] = [];
    const chunks = bodyOnly.split(/Pokaż\s*\/\s*ukryj/gi);

    for (let i = 0; i < chunks.length - 1; i++) {
      const chunk = chunks[i];
      const cleanText = chunk.slice(-450).replace(/<[^>]+>/g, '\n').trim();
      const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

      const numIndex = lines.findIndex(l => /(?:^|\s)[1-9]\d?\./.test(l));
      if (numIndex !== -1) {
        const title = lines[numIndex];
        const desc = lines.slice(numIndex + 1).join(' • ').slice(0, 160);
        parsedSections.push({ title, desc });
      }
    }

    // Fallback gdyby plik miał inną strukturę
    if (parsedSections.length === 0) {
      parsedSections.push(
        { title: "1. Informacje podstawowe i geneza", desc: "tło historyczne, światopogląd, ramy czasowe" },
        { title: "2. Kluczowe motywy i toposy", desc: "analiza najważniejszych wątków i symboliki" },
        { title: "3. Charakterystyka bohaterów i problematyka", desc: "postacie główne, drugoplanowe, konflikty racji" },
        { title: "4. Konteksty literackie i kulturowe", desc: "filozofia, sztuka, nawiązania do innych epok" },
        { title: "5. Złote cytaty i hasła maturalne", desc: "formuły ułatwiające argumentację w rozprawce" },
        { title: "6. Pytania maturalne i test sprawdzający", desc: "pytania z matury ustnej i pisemnej z odpowiedziami" }
      );
    }

    // Tagi
    const chipsHtml = Array.isArray(note.chips) && note.chips.length > 0
      ? note.chips.map((c: string) => `<span class="tag">#${c}</span>`).join(' ')
      : `<span class="tag">#matura</span> <span class="tag">#język polski</span> <span class="tag">#lektura</span>`;

    // Czysty szablon podglądu SEO dla gości
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
      line-height: 1.6;
      margin: 0 0 18px 0;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag {
      background: rgba(30, 24, 20, 0.8);
      color: #a89f91;
      border: 1px solid rgba(212, 197, 185, 0.12);
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
      border-radius: 18px;
      padding: 16px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.35);
    }
    .section-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #f5f0eb;
      line-height: 1.3;
    }
    .section-desc {
      font-size: 12.5px;
      color: #a89f91;
      line-height: 1.4;
    }
    .lock-btn {
      background: rgba(198, 138, 76, 0.1);
      color: #c68a4c;
      border: 1px solid rgba(198, 138, 76, 0.3);
      padding: 7px 16px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .paywall-box {
      background: linear-gradient(180deg, rgba(28, 22, 18, 0.95), rgba(16, 12, 10, 0.98));
      border: 1px solid rgba(198, 138, 76, 0.35);
      border-radius: 26px;
      padding: 42px 24px;
      text-align: center;
      box-shadow: 0 20px 45px rgba(0,0,0,0.75);
    }
    .cta-btn {
      display: inline-block;
      background: #c68a4c;
      color: #120e0c;
      font-weight: 800;
      font-size: 14px;
      padding: 15px 32px;
      border-radius: 14px;
      text-decoration: none;
      margin-top: 18px;
      transition: transform 0.2s, background 0.2s;
      box-shadow: 0 10px 20px rgba(198, 138, 76, 0.25);
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
      <span class="badge">📍 ${note.era || 'Język Polski'} • Czas: ${note.read_time || 15} min • Poziom: ${note.difficulty || 'Średni'}</span>
      <h1>${note.title}</h1>
      <p class="subtitle">
        ${typeof note.content === 'string' && note.content.length > 0 ? note.content : 'Kompleksowe opracowanie maturalne z epoki ' + (note.era || 'Język Polski') + ' zawierające motywy, konteksty i wzorce wypracowań.'}
      </p>
      <div class="tags">${chipsHtml}</div>
    </div>

    <div class="section-list">
      ${parsedSections.map(sec => `
        <div class="section-item">
          <div class="section-text">
            <span class="section-title">${sec.title}</span>
            ${sec.desc ? `<span class="section-desc">${sec.desc}</span>` : ''}
          </div>
          <span class="lock-btn">🔒 Zablokowane</span>
        </div>
      `).join('')}
    </div>

    <div class="paywall-box">
      <div style="font-size: 34px; margin-bottom: 10px;">🔒</div>
      <h2 style="color: #f5f0eb; font-family: Georgia, serif; font-size: 25px; margin: 0 0 10px 0;">
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

  } catch (err) {
    console.error('Błąd serwera notatek:', err);
    return new NextResponse('Błąd serwera', { status: 500 });
  }
}