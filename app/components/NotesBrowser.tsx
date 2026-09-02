// components/NotesBrowser.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ThemeClasses } from "../lib/theme";
import Link from "next/link";
import { CozyGlowCard } from "./CozyGlowCard";
import { supabase } from "../lib/supabase";
import { playSound } from "../lib/sounds";

const epochKeywords: Record<string, string[]> = {
  "Antyk": ["antyk", "starożytność", "mitologia", "homer", "sofokles", "biblia", "mit", "antygona", "król edyp", "iliada", "odyseja"],
  "Średniowiecze": ["średniowiecze", "bogurodzica", "lament swietokrzyski", "pieśń o rolandzie", "rozmowa mistrza polikarpa", "gall anonim"],
  "Renesans": ["renesans", "odrodzenie", "kochanowski", "treny", "szachy", "odprawa posłów", "fraszki", "pieśni", "mikołaj rej", "szekspir", "makbet"],
  "Barok": ["barok", "vanitas", "konceptyzm", "sarmatyzm", "marinizm", "paski", "morsztyn", "naborowski", "skąpiec", "molier"],
  "Oświecenie": ["oświecenie", "krasicki", "monachomachia", "hymn do miłości", "żona modna", "powrót posła", "bajki"],
  "Romantyzm": ["romantyzm", "kordian", "mickiewicz", "słowacki", "dziady", "pan tadeusz", "ballady i romanse", "nie-boska komedia", "krasiński"],
  "Pozytywizm": ["pozytywizm", "lalka", "prus", "orzeszkowa", "nad niemnem", "mendel gdanski", "gloria victis", "potop", "trylogia", "kmicic"],
  "Młoda Polska": ["młoda polska", "wesele", "wyspiański", "ludzie bezdomni", "chłopi", "reymont", "deszcz jesienny", "tetmajer", "kasprowicz"],
  "Dwudziestolecie": ["dwudziestolecie", "ferdydurke", "gombrowicz", "przedwiośnie", "żeromski", "granica", "nałkowska", "skamander", "schulz", "sklepy cynamonowe"],
  "Wojna i okupacja": ["wojna", "okupacja", "kamienie na szaniec", "baczyński", "borowski", "opoowiadania borowskiego", "inny świat", "grudziński"],
  "Współczesność": ["współczesność", "tango", "mrożek", "ocalenie", "szymborska", "różewicz", "herbert", "rok 1984", "orwell", "dżuma", "camus"]
};

const CozyGlowLinkCard = ({
  children,
  href,
  onClick,
  target,
  rel,
  className = "",
  currentTheme,
  isFree = false,
}: {
  children: React.ReactNode;
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  target?: string;
  rel?: string;
  className?: string;
  currentTheme: any;
  isFree?: boolean;
}) => {
  const cardRef = React.useRef<HTMLAnchorElement>(null);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);

  let glowColor = "rgba(245, 158, 11, 0.22)";
  let hoverBorderClass = "hover:border-amber-500/20";
  
  const cardBgClasses = currentTheme?.cardBg || "";
  
  if (isFree) {
    glowColor = "rgba(16, 185, 129, 0.25)";
    hoverBorderClass = "hover:border-emerald-500/30";
  } else if (cardBgClasses.includes("151c24") || cardBgClasses.includes("121820")) {
    glowColor = "rgba(14, 165, 233, 0.25)";
    hoverBorderClass = "hover:border-sky-500/30";
  } else if (cardBgClasses.includes("251515") || cardBgClasses.includes("211111")) {
    glowColor = "rgba(239, 68, 68, 0.25)";
    hoverBorderClass = "hover:border-red-500/30";
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const borderClass = isFree ? "border-emerald-800/40" : currentTheme.cardBorder;
  const bgClass = isFree ? "bg-emerald-950/10 shadow-md shadow-emerald-950/20" : currentTheme.cardBg;

  return (
    <a
      ref={cardRef}
      href={href}
      onClick={onClick}
      target={target}
      rel={rel}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border ${borderClass} ${bgClass} transition-all duration-300 ${hoverBorderClass} hover:shadow-lg ${className}`}
    >
      <div className="relative z-10 w-full h-full flex flex-col justify-between">{children}</div>
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300 z-20"
          style={{
            background: `radial-gradient(320px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
            mixBlendMode: "screen"
          }}
        />
      )}
    </a>
  );
};

export interface NotesBrowserProps {
  notes: any[];
  loading: boolean;
  hasAccess: boolean;
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
  limit?: number;
}

