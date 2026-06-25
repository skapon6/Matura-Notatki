import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // Wyłączenie nagłówka informującego o Next.js

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Usuwamy stąd Content-Security-Policy (będzie w middleware.ts)
          {
            key: 'X-Frame-Options',
            value: 'DENY', 
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          }
        ],
      },
    ];
  },
};

export default nextConfig;