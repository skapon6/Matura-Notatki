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

  // 3. POBIERAMY ORYGINALNY PLIK HTML Z GITHUBA
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
    // WARIANT A: ZALOGOWANY Z PAKIETEM -> PEŁNA TREŚĆ
    // -------------------------------------------------------------
    if (canViewFullNote) {
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // -------------------------------------------------------------
    // WARIANT B: GOŚĆ / BOT GOOGLE -> WYCZYSZCZENIE TREŚCI + COZY DARK THEME
    // -------------------------------------------------------------
    
    // 1. Bezpiecznie usuwamy treść merytoryczną z wnętrza sekcji (Zero wycieku)
    html = html.replace(/<(div|section)[^>]*(class|id)=["'][^"']*(content|body|accordion-body|collapsible|panel|inner|details)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '<div class="locked-placeholder" style="display:none;"></div>');
    
    // 2. Usuwamy wszelkie skrypty rozwijania
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 3. Wymuszamy jednolity, luksusowy ciemny motyw na CAŁEJ stronie
    const unifiedDarkStylesAndNav = `
      <style>
        /* 1. Globalny reset pod Cozy Dark Academic */
        html, body {
          background-color: #120e0c !important;
          background-image: none !important;
          color: #d4c5b9 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 100vh !important;
        }

        /* 2. Ukrywanie zawartości sekcji */
        .collapsible-content, 
        .section-content, 
        .accordion-content, 
        [id*="content"], 
        [class*="content-body"],
        details > :not(summary) {
          display: none !important;
        }

        /* 3. Ujednolicenie kart i nagłówków */
        .header-card, .info-card, .card, [class*="card"], [class*="hero"], [class*="box"] {
          background-color: rgba(26, 21, 18, 0.75) !important;
          border: 1px solid rgba(198, 138, 76, 0.25) !important;
          color: #f5f0eb !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
        }

        /* 4. Paski sekcji (1-8) */
        .section-header, .accordion-header, [class*="section-item"], [class*="row-item"] {
          background-color: rgba(22, 17, 14, 0.9) !important;
          border: 1px solid rgba(212, 197, 185, 0.12) !important;
          border-radius: 16px !important;
          color: #f5f0eb !important;
          margin-bottom: 12px !important;
        }

        /* 5. Wyraziste kolory tekstów */
        h1, h2, h3, h4, h5, h6, strong, [class*="title"] {
          color: #f5f0eb !important;
        }
        p, span, small, [class*="subtitle"], [class*="desc"] {
          color: #a89f91 !important;
        }

        /* 6. Przyciski zablokowane */
        button, .btn, [onclick*="toggle"], [onclick*="pokaz"] {
          pointer-events: none !important;
          cursor: not-allowed !important;
          background: rgba(35, 27, 22, 0.9) !important;
          color: #c68a4c !important;
          border: 1px solid rgba(198, 138, 76, 0.3) !important;
          border-radius: 10px !important;
          padding: 6px 14px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          opacity: 0.9 !important;
        }

        /* 7. Górny pasek nawigacji */
        .preview-nav-bar {
          padding: 14px 24px;
          background: rgba(18, 14, 12, 0.95);
          border-bottom: 1px solid rgba(212, 197, 185, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: sans-serif;
          position: sticky;
          top: 0;
          z-index: 999;
          backdrop-filter: blur(8px);
        }

        .preview-nav-bar a {
          color: #c68a4c;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          pointer-events: auto !important;
          opacity: 1 !important;
        }

        /* 8. Dolny Paywall */
        .preview-paywall-container {
          margin: 40px auto 70px auto;
          max-width: 850px;
          background: linear-gradient(180deg, rgba(28, 22, 18, 0.95), rgba(16, 12, 10, 0.98));
          border: 1px solid rgba(198, 138, 76, 0.35);
          border-radius: 28px;
          padding: 45px 24px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
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
          Zaloguj się lub odblokuj pakiet dostępu, aby czytać pełne opracowania, motywy, konteksty, rozwiązywać quizy oraz sprawdzać wypracowania przez AI.
        </p>
        <a href="/" class="preview-paywall-btn">
          🚀 Przejdź do Pulpitu i Odblokuj Dostęp
        </a>
      </div>
    `;

    // Wstrzykujemy nawigację i ciemne style do <body>
    html = html.replace(/<body[^>]*>/i, (match) => `${match}${unifiedDarkStylesAndNav}`);

    // Podmieniamy tekst przycisków na kłódeczki
    html = html.replace(/Pokaż\s*\/\s*ukryj/gi, '🔒 Zablokowane');

    // Wstrzykujemy dolny paywall
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