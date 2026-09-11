// app/notes/[slug]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Wymuszenie dynamicznego renderowania na Vercelu
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
};

// 1. DYNAMICZNE METATAGI DLA GOOGLE (SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = getSupabase();

  const { data: note } = await supabase
    .from('notes')
    .select('title, era, type')
    .eq('slug', slug)
    .single();

  if (!note) {
    return { title: 'Notatka nie znaleziona | Wiedza Szyta na Miarę' };
  }

  return {
    title: `${note.title} — Opracowanie i Notatka Maturalna | Wiedza Szyta na Miarę`,
    description: `Kompleksowe opracowanie maturalne: ${note.title}. Epoka: ${note.era || 'Język polski'}. Motywy, konteksty i najważniejsze zagadnienia do matury.`,
    alternates: {
      canonical: `https://wiedzaszytanamiare.pl/notes/${slug}`,
    },
  };
}

// 2. GŁÓWNY WIDOK NOTATKI
export default async function NotePage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = getSupabase();

  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !note) {
    notFound();
  }

  // WIDOK PEŁNOEKRANOWEGO CZYTNIKA
  return (
    <div className="min-h-screen bg-[#0e0b0a] flex flex-col">
      {/* Pasek nawigacji */}
      <header className="border-b border-stone-800/80 bg-[#14100e] px-4 sm:px-6 py-2.5 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/notes"
            className="flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-amber-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-stone-900 border border-stone-800/60"
          >
            <span>←</span>
            <span>Wróć do bazy notatek</span>
          </Link>
          <span className="text-xs text-stone-500 font-serif hidden md:inline">
            | {note.title} ({note.era || 'Język polski'})
          </span>
        </div>

        <Link href="/" className="flex items-center gap-2 group select-none">
          <span className="text-lg">📖</span>
          <span className="font-serif font-bold text-xs sm:text-sm text-stone-200 group-hover:text-amber-400 transition-colors">
            Wiedza Szyta na Miarę
          </span>
        </Link>
      </header>

      {/* Czytnik HTML z API (API samo sprawdza uprawnienia i wyświetla notatkę lub błąd braku logowania) */}
      <main className="flex-1 w-full h-[calc(100vh-49px)] bg-[#120e0c]">
        <iframe
          src={`/api/notes/${slug}`}
          title={note.title}
          className="w-full h-full border-0 bg-[#120e0c]"
        />
      </main>
    </div>
  );
}