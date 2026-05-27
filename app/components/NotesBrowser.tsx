"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";

const epochKeywords: Record<string, string[]> = {
  "Antyk": ["antyk", "starożytność", "mitologia", "homer", "sofokles", "biblia", "mit", "antygona", "król edyp", "iliada", "odyseja"],
  "Średniowiecze": ["średniowiecze", "bogurodzica", "lament swietokrzyski", "pieśń o rolandzie", "rozmowa mistrza polikarpa", "gall anonim"],
  "Renesans": ["renesans", "odrodzenie", "kochanowski", "treny", "szachy", "odprawa posłów", "fraszki", "pieśni", "mikołaj rej", "szekspir", "makbet"],
  "Barok": ["barok", "vanitas", "konceptyzm", "sarmatyzm", "marinizm", "paski", "morsztyn", "naborowski", "skąpiec", "molier"],
  "Oświecenie": ["oświecenie", "krasicki", "monachomachia", "hymn do miłości", "żona modna", "powrót posła", "bajki"],
  "Romantyzm": ["romantyzm", "kordian", "mickiewicz", "słowacki", "dziady", "pan tadeusz", "ballady i romanse", "nie-boska komedia", "krasiński"],
  "Pozytywizm": ["pozytywizm", "lalka", "prus", "orzeszkowa", "nad niemnem", "mendel gdanski", "gloria victis", "potop", "sienkiewicz"],
  "Młoda Polska": ["młoda polska", "wesele", "wyspiański", "ludzie bezdomni", "chłopi", "reymont", "deszcz jesienny", "tetmajer", "kasprowicz"],
  "Dwudziestolecie": ["dwudziestolecie", "ferdydurke", "gombrowicz", "przedwiośnie", "żeromski", "granica", "nałkowska", "skamander", "schulz", "sklepy cynamonowe"],
  "Wojna i okupacja": ["wojna", "okupacja", "kamienie na szaniec", "baczyński", "borowski", "opoowiadania borowskiego", "inny świat", "grudziński"],
  "Współczesność": ["współczesność", "tango", "mrożek", "ocalenie", "szymborska", "różewicz", "herbert", "rok 1984", "orwell", "dżuma", "camus"]
};

