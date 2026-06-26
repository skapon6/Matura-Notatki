// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Dla stron statycznych rezygnujemy z dynamicznego nonce, aby przeglądarka nie blokowała skryptów Next.js
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://kgycvgcvceaaaopjhato.supabase.co https://upload.wikimedia.org; -- OTO POPRAWKA (DODANA DOMENA WIKIPEDII)
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://kgycvgcvceaaaopjhato.supabase.co;
  `.replace(/\s{2,}/g, ' ').trim();

  // --- TWOJA LOGIKA TRYBU KONSERWACJI ---
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const url = request.nextUrl.clone();

  const isStaticAsset = 
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/static') || 
    url.pathname.includes('.') || 
    url.pathname === '/maintenance';

  const isWebhookApi = url.pathname.startsWith('/api/webhook') || url.pathname.startsWith('/api/payment');

  let response: NextResponse;

  if (isMaintenanceMode && !isStaticAsset && !isWebhookApi) {
    url.pathname = '/maintenance';
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next();
  }

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};