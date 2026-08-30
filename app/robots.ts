// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'], // Ukrywamy endpointy backendowe przed wyszukiwarką
    },
    sitemap: 'https://wiedzaszytanamiare.pl/sitemap.xml',
  };
}