export const NotesBrowser: React.FC<NotesBrowserProps> = ({
  notes,
  loading,
  hasAccess,
  currentTheme,
  triggerNotification,
  limit,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Wszystkie");
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [readNotes, setReadNotes] = useState<number[]>([]);

  // WCZYTYWANIE PRZECZYTANYCH NOTATEK Z BAZY CHMUROWEJ
  useEffect(() => {
    async function loadCloudReadNotes() {
      // 1. Błyskawiczny odczyt z pamięci lokalnej
      const stored = localStorage.getItem("read_notes");
      if (stored) {
        try { setReadNotes(JSON.parse(stored)); } catch (e) {}
      }

      // 2. Pobranie zaktualizowanej listy ID z bazy Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('read_notes')
            .eq('id', session.user.id)
            .single();

          if (profile?.read_notes && Array.isArray(profile.read_notes)) {
            setReadNotes(profile.read_notes);
            localStorage.setItem("read_notes", JSON.stringify(profile.read_notes));
          }
        }
      } catch (err) {
        console.error("Błąd pobierania przeczytanych notatek:", err);
      }
    }
    loadCloudReadNotes();
  }, []);

  // SYNCHRONIZACJA Z BAZĄ SUPABASE PRZY KLIKNIĘCIU
  const toggleReadNote = async (noteId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyRead = readNotes.includes(noteId);
    const updatedReads = isCurrentlyRead
      ? readNotes.filter((id) => id !== noteId)
      : [...readNotes, noteId];

    // 1. Zmiana na ekranie i w localStorage
    setReadNotes(updatedReads);
    localStorage.setItem("read_notes", JSON.stringify(updatedReads));
    if (!isCurrentlyRead) {
      try { playSound("success"); } catch (_) {}
    }

    // 2. Zapis tablicy ID w Supabase (dla innych urządzeń)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ read_notes: updatedReads })
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.error("Błąd synchronizacji z chmurą:", err);
    }
  };

  const getExcerpt = (note: any) => {
    if (note.excerpt && typeof note.excerpt === 'string') return note.excerpt;
    const content = note.content;
    if (typeof content === 'string') return content.length > 140 ? content.substring(0, 140) + '...' : content;
    if (Array.isArray(content)) {
      for (const b of content) {
        if (typeof b === 'string') return b.length > 140 ? b.substring(0, 140) + '...' : b;
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

  const getBottomLeftMetadata = (note: any) => {
    if (note.updated_at || note.created_at) {
      try {
        const date = new Date(note.updated_at || note.created_at);
        return `Aktualizacja: ${date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}`;
      } catch (_) {}
    }
    const titleLower = (note.title || "").toLowerCase();
    if (note.type === "lektura") {
      const pewniaki = ["lalka", "wesele", "dziady", "kordian", "potop", "przedwiośnie", "treny", "makbet", "skąpiec", "granica"];
      return pewniaki.some(p => titleLower.includes(p)) ? "🎯 Pewniak maturalny" : "📖 Lektura obowiązkowa";
    }
    if (note.type === "epoka") return "📜 Kontekst epoki";
    return "💡 Pomocnik naukowy";
  };

  const filteredNotes = notes.filter((note) => {
    if (!hasAccess && showOnlyFree && !note.is_free) return false;
    if (readFilter === "read" && !readNotes.includes(note.id)) return false;
    if (readFilter === "unread" && readNotes.includes(note.id)) return false;

    const titleLower = (note.title || "").toLowerCase();
    const contentString = typeof note.content === 'string' ? note.content : JSON.stringify(note.content || "");
    const contentLower = contentString.toLowerCase();
    const chipsString = Array.isArray(note.chips) ? note.chips.join(" ") : "";
    const eraLower = (note.era || "").toLowerCase();
    const typeLower = (note.type || "").toLowerCase();
    const textToSearch = `${titleLower} ${contentLower} ${chipsString.toLowerCase()} ${eraLower} ${typeLower}`;
    
    const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
    let matchesSubject = true;
    
    if (selectedSubject === "Inne (Pomocniki)") {
      matchesSubject = note.type !== "epoka" && note.type !== "lektura";
    } else if (selectedSubject !== "Wszystkie") {
      const keywords = epochKeywords[selectedSubject] || [selectedSubject.toLowerCase()];
      matchesSubject = keywords.some(keyword => textToSearch.includes(keyword));
    }
    return matchesSearch && matchesSubject;
  });

  const displayedNotes = limit ? filteredNotes.slice(0, limit) : filteredNotes;

  return (
    <>
      <CozyGlowCard currentTheme={currentTheme} className="p-4 flex flex-col gap-3.5">
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
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3.5 text-xs text-stone-500 hover:text-stone-200">
              wyczyść
            </button>
          )}
        </div>

        {/* FILTRY STATUSU */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 mt-1 border-t border-stone-800/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mr-1">Status:</span>
            {!hasAccess && (
              <button
                onClick={() => setShowOnlyFree(!showOnlyFree)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  showOnlyFree ? "bg-emerald-950/80 text-emerald-400 border-emerald-500 text-emerald-300" : "border-stone-800/80 bg-stone-900/40 text-stone-400 hover:text-stone-200"
                }`}
              >
                🎁 Pokaż tylko darmowe
              </button>
            )}
            {[
              { id: "all", label: "Wszystkie" },
              { id: "read", label: "✔️ Przeczytane" },
              { id: "unread", label: "⏳ Do nauki" }
            ].map(status => (
              <button
                key={status.id}
                onClick={() => setReadFilter(status.id as any)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                  readFilter === status.id
                    ? `${currentTheme.accentBg || "bg-amber-500/20 text-amber-400"} font-bold border-transparent`
                    : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTRY EPOK */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-800/40">
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mr-1">Kategoria:</span>
          {[
            "Wszystkie", "Antyk", "Średniowiecze", "Renesans", "Barok", "Oświecenie", "Romantyzm", "Pozytywizm", "Młoda Polska", "Dwudziestolecie", "Wojna i okupacja", "Współczesność", "Inne (Pomocniki)"
          ].map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                selectedSubject === subject
                  ? `${currentTheme.accentBg || "bg-amber-500/20 text-amber-400"} font-bold border-transparent`
                  : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </CozyGlowCard>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold font-serif text-stone-100 flex items-center gap-2">
            📂 Baza Notatek
            <span className={`text-[10px] font-sans font-normal px-2 py-0.5 rounded-full bg-stone-900 border ${currentTheme.cardBorder} text-stone-400`}>
              {displayedNotes.length} z {notes.length}
            </span>
          </h3>
          <Link href="/notes" className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors font-medium">
            zobacz wszystkie →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-amber-950/40 p-8 text-center text-sm text-stone-500 bg-[#1f1915]/30">
            ☕ Parzenie herbaty i pobieranie notatek z Supabase...
          </div>
        ) : filteredNotes.length > 0 ? (
          displayedNotes.map((note) => {
            const handleNoteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              if (!hasAccess && !note.is_free) {
                e.preventDefault();
                triggerNotification("🔒 Ta notatka wymaga kupna jednego z pakietów. Odblokuj pełny pakiet na stronie głównej!", "error");
              }
            };

            const getNoteEmoji = (type: string) => type === "epoka" ? "📜" : type === "lektura" ? "📕" : "💡";
            const isRead = readNotes.includes(note.id);

            return (
              <CozyGlowLinkCard
                href={`/notes/${note.slug}`}
                onClick={handleNoteClick}
                target="_blank"
                rel="noopener noreferrer"
                key={note.id}
                currentTheme={currentTheme}
                isFree={!hasAccess && note.is_free}
                className="p-5 hover:scale-[1.01] group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{getNoteEmoji(note.type)}</span>
                      <span className="uppercase tracking-wider text-[#c68a4c]">{note.subject || "Język Polski"}</span>
                      {!hasAccess && note.is_free && (
                        <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[9px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wide animate-pulse">
                          🎁 Darmowa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        ⏱️ {note.read_time || note.readTime || (Math.max(2, Math.round((String(note.content || "")).split(/\s+/).length / 150)) + " min")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] border ${
                        note.type === "epoka" ? "bg-purple-950/40 border-purple-900/50 text-purple-400" 
                        : note.type === "lektura" ? "bg-amber-950/40 border-amber-900/50 text-amber-400"
                        : "bg-blue-950/40 border-blue-900/50 text-blue-300"
                      }`}>
                        {note.type === "epoka" ? "Epoka" : note.type === "lektura" ? "Lektura" : "Pomocnik"}
                      </span>
                      {note.difficulty && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${
                          ["łatwy", "latwy", "easy"].includes(note.difficulty.toLowerCase()) ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400"
                            : ["średni", "sredni", "medium"].includes(note.difficulty.toLowerCase()) ? "bg-orange-950/40 border-orange-900/50 text-orange-400"
                            : "bg-red-950/40 border-red-900/50 text-red-400"
                        }`}>
                          {note.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="text-base font-bold text-stone-100 font-serif mt-3 tracking-tight group-hover:text-amber-200 transition-colors w-full text-left">
                    {note.title} {!hasAccess && !note.is_free && "🔒"}
                  </h4>
                  
                  <p className="text-xs text-stone-400/90 leading-relaxed mt-2 line-clamp-3 w-full text-left">
                    {getExcerpt(note)}
                  </p>
                </div>
                
                {/* PRZYCISK PRZECZYTANO */}
                <div className="border-t border-stone-800/40 mt-4 pt-3 flex flex-col gap-3 w-full">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 w-full">
                    <span>{getBottomLeftMetadata(note)}</span>
                    <span className={`text-[#c68a4c] group-hover:text-amber-400 font-medium flex items-center gap-1 transition-colors`}>
                      {hasAccess || note.is_free ? "Otwórz notatkę 📚" : "Odblokuj notatkę 🔒"}
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => toggleReadNote(note.id, e)}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      isRead
                        ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/40 shadow-inner"
                        : "bg-stone-900/30 border-stone-800/60 text-stone-500 hover:bg-stone-800/60 hover:text-stone-300"
                    }`}
                  >
                    {isRead ? "✔️ Przeczytane" : "Oznacz jako przeczytane"}
                  </button>
                </div>
              </CozyGlowLinkCard>
            );
          })
        ) : (
          <div className={`rounded-2xl border border-dashed border-stone-800 p-8 text-center text-sm text-stone-500`}>
            😴 Brak notatek spełniających wybrane kryteria. Spróbuj zmienić słowo kluczowe lub kategorię.
          </div>
        )}
      </div>
    </>
  );
};