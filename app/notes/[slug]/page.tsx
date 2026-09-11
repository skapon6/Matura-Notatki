import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/app/lib/supabaseServer';

// Klient Supabase Admin (bezpieczny odczyt na serwerze)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Props = {
  params: Promise<{ slug: string }>;
};

// 1. Tagi SEO dla Google (Generowane dynamicznie dla każdej lektury)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: note } = await supabaseAdmin
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

// 2. Główny komponent strony
export default async function NotePage({ params }: Props) {
  const { slug } = await params;

  // Pobieramy metadane notatki z bazy Supabase
  const { data: note, error } = await supabaseAdmin
    .from('notes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !note) {
    notFound();
  }

  const isNoteFree = Boolean(note.is_free);

  // Weryfikacja sesji użytkownika na serwerze
  let hasAccess = false;

  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, expires_at')
        .eq('id', user.id)
        .single();

      if (profile) {
        const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
        const isStatusActive = activeStatuses.includes(profile.subscription_status);

        let isExpired = false;
        if (profile.expires_at) {
          const expirationTime = new Date(profile.expires_at).getTime();
          isExpired = Date.now() > expirationTime;
        }

        if (isStatusActive && !isExpired) {
          hasAccess = true;
        }
      }
    }
  } catch (err) {
    console.warn('Weryfikacja sesji w NotePage:', err);
  }

  const canReadFull = isNoteFree || hasAccess;

  // Jeśli użytkownik ma dostęp -> pobieramy pełny HTML z prywatnego GitHuba
  let fullNoteHtml: string | null = null;

  if (canReadFull && note.file_path) {
    try {
      const owner = 'skapon6';
      const repo = 'Notatki-Private-Matura-Projekt';

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${note.file_path}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_NOTES_PAT}`,
            Accept: 'application/vnd.github.v3.raw',
          },
          cache: 'no-store',
        }
      );

      if (response.ok) {
        fullNoteHtml = await response.text();
      }
    } catch (fetchErr) {
      console.error('Błąd pobierania pliku notatki z GitHub:', fetchErr);
    }
  }

  return (
    <div className="min-h-screen bg-[#120e0c] text-stone-200 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* PASEK GÓRNY */}
      <nav className="border-b border-stone-800/60 bg-[#16110e]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/notes"
          className="flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-amber-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-stone-900/60 border border-stone-800/60"
        >
          <span>←</span>
          <span>Wróć do bazy notatek</span>
        </Link>
        
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">📖</span>
          <span className="font-serif font-bold text-sm text-stone-200 group-hover:text-amber-400 transition-colors hidden sm:inline">
            Wiedza Szyta na Miarę
          </span>
        </Link>
      </nav>

      {/* GŁÓWNA TREŚĆ */}
      <main className="max-w-4xl mx-auto w-full px-5 sm:px-8 py-8 flex-1 flex flex-col gap-6">
        
        {/* NAGŁÓWEK NOTATKI (WIDOCZNY ZAWSZE - DLA GOŚCIA, BOTA I ZALOGOWANEGO) */}
        <header className="flex flex-col gap-3.5 border-b border-stone-800/60 pb-6">
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

          <h1 className="text-3xl sm:text-5xl font-bold font-serif text-stone-100 leading-tight tracking-tight mt-1">
            {note.title}
          </h1>

          {Array.isArray(note.chips) && note.chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
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

        {/* WARUNEK WYŚWIETLANIA: PEŁNA TREŚĆ VS BLOKADA LOGOWANIA */}
        {canReadFull && fullNoteHtml ? (
          /* 1. PEŁNA NOTATKA DLA ZALOGOWANYCH Z PAKIETEM */
          <div className="bg-[#191412] p-6 sm:p-10 rounded-3xl border border-stone-800/80 shadow-xl leading-relaxed text-stone-200">
            <div
              className="prose prose-invert max-w-none text-stone-200"
              dangerouslySetInnerHTML={{ __html: fullNoteHtml }}
            />
          </div>
        ) : (
          /* 2. DLA BOTÓW I NIEZALOGOWANYCH (STATUS 200 OK + ZACHĘTA DO LOGOWANIA) */
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-stone-900/40 border border-stone-800 text-stone-300 leading-relaxed text-base">
              <p className="italic text-stone-400">
                {typeof note.content === 'string' && note.content.length > 0
                  ? note.content
                  : `Kompleksowe opracowanie maturalne z epoki ${note.era || 'Język Polski'}, zawierające streszczenie, motywy, konteksty oraz wzorcowe analizy.`}
              </p>
            </div>

            {/* KARTA LOGOWANIA / ODBLOKOWANIA PAKIETU */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-900/40 bg-gradient-to-b from-[#1c1613] to-[#120e0c] p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-1 shadow-inner">
                🔒
              </div>
              <span className="text-xs uppercase tracking-widest font-extrabold text-amber-500">
                Pełny Dostęp Wymagany
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-100 max-w-md">
                Odblokuj całą notatkę i bazę 42 lektur
              </h2>
              <p className="text-sm text-stone-400 max-w-lg leading-relaxed">
                Zaloguj się na swoje konto lub wybierz pakiet dostępu, aby czytać pełne opracowanie, korzystać z fiszek oraz Asystenta Rozprawek AI.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 w-full max-w-xs sm:max-w-none justify-center">
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-center"
                >
                  🚀 Przejdź do Pulpitu i Odblokuj
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold text-sm transition-all text-center"
                >
                  🔑 Zaloguj się
                </Link>
              </div>
            </div>
          </div>
        )}

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