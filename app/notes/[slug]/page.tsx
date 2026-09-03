import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Klient Supabase po stronie serwera
function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Props = {
  params: Promise<{ slug: string }>;
};

// 1. DYNAMICZNE META TAGI DLA GOOGLE (SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();

  const { data: note } = await supabase
    .from('notes')
    .select('title, era, type')
    .eq('slug', slug)
    .single();

  if (!note) {
    return {
      title: 'Notatka nie znaleziona | Wiedza Szyta na Miarę',
    };
  }

  return {
    title: `${note.title} — Opracowanie i Notatka Maturalna | Wiedza Szyta na Miarę`,
    description: `Kompleksowe opracowanie maturalne: ${note.title}. Epoka: ${note.era || 'Język polski'}. Motywy, konteksty, streszczenie i najważniejsze zagadnienia do matury.`,
    alternates: {
      canonical: `https://wiedzaszytanamiare.pl/notes/${slug}`,
    },
    openGraph: {
      title: `${note.title} — Notatka do Matury`,
      description: `Opanuj ${note.title} do matury z języka polskiego. Sprawdź najważniejsze motywy i konteksty.`,
      url: `https://wiedzaszytanamiare.pl/notes/${slug}`,
      siteName: 'Wiedza Szyta na Miarę',
      type: 'article',
    },
  };
}

// 2. GŁÓWNY WIDOK NOTATKI
export default async function NotePage({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabaseServer();

  // Pobieramy notatkę z bazy
  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !note) {
    notFound();
  }

  // Parsowanie zawartości
  let parsedContent: any = note.content;
  if (typeof note.content === 'string') {
    try {
      parsedContent = JSON.parse(note.content);
    } catch (_) {
      parsedContent = note.content;
    }
  }

  return (
    <div className="min-h-screen bg-[#120e0c] text-stone-200 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* GÓRNY PASEK NAWIGACJI */}
      <nav className="border-b border-stone-800/60 bg-[#16110e]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/notes"
          className="flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-amber-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-stone-900/60"
        >
          <span>←</span>
          <span>Wróć do bazy notatek</span>
        </Link>
        
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg">📖</span>
          <span className="font-serif font-bold text-sm text-stone-200 group-hover:text-amber-400 transition-colors hidden sm:inline">
            Wiedza Szyta na Miarę
          </span>
        </Link>
      </nav>

      {/* GŁÓWNA TREŚĆ NOTATKI */}
      <main className="max-w-4xl mx-auto w-full px-5 sm:px-8 py-10 flex-1 flex flex-col gap-8">
        
        {/* NAGŁÓWEK NOTATKI */}
        <header className="flex flex-col gap-4 border-b border-stone-800/60 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              📍 {note.era || 'Język Polski'}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-stone-400 bg-stone-900 px-3 py-1 rounded-full border border-stone-800">
              {note.type === 'epoka' ? '📜 Epoka' : note.type === 'lektura' ? '📕 Lektura' : '💡 Poradnik'}
            </span>
            {note.difficulty && (
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/40">
                Poziom: {note.difficulty}
              </span>
            )}
            <span className="text-[10px] font-mono text-stone-500 ml-auto flex items-center gap-1">
              ⏱️ Czas czytania: {note.read_time || 15} min
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-serif text-stone-100 leading-tight tracking-tight mt-2">
            {note.title}
          </h1>

          {Array.isArray(note.chips) && note.chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {note.chips.map((chip: string) => (
                <span
                  key={chip}
                  className="text-xs text-stone-400 bg-stone-900/60 border border-stone-800/80 px-2.5 py-1 rounded-md"
                >
                  #{chip}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* TREŚĆ ARTYKUŁU DLA GOŚCIA / MATURZYSTY */}
        <article className="prose prose-invert prose-stone max-w-none text-stone-300 leading-relaxed space-y-6 text-base sm:text-lg">
          {typeof parsedContent === 'string' ? (
            <p className="whitespace-pre-line">{parsedContent}</p>
          ) : Array.isArray(parsedContent) ? (
            parsedContent.map((section: any, idx: number) => {
              if (typeof section === 'string') {
                return <p key={idx}>{section}</p>;
              }
              return (
                <div key={idx} className="space-y-3">
                  {section.heading && (
                    <h2 className="text-2xl font-serif font-bold text-amber-200/90 mt-8 mb-4 border-b border-stone-800/40 pb-2">
                      {section.heading}
                    </h2>
                  )}
                  {section.text && <p>{section.text}</p>}
                  {section.body && <p>{section.body}</p>}
                  {section.content && <p>{section.content}</p>}
                </div>
              );
            })
          ) : (
            <div className="p-6 rounded-2xl bg-stone-900/30 border border-stone-800">
              <pre className="text-xs text-stone-400 overflow-x-auto whitespace-pre-wrap font-sans">
                {JSON.stringify(parsedContent, null, 2)}
              </pre>
            </div>
          )}
        </article>

        {/* DOLNY BANNER ZACHĘCAJĄCY DO NAUKI W KĄCIKU */}
        <section className="mt-12 p-8 rounded-3xl bg-gradient-to-b from-stone-900/80 to-[#191411] border border-amber-900/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">
              Maturalny Kącik Spokoju ☕
            </span>
            <h3 className="text-xl font-bold font-serif text-stone-100">
              Chcesz sprawdzić swoją wiedzę z tej lektury?
            </h3>
            <p className="text-xs text-stone-400 max-w-md">
              Przetestuj swoje wypracowanie w naszym Asystencie Rozprawek AI lub wykonaj próbny egzamin ustny na żywo.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-95"
          >
            Przejdź do Pulpitu 🚀
          </Link>
        </section>

      </main>

      {/* STOPKA */}
      <footer className="border-t border-stone-800/60 mt-auto py-8 px-6 text-center text-xs text-stone-500 bg-[#0e0b0a]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Wiedza Szyta na Miarę. Wszelkie prawa zastrzeżone.</p>
          <div className="flex gap-4">
            <Link href="/regulamin" className="hover:text-stone-300 transition-colors">Regulamin</Link>
            <Link href="/prywatnosc" className="hover:text-stone-300 transition-colors">Prywatność</Link>
            <Link href="/kontakt" className="hover:text-stone-300 transition-colors">Kontakt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}