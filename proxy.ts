// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// W Next.js 16 nazwa funkcji to "proxy" zamiast "middleware"
export function proxy(request: NextRequest) {
  // 1. ZABEZPIECZENIA: Generowanie tokenu (nonce) bez użycia Node'owego "Buffer"
  // Używamy standardowego Web API: btoa + crypto, które działają w Edge Runtime i Proxy
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === 'development';

  // Definicja polityki CSP (dostosuj adres Supabase do swojego projektu)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://kgycvgcvceaaaopjhato.supabase.co;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://kgycvgcvceaaaopjhato.supabase.co;
  `.replace(/\s{2,}/g, ' ').trim();

  // Przygotowanie nagłówków żądania z przekazanym tokenem nonce i CSP
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // --- TWOJA LOGIKA TRYBU KONSERWACJI ---
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const url = request.nextUrl.clone();

  // Ignorujemy pliki statyczne, favicony oraz skrypty Next.js, aby strona konserwacji ładnie się ostylowała
  const isStaticAsset = 
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/static') || 
    url.pathname.includes('.') || 
    url.pathname === '/maintenance';

  // Ignorujemy API Webhooków Stripe, aby płatności w tle przechodziły bezpiecznie podczas prac technicznych
  const isWebhookApi = url.pathname.startsWith('/api/webhook') || url.pathname.startsWith('/api/payment');

  let response: NextResponse;

  if (isMaintenanceMode && !isStaticAsset && !isWebhookApi) {
    url.pathname = '/maintenance';
    // Przekierowujemy na stronę konserwacji, przekazując nagłówki żądania
    response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  } else {
    // Normalne działanie aplikacji, również przekazujemy nagłówki żądania
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Dodajemy wygenerowany nagłówek CSP bezpośrednio do zwracanej odpowiedzi (dla przeglądarki)
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

// Konfigurujemy filtry ścieżek (pozostaje bez zmian)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};