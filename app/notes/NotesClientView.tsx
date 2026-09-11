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
  const [selectedType, setSelectedType] = useState<"all" | "epoka" | "lektura" | "inne">("all");
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [readNotes, setReadNotes] = useState<number[]>([]);

  const [cozyNotification, setCozyNotification] = useState<{
    message: string; type: "success" | "error" | "info";
  } | null>(null);

  const triggerNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setCozyNotification({ message, type });
    if (type === "success") playSound("success");
    else if (type === "error") playSound("error");
    else playSound("click");
    setTimeout(() => setCozyNotification(null), 4500);
  };

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
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, expires_at')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
          const isStatusActive = activeStatuses.includes(profile.subscription_status);
          const isExpired = profile.expires_at ? new Date().getTime() > new Date(profile.expires_at).getTime() : false;
          if (isStatusActive && !isExpired) setHasAccess(true);
        }
      }
    }
    checkUser();
  }, []);

  const toggleReadNote = (noteId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyRead = readNotes.includes(noteId);
    const updatedReads = isCurrentlyRead
      ? readNotes.filter((id) => id !== noteId)
      : [...readNotes, noteId];

    setReadNotes(updatedReads);
    localStorage.setItem("read_notes", JSON.stringify(updatedReads));
    if (!isCurrentlyRead) playSound("success");
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

  const filteredNotes = notes.filter((note) => {
    if (!hasAccess && showOnlyFree && !note.is_free) return false;
    if (readFilter === "read" && !readNotes.includes(note.id)) return false;
    if (readFilter === "unread" && readNotes.includes(note.id)) return false;

    if (selectedEra !== "Wszystkie") {
      const eraMatch = note.era?.toLowerCase() === selectedEra.toLowerCase();
      const specialMatch = 
        (selectedEra === "Dwudziestolecie" && note.era?.toLowerCase().includes("międzywojenne")) ||
        (selectedEra === "Współczesność" && note.era?.toLowerCase().includes("współczesność"));
      if (!eraMatch && !specialMatch) return false;
    }
    if (selectedType !== "all") {
      if (selectedType === "inne") {
        if (note.type === "epoka" || note.type === "lektura") return false;
      } else if (note.type !== selectedType) return false;
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

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      
      {/* HEADER */}
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
          <div className={`flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all duration-300 select-none shadow-md`}>
            <button type="button" onClick={handlePrevTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl cursor-pointer">
              ⏮️
            </button>
            <button onClick={toggleLofi} className={`text-xs px-3 py-1 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} font-semibold cursor-pointer`}>
              {lofiActive ? "Pauza ⏸️" : "Włącz Lofi 🎧"}
            </button>
            <button type="button" onClick={handleNextTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl cursor-pointer">
              ⏭️
            </button>
          </div>
        </div>
      </header>

      {/* GŁÓWNY WIDOK */}
      <main className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-6 flex-1 select-none animate-slide-in">
        <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} shadow-md flex flex-col gap-4`}>
          
          {/* FILTRY */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-stone-800/40 pb-3 mb-1">
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
                  className={`text-[10px] px-3.5 py-1.5 rounded-xl border font-bold uppercase transition-all cursor-pointer ${readFilter === status.id ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "border-stone-800/60 bg-stone-950/40 text-stone-400"}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {eras.map((era) => (
              <button key={era} onClick={() => setSelectedEra(era)} className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${selectedEra === era ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold" : "border-stone-800/60 bg-stone-950/40 text-stone-400"}`}>{era}</button>
            ))}
          </div>
          
          <input 
            type="text" 
            placeholder="Wyszukaj lekturę, motyw lub epokę..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl py-3 px-5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60" 
          />
        </div>

        {/* SIATKA KAFELKÓW ZE 100% BEZPOŚREDNIMI LINKAMI HTML */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => {
            const isRead = readNotes.includes(note.id);

            return (
              <CozyGlowCard key={note.id} currentTheme={currentTheme} className="p-6 flex flex-col justify-between gap-4 shadow-lg border border-stone-800/60 bg-[#161210]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-amber-500 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      📍 {note.era || "Pomocnik"}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-stone-400 px-2 py-0.5 rounded border border-stone-800">
                      ⏱️ {note.read_time || 15} min
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-stone-100 font-serif leading-snug">
                    {note.title}
                  </h2>
                  <p className="text-xs text-stone-400 leading-relaxed font-sans line-clamp-3">
                    {getNoteDescription(note)}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-800/40">
                  <button
                    onClick={(e) => toggleReadNote(note.id, e)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                      isRead
                        ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400"
                        : "bg-stone-900/40 border-stone-800/60 text-stone-400"
                    }`}
                  >
                    {isRead ? "✔️ Przeczytane" : "✔️ Zaznacz"}
                  </button>

                  {/* TO JEST KLUCZOWY LINK <a> W KODZIE SERWERA */}
                  <a
                    href={`/notes/${note.slug}`}
                    className="flex-[2] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md text-center"
                  >
                    Otwórz notatkę 📖
                  </a>
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