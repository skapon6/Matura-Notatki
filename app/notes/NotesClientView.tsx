// app/notes/NotesClientView.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { playSound } from "../lib/sounds";
import { useLofi } from "../context/LofiContext";
import { getThemeClasses, CozyTheme } from "../lib/theme";
import { CozyNotification } from "../components/CozyNotification";
import { CozyGlowCard } from "../components/CozyGlowCard";

export default function NotesClientView({ initialNotes }: { initialNotes: any[] }) {
  const router = useRouter();
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");
  const currentTheme = getThemeClasses(cozyTheme);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCozyTheme(savedTheme);
    }
  }, []);

  const {
    lofiActive,
    currentTrackIndex,
    lofiVolume,
    lofiTracks,
    toggleLofi,
    handleNextTrack,
    handlePrevTrack,
    handleVolumeChange
  } = useLofi();

  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [notes] = useState<any[]>(initialNotes);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEra, setSelectedEra] = useState("Wszystkie");
  // 🎯 Typ notatki: lektura / epoka / pomocnik
  const [selectedType, setSelectedType] = useState<"all" | "lektura" | "epoka" | "pomocnik">("all");
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [readNotes, setReadNotes] = useState<number[]>([]);

  const [cozyNotification, setCozyNotification] = useState<{
    message: string; type: "success" | "error" | "info";
  } | null>(null);

  const eras = [
    "Wszystkie", "Antyk", "Średniowiecze", "Renesans", "Barok", "Oświecenie", "Romantyzm", "Pozytywizm", "Młoda Polska", "Dwudziestolecie", "Wojna i Okupacja", "Współczesność",
  ];

  useEffect(() => {
    async function checkUser() {
      const stored = localStorage.getItem("read_notes");
      if (stored) {
        try { setReadNotes(JSON.parse(stored)); } catch (e) {}
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_status, expires_at, read_notes')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
          const isStatusActive = activeStatuses.includes(profileData.subscription_status);
          const isExpired = profileData.expires_at ? new Date().getTime() > new Date(profileData.expires_at).getTime() : false;
          if (isStatusActive && !isExpired) setHasAccess(true);

          if (profileData.read_notes && Array.isArray(profileData.read_notes)) {
            setReadNotes(profileData.read_notes);
            localStorage.setItem("read_notes", JSON.stringify(profileData.read_notes));
          }
        }
      }
    }
    checkUser();
  }, []);

  const toggleReadNote = async (noteId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyRead = readNotes.includes(noteId);
    const updatedReads = isCurrentlyRead
      ? readNotes.filter((id) => id !== noteId)
      : [...readNotes, noteId];

    setReadNotes(updatedReads);
    localStorage.setItem("read_notes", JSON.stringify(updatedReads));
    if (!isCurrentlyRead) {
      try { playSound("success"); } catch (_) {}
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ read_notes: updatedReads })
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.error("Błąd zapisu:", err);
    }
  };

  const getNoteDescription = (note: any) => {
    const content = note.content;
    if (!content) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const first = content[0];
      if (typeof first === "string") return first;
      if (first && (first.content || first.text)) return first.content || first.text;
    }
    return "";
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

  // Filtrowanie
  const filteredNotes = notes.filter((note) => {
    if (!hasAccess && showOnlyFree && !note.is_free) return false;
    if (readFilter === "read" && !readNotes.includes(note.id)) return false;
    if (readFilter === "unread" && readNotes.includes(note.id)) return false;

    // Filtrowanie po typie (lektura / epoka / pomocnik)
    if (selectedType !== "all") {
      if (selectedType === "pomocnik") {
        if (note.type === "epoka" || note.type === "lektura") return false;
      } else if (note.type !== selectedType) {
        return false;
      }
    }

    if (selectedEra !== "Wszystkie") {
      const eraMatch = note.era?.toLowerCase() === selectedEra.toLowerCase();
      const specialMatch = 
        (selectedEra === "Dwudziestolecie" && note.era?.toLowerCase().includes("międzywojenne")) ||
        (selectedEra === "Współczesność" && note.era?.toLowerCase().includes("współczesność"));
      if (!eraMatch && !specialMatch) return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = note.title?.toLowerCase().includes(query);
      const eraMatch = note.era?.toLowerCase().includes(query);
      const chipsMatch = Array.isArray(note.chips) && note.chips.some((chip: string) => chip.toLowerCase().includes(query));
      return titleMatch || eraMatch || chipsMatch;
    }
    return true;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (!hasAccess) {
      if (a.is_free && !b.is_free) return -1;
      if (!a.is_free && b.is_free) return 1;
    }
    return 0;
  });

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
          <button onClick={() => { playSound("click"); router.push("/"); }} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs font-medium ${currentTheme.subText} hover:text-stone-100 cursor-pointer`}>
            ← Wróć do kącika
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm font-serif">
              Wszystkie Notatki Maturalne ({notes.length})
            </h1>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 border-stone-800/40 pt-3 md:pt-0">
          <div className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all duration-300 select-none shadow-md hover:border-amber-500/20 hover:bg-stone-900/30 hover:shadow-lg hover:shadow-amber-500/5`}>
            
            <button onClick={handlePrevTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors cursor-pointer" title="Poprzedni utwór">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            
            <button onClick={toggleLofi} className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all font-semibold text-xs active:scale-95 cursor-pointer">
              {lofiActive ? (
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-[10px] sm:text-[11px] tracking-wide truncate max-w-[80px] md:max-w-[120px] xl:max-w-[150px]">
                {lofiTracks[currentTrackIndex]?.name || "Cozy Lofi 1"}
              </span>
            </button>
            
            <button onClick={handleNextTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors cursor-pointer" title="Następny utwór">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
              </svg>
            </button>
            
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 ml-1 border-l border-stone-800/80 pl-2 sm:pl-3">
              <svg className="w-4 h-4 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 12H3a1 1 0 01-1-1V9a1 1 0 011-1h1.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={lofiVolume} 
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-16 md:w-20 h-1 bg-stone-850 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                style={{ WebkitAppearance: "none" }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* GŁÓWNY PANEL FILTROWANIA */}
      <main className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-6 flex-1 select-none animate-slide-in">
        <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} shadow-md flex flex-col gap-3.5`}>
          
          {/* 🎯 1. FILTR STATUSU */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-stone-800/40 pb-3">
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider pl-1">Status:</span>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: "all" as const, label: "Wszystkie" },
                { id: "read" as const, label: "✔️ Przeczytane" },
                { id: "unread" as const, label: "⏳ Do nauki" },
              ].map((status) => (
                <button 
                  key={status.id} 
                  onClick={() => { playSound("click"); setReadFilter(status.id); }} 
                  className={`text-[10px] px-3.5 py-1.5 rounded-xl border font-bold uppercase transition-all cursor-pointer ${readFilter === status.id ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold" : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* 🎯 2. NOWY FILTR TYPU (Lektury / Epoki / Pomocniki) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-stone-800/40 pb-3">
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider pl-1">Typ materiału:</span>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: "all" as const, label: "Wszystkie typy" },
                { id: "lektura" as const, label: "📖 Lektury" },
                { id: "epoka" as const, label: "📜 Epoki" },
                { id: "pomocnik" as const, label: "💡 Pomocniki" },
              ].map((type) => (
                <button 
                  key={type.id} 
                  onClick={() => { playSound("click"); setSelectedType(type.id); }} 
                  className={`text-[10px] px-3.5 py-1.5 rounded-xl border font-bold uppercase transition-all cursor-pointer ${selectedType === type.id ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold" : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* 🎯 3. FILTR EPOK */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {eras.map((era) => (
              <button key={era} onClick={() => { playSound("click"); setSelectedEra(era); }} className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${selectedEra === era ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold" : "border-stone-800/60 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"}`}>{era}</button>
            ))}
          </div>
          
          {/* WYSZUKIWARKA */}
          <input 
            type="text" 
            placeholder="Wyszukaj lekturę, motyw lub epokę..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl py-3 px-5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60 mt-1" 
          />
        </div>

        {/* SIATKA KAFELKÓW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedNotes.map((note) => {
            const isLocked = !note.is_free && !hasAccess;
            const isFreeNote = !hasAccess && note.is_free;
            const isRead = readNotes.includes(note.id);

            const cardBorderClass = isFreeNote ? "border-emerald-700/60 shadow-lg shadow-emerald-950/30" : "border-stone-800/60";
            const cardBgClass = isFreeNote ? "bg-emerald-950/20" : "bg-[#161210]";

            return (
              <CozyGlowCard key={note.id} currentTheme={currentTheme} className={`p-6 flex flex-col justify-between gap-4 shadow-lg border ${cardBorderClass} ${cardBgClass} hover:scale-[1.01] transition-all duration-300`}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded border ${
                        isFreeNote ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        📍 {note.era || "Pomocnik"}
                      </span>
                      <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded border ${
                        note.type === "epoka" ? "bg-purple-950/40 border-purple-900/50 text-purple-400" 
                        : note.type === "lektura" ? "bg-amber-950/40 border-amber-900/50 text-amber-400" 
                        : "bg-blue-950/40 border-blue-900/50 text-blue-300"
                      }`}>
                        {note.type === "epoka" ? "📜 Epoka" : note.type === "lektura" ? "📖 Lektura" : "💡 Pomocnik"}
                      </span>
                      {isFreeNote && (
                        <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-md tracking-wider animate-pulse shadow-sm shadow-emerald-900/50">
                          🎁 DARMOWA PRÓBKA
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-stone-400 px-2 py-0.5 rounded border border-stone-800">
                      ⏱️ {note.read_time || 15} min
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-stone-100 font-serif leading-snug">
                    {note.title}
                  </h2>
                  <p className="text-xs text-stone-400 leading-relaxed font-sans line-clamp-3">{getNoteDescription(note)}</p>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  {Array.isArray(note.chips) && (
                    <div className="flex flex-wrap gap-1.5">
                      {note.chips.map((chip: string) => (
                        <span key={chip} className="text-xs text-stone-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-900 transition-colors hover:text-stone-200">#{chip}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-stone-500 font-sans px-1">
                    <span>{getBottomLeftMetadata(note)}</span>
                    <span className={`font-semibold ${isFreeNote ? 'text-emerald-400' : 'text-stone-500'}`}>
                      {isFreeNote ? "Pełny dostęp za free ✨" : `⏱️ ${note.read_time || 15} min`}
                    </span>
                  </div>

                  {/* PRZYCISKI AKCJI */}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={(e) => toggleReadNote(note.id, e)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 ${
                        isRead
                          ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/40 shadow-inner"
                          : "bg-stone-900/40 border-stone-800/60 text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"
                      }`}
                    >
                      {isRead ? "✔️ Przeczytane" : "✔️ Zaznacz"}
                    </button>

                    <a
                      href={`/notes/${note.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-[2] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md text-center ${
                        isFreeNote
                          ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold shadow-emerald-950/50"
                          : isLocked 
                            ? "bg-stone-900 border border-stone-800 text-amber-400 hover:bg-stone-850 hover:text-amber-300" 
                            : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                      }`}
                    >
                      {isFreeNote ? "Otwórz za darmo 🎁" : isLocked ? "Zobacz podgląd 🔒" : "Otwórz notatkę 📖"}
                    </a>
                  </div>
                </div>
              </CozyGlowCard>
            );
          })}
        </div>
      </main>

      <CozyNotification notification={cozyNotification} onClose={() => setCozyNotification(null)} />
    </div>
  );
}