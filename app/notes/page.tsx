import { supabase } from '../lib/supabase'

export default async function NotesPage() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')

  if (error) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-[#1f1915]/90 border border-red-950/60 p-6 rounded-2xl max-w-md text-center shadow-xl">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold font-serif text-red-400 mt-2">Błąd połączenia z bazą</h2>
          <p className="text-xs text-stone-400 mt-1">{error.message}</p>
          <a
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs hover:text-stone-100 hover:bg-stone-850 transition-all"
          >
            Wróć do strony głównej
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans flex flex-col transition-colors duration-500">
      {/* Dynamic Keyframes for Subtle Steam effect in the logo */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes steamMini {
          0% { transform: translateY(0) scaleX(1); opacity: 0; }
          50% { transform: translateY(-5px) scaleX(1.2); opacity: 0.3; }
          100% { transform: translateY(-10px) scaleX(0.8); opacity: 0; }
        }
        .steam-mini-1 { animation: steamMini 3s infinite ease-in-out; }
        .steam-mini-2 { animation: steamMini 3s infinite ease-in-out; animation-delay: 1.5s; }
      `}} />

      {/* HEADER SECTION (Consistent with home page styling) */}
      <header className="border-b border-amber-950/40 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-40 bg-[#1f1915]/80">
        
        {/* Left: Back to Home Page Button */}
        <a
          href="/"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-[#1f1915]/90 hover:scale-105 active:scale-95 transition-all text-xs font-medium text-stone-400 hover:text-stone-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Wróć do Kominka
        </a>

        {/* Center: Branding */}
        <div className="flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h1 className="text-lg font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Wiedza Szyta na Miarę
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-amber-500/60 font-semibold">
            Baza Notatek Maturalnych
          </span>
        </div>

        {/* Right: Steaming Coffee/Tea Mug Icon (Decorative & Cozy) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/60 border border-amber-950/40 text-xs text-amber-500/80">
          <span className="relative flex items-center justify-center w-5 h-5">
            {/* Steam animation lines */}
            <svg className="absolute -top-1.5 w-3 h-3 text-stone-400/40" viewBox="0 0 100 100" fill="none">
              <path className="steam-mini-1" d="M30,80 Q40,50 30,20" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
              <path className="steam-mini-2" d="M70,80 Q80,50 70,20" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            </svg>
            <span>☕</span>
          </span>
          <span className="hidden sm:inline font-medium">Czas na naukę</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto w-full p-6 sm:p-8 flex-1 flex flex-col gap-6">
        
        {/* Banner with stats */}
        <div className="relative rounded-2xl p-6 border border-amber-950/40 bg-[#1f1915]/90 overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Archiwum Wiedzy
          </span>
          <h2 className="text-2xl font-bold font-serif text-stone-100 mt-2">Notatki maturalne z bazy danych</h2>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed max-w-2xl">
            Oto Twoje kompendium wiedzy pobrane bezpośrednio z chmury Supabase. Każda notatka jest starannie wyselekcjonowana i zredagowana, aby pomóc Ci w opanowaniu kluczowych wymagań egzaminacyjnych CKE.
          </p>
        </div>

        {/* Dynamic Notes List */}
        <div className="flex flex-col gap-5">
          {notes && notes.length > 0 ? (
            notes.map((note) => {
              // Extract subject for a custom emoji
              const subjectLower = note.subject?.toLowerCase() || '';
              let emoji = '📝';
              let subjectColor = 'text-amber-500/80';
              let bgTagColor = 'bg-amber-950/40 border-amber-900/40';

              if (subjectLower.includes('polsk')) {
                emoji = '📕';
                subjectColor = 'text-rose-400';
                bgTagColor = 'bg-rose-950/30 border-rose-900/30';
              } else if (subjectLower.includes('matematyk')) {
                emoji = '📐';
                subjectColor = 'text-sky-400';
                bgTagColor = 'bg-sky-950/30 border-sky-900/30';
              } else if (subjectLower.includes('angielsk')) {
                emoji = '🇬🇧';
                subjectColor = 'text-emerald-400';
                bgTagColor = 'bg-emerald-950/30 border-emerald-900/30';
              } else if (subjectLower.includes('histori')) {
                emoji = '📜';
                subjectColor = 'text-orange-400';
                bgTagColor = 'bg-orange-950/30 border-orange-900/30';
              } else if (subjectLower.includes('geograf')) {
                emoji = '🌍';
                subjectColor = 'text-teal-400';
                bgTagColor = 'bg-teal-950/30 border-teal-900/30';
              }

              return (
                <article
                  key={note.id}
                  className="rounded-2xl border border-amber-950/30 bg-[#1f1915]/90 p-6 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                >
                  {/* Decorative corner warm gradient */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.02] rounded-full blur-2xl group-hover:bg-amber-500/[0.04] transition-all pointer-events-none" />

                  {/* Header metadata of the card */}
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{emoji}</span>
                      <span className={`uppercase tracking-wider ${subjectColor}`}>{note.subject}</span>
                    </div>
                    
                    {/* Fake read time indicator to keep it cozy */}
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                      <span>⏱️ 5-10 min czytania</span>
                    </div>
                  </div>

                  {/* Note Title */}
                  <h3 className="text-lg font-bold text-stone-100 font-serif mt-3 tracking-tight group-hover:text-amber-200 transition-colors">
                    {note.title}
                  </h3>

                  {/* Main Content Body */}
                  <p className="text-xs text-stone-300/95 leading-relaxed mt-3.5 whitespace-pre-line font-sans border-l-2 border-amber-900/30 pl-3">
                    {note.content}
                  </p>

                  {/* Card footer details */}
                  <div className="border-t border-stone-800/40 mt-5 pt-3.5 flex items-center justify-between text-[11px] text-stone-500">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                      <span>Baza wiedzy CKE 2026</span>
                    </div>
                    <span className="font-serif italic text-amber-500/70">Wiedza Szyta na Miarę</span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-850 p-12 text-center text-stone-500 bg-[#1f1915]/40">
              <span className="text-3xl block mb-2">📭</span>
              Brak notatek w bazie danych. Spróbuj dodać notatki w panelu administracyjnym Supabase.
            </div>
          )}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-amber-950/40 mt-auto py-5 px-6 text-center text-xs text-stone-500 bg-stone-950/10">
        <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Wiedza Szyta na Miarę. Pobieranie danych z Supabase aktywne.</p>
          <a href="/" className="text-amber-500/70 hover:text-amber-400 transition-colors">Strona Główna</a>
        </div>
      </footer>
    </div>
  )
}