interface NotesBrowserProps {
  notes: any[];
  loading: boolean;
  hasAccess: boolean;
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export const NotesBrowser: React.FC<NotesBrowserProps> = ({
  notes,
  loading,
  hasAccess,
  currentTheme,
  triggerNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Wszystkie");

  const getExcerpt = (note: any) => {
    if (note.excerpt && typeof note.excerpt === 'string') return note.excerpt;
    const content = note.content;
    if (typeof content === 'string') return content.length > 140 ? content.substring(0, 140) + '...' : content;
    if (Array.isArray(content)) {
      for (const b of content) {
        if (typeof b === 'string') {
          return b.length > 140 ? b.substring(0, 140) + '...' : b;
        }
        if (b && (b.content || b.text || b.body)) {
          const t = b.content || b.text || b.body;
          if (typeof t === 'string') return t.length > 140 ? t.substring(0, 140) + '...' : t;
        }
      }
    }
    if (content && typeof content === 'object') {
      try {
        const s = JSON.stringify(content);
        return s.length > 140 ? s.substring(0, 140) + '...' : s;
      } catch (_) {}
    }
    return note.era ? `Epoka: ${note.era}` : '';
  };

  const filteredNotes = notes.filter((note) => {
    const titleLower = (note.title || "").toLowerCase();
    const contentString = typeof note.content === 'string' ? note.content : JSON.stringify(note.content || "");
    const contentLower = contentString.toLowerCase();
    
    const chipsString = Array.isArray(note.chips) ? note.chips.join(" ") : "";
    const chipsLower = chipsString.toLowerCase();
    
    const textToSearch = `${titleLower} ${contentLower} ${chipsLower}`;
    
    const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
    
    let matchesSubject = true;
    if (selectedSubject !== "Wszystkie") {
      const keywords = epochKeywords[selectedSubject] || [selectedSubject.toLowerCase()];
      matchesSubject = keywords.some(keyword => textToSearch.includes(keyword));
    }
    
    return matchesSearch && matchesSubject;
  });

  return (
    <>
      <div className={`p-4 rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col gap-3.5 transition-colors duration-500`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Wyszukaj lekturę, motyw lub epokę..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-900/70 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/60 transition-all font-sans"
          />
          <svg className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3.5 text-xs text-stone-500 hover:text-stone-200"
            >
              wyczyść
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-800/40">
          {[
            "Wszystkie", 
            "Antyk", 
            "Średniowiecze", 
            "Renesans", 
            "Barok", 
            "Oświecenie", 
            "Romantyzm", 
            "Pozytywizm", 
            "Młoda Polska", 
            "Dwudziestolecie", 
            "Wojna i okupacja", 
            "Współczesność"
          ].map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                selectedSubject === subject
                  ? `${currentTheme.accentBg} text-stone-950 font-bold border-transparent`
                  : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold font-serif text-stone-100 flex items-center gap-2">
            📂 Baza Notatek
            <span className={`text-[10px] font-sans font-normal px-2 py-0.5 rounded-full bg-stone-900 border ${currentTheme.cardBorder} text-stone-400`}>
              {filteredNotes.length} z {notes.length}
            </span>
          </h3>
          <a href="/notes" className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors font-medium">
            zobacz wszystkie →
          </a>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-amber-950/40 p-8 text-center text-sm text-stone-500 bg-[#1f1915]/30">
            ☕ Parzenie herbaty i pobieranie notatek z Supabase...
          </div>
        ) : filteredNotes.length > 0 ? (
          filteredNotes.map((note) => {
            const handleNoteClick = (e: React.MouseEvent) => {
              if (!hasAccess && !note.is_free) {
                e.preventDefault();
                triggerNotification("🔒 Ta notatka wymaga konta Premium. Kliknij 'Uzyskaj Pełny Dostęp' u góry strony, aby odblokować całą bazę notatek!", "error");
              }
            };

            return (
              <a
                href={`/notes/${note.slug}`}
                onClick={handleNoteClick}
                target="_blank"
                rel="noopener noreferrer"
                key={note.id}
                className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📕</span>
                    <span className="uppercase tracking-wider text-amber-500/80">{note.subject || "Język Polski"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      ⏱️ {note.read_time || note.readTime || (Math.max(2, Math.round((String(note.content || "")).split(/\s+/).length / 150)) + " min")}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] border bg-amber-950/40 border-amber-900/50 text-amber-400`}>
                      Lektura
                    </span>
                  </div>
                </div>
                <h4 className="text-base font-bold text-stone-100 font-serif mt-3 tracking-tight group-hover:text-amber-200 transition-colors">
                  {note.title} {!hasAccess && !note.is_free && "🔒"}
                </h4>
                <p className="text-xs text-stone-400/90 leading-relaxed mt-2 line-clamp-3">
                  {getExcerpt(note)}
                </p>
                <div className="border-t border-stone-800/40 mt-4 pt-3 flex items-center justify-between text-xs text-stone-500">
                  <span>Zaktualizowano niedawno</span>
                  <span className={`text-amber-500/80 group-hover:text-amber-400 font-medium flex items-center gap-1 transition-colors`}>
                    {hasAccess || note.is_free ? "Otwórz notatkę 📚" : "Odblokuj notatkę 🔒"}
                  </span>
                </div>
              </a>
            );
          })
        ) : (
          <div className={`rounded-2xl border border-dashed border-stone-800 p-8 text-center text-sm text-stone-500`}>
            😴 Brak notatek spełniających wybrane kryteria. Spróbuj zmienić słowo kluczowe.
          </div>
        )}
      </div>
    </>
  );
};