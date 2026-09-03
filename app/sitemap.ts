// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

// Wymuszenie rewalidacji co 24h lub dynamicznego generowania
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://wiedzaszytanamiare.pl';

  // 1. Statyczne podstrony serwisu
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ocenianie-rozprawek`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mapa-mysli`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fiszki`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/postepy`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/regulamin`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/prywatnosc`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // 2. Dynamiczne pobieranie slugów notatek z bazy
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Używamy SERVICE_ROLE_KEY (jeśli dostępny na Vercelu) lub fallback do ANON_KEY
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pobieramy TYLKO kolumnę slug, która na 100% istnieje w tabeli notes
    const { data: notes, error } = await supabase
      .from('notes')
      .select('slug');

    if (error) {
      console.error('Błąd Supabase przy pobieraniu sitemapy:', error.message);
      return staticPages;
    }

    const notePages: MetadataRoute.Sitemap = (notes || [])
      .filter((note) => Boolean(note.slug))
      .map((note) => ({
        url: `${baseUrl}/notes/${note.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));

    return [...staticPages, ...notePages];
  } catch (error) {
    console.error('Krytyczny błąd generatora sitemapy:', error);
    return staticPages;
  }
}