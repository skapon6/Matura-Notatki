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
    .select('title, era, difficulty, read_time, file_path, is_free')
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

  // 3. POBIERAMY ORYGINALNY PLIK HTML Z GITHUBA DLA KAŻDEGO
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

    let html = await response.text();

    // -------------------------------------------------------------
    // WARIANT A: UŻYTKOWNIK ZALOGOWANY Z PAKIETEM -> PEŁNA NOTATKA
    // -------------------------------------------------------------
    if (canViewFullNote) {
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // -------------------------------------------------------------
    // WARIANT B: GOŚĆ / BOT GOOGLE -> ORYGINALNY NAGŁÓWEK + ZABLOKOWANE SEKCJE + PAYWALL
    // -------------------------------------------------------------
    
    // Styl i baner paywalla wstrzykiwany do oryginalnego HTML-a
    const lockStylesAndPaywall = `
      <style>
        /* Blokujemy rozwijanie treści dla niezalogowanych */
        .collapsible-content, 
        .section-content, 
        .accordion-content, 
        [id*="content"], 
        [class*="content-body"],
        details > :not(summary) {
          display: none !important;
        }

        /* Zmieniamy przyciski rozwijania na kłódki */
        button, .btn, [onclick*="toggle"], [onclick*="pokaz"] {
          pointer-events: none !important;
          opacity: 0.65 !important;
          cursor: not-allowed !important;
          background: rgba(30, 24, 20, 0.8) !important;
          color: #c68a4c !important;
          border-color: rgba(198, 138, 76, 0.3) !important;
        }

        /* Dolny kontener Paywalla */
        .preview-paywall-container {
          margin: 40px auto 60px auto;
          max-width: 850px;
          background: linear-gradient(180deg, rgba(28, 22, 18, 0.95), rgba(16, 12, 10, 0.98));
          border: 1px solid rgba(198, 138, 76, 0.35);
          border-radius: 28px;
          padding: 40px 24px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          position: relative;
          z-index: 100;
        }

        .preview-paywall-badge {
          display: inline-block;
          background: rgba(198, 138, 76, 0.15);
          color: #c68a4c;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border: 1px solid rgba(198, 138, 76, 0.3);
          margin-bottom: 16px;
        }

        .preview-paywall-btn {
          display: inline-block;
          background: #c68a4c;
          color: #120e0c !important;
          font-weight: 800;
          font-size: 15px;
          padding: 16px 32px;
          border-radius: 16px;
          text-decoration: none !important;
          margin-top: 20px;
          transition: transform 0.2s, background 0.2s;
          pointer-events: auto !important;
          opacity: 1 !important;
          box-shadow: 0 10px 25px rgba(198, 138, 76, 0.25);
        }

        .preview-paywall-btn:hover {
          background: #dba062;
          transform: scale(1.03);
        }

        .preview-nav-bar {
          padding: 14px 24px;
          background: rgba(18, 14, 12, 0.95);
          border-bottom: 1px solid rgba(212, 197, 185, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: sans-serif;
        }

        .preview-nav-bar a {
          color: #c68a4c;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          pointer-events: auto !important;
          opacity: 1 !important;
        }
      </style>

      <div class="preview-nav-bar">
        <a href="/notes">← Wróć do bazy notatek</a>
        <a href="/">📖 Wiedza Szyta na Miarę</a>
      </div>
    `;

    const paywallHtml = `
      <div class="preview-paywall-container">
        <div style="font-size: 36px; margin-bottom: 8px;">🔒</div>
        <span class="preview-paywall-badge">Pełne Opracowanie Zablokowane</span>
        <h2 style="color: #f5f0eb; font-family: Georgia, serif; font-size: 28px; margin: 0 0 12px 0;">
          Odblokuj całą treść notatki z ${note.title}
        </h2>
        <p style="color: #a89f91; font-size: 14px; max-width: 540px; margin: 0 auto; line-height: 1.6;">
          Zaloguj się lub odblokuj pakiet dostępu, aby czytać pełne streszczenia, motywy, konteksty, rozwiązywać quizy oraz sprawdzać wypracowania przez AI.
        </p>
        <a href="/" class="preview-paywall-btn">
          🚀 Przejdź do Pulpitu i Odblokuj Dostęp
        </a>
      </div>
    `;

    // 1. Wstrzykujemy pasek nawigacji i style na początek <body>
    html = html.replace(/<body[^>]*>/i, (match) => `${match}${lockStylesAndPaywall}`);

    // 2. Podmieniamy tekst na przyciskach na kłódeczki 🔒
    html = html.replace(/Pokaż\s*\/\s*ukryj/gi, '🔒 Zablokowane');

    // 3. Wstrzykujemy baner paywalla przed końcem </body>
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${paywallHtml}</body>`);
    } else {
      html += paywallHtml;
    }

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (err) {
    console.error('Błąd serwera notatek:', err);
    return new NextResponse('Błąd serwera', { status: 500 });
  }
}