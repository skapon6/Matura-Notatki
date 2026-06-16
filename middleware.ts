// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Sprawdzamy stan zmiennej środowiskowej
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const url = request.nextUrl.clone();

  // Ignorujemy pliki statyczne, favicorny oraz skrypty Next.js, aby strona konserwacji ładnie się ostylowała
  const isStaticAsset = 
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/static') || 
    url.pathname.includes('.') || 
    url.pathname === '/maintenance';

  // Ignorujemy API Webhooków Stripe, aby płatności w tle przechodziły bezpiecznie podczas prac technicznych
  const isWebhookApi = url.pathname.startsWith('/api/webhook') || url.pathname.startsWith('/api/payment');

  if (isMaintenanceMode && !isStaticAsset && !isWebhookApi) {
    url.pathname = '/maintenance';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// Konfigurujemy filtry ścieżek
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};