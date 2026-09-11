// next.config.ts (lub next.config.js / next.config.mjs)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wygenerowane nagłówki bezpieczeństwa pod ocenę A+
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 1. Ochrona przed Clickjackingiem
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // 2. Blokada MIME-sniffingu
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // 3. Kontrola nagłówka Referrer
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // 4. Wymuszenie HTTPS (HSTS na 2 lata)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // 5. POPRAWKA 1: Dodany brakujący Permissions-Policy
          {
            key: "Permissions-Policy",
            // ✅ Zezwolenie dla własnej domeny:
            value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
          },
          // 6. POPRAWKA 2 i 3: Naprawiony syntax CSP + wymogi Mozilla Observatory
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://generativelanguage.googleapis.com https://vitals.vercel-insights.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",             // <- Wymóg Mozilli (blokada Flash/Java)
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",        // <- Wymóg Mozilli (nowoczesny X-Frame-Options)
              "upgrade-insecure-requests",     // <- Wymóg Mozilli (wymuszenie HTTPS)
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;