// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

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

  // 2. Dynamiczne pobieranie wszystkich notatek i lektur z Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: notes } = await supabase
      .from('notes')
      .select('slug, updated_at, created_at');

    const notePages: MetadataRoute.Sitemap = (notes || []).map((note) => ({
      url: `${baseUrl}/notes/${note.slug}`,
      lastModified: note.updated_at ? new Date(note.updated_at) : new Date(note.created_at || new Date()),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticPages, ...notePages];
  } catch (error) {
    console.error('Błąd podczas generowania dynamicznej sitemapy:', error);
    return staticPages;
  }
}