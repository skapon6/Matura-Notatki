// app/notes/page.tsx
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

export default function WszystkieNotatkiPage() {
  const router = useRouter();

  // 1. Zostawiamy tylko jeden główny stan dla motywu
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");

  // 2. Wyliczamy klasy CSS dynamicznie
  const currentTheme = getThemeClasses(cozyTheme);

  // 3. Wczytujemy zapisany motyw z pamięci przy wejściu na stronę
  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCozyTheme(savedTheme);
    }
  }, []);

  // Globalny odtwarzacz Lo-Fi
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
  const [profile, setProfile] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stany wyszukiwania i filtrowania epok oraz typu (Wszystkie | Same Epoki | Same Lektury | Inne)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEra, setSelectedEra] = useState("Wszystkie");
  const [selectedType, setSelectedType] = useState<"all" | "epoka" | "lektura" | "inne">("all");

  // System przytulnych powiadomień
  const [cozyNotification, setCozyNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const triggerNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setCozyNotification({ message, type });
    if (type === "success") playSound("success");
    else if (type === "error") playSound("error");
    else playSound("click");

    setTimeout(() => setCozyNotification(null), 4500);
  };

  const eras = [
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
    "Wojna i Okupacja",
    "Współczesność",
  ];

  // Monitorowanie sesji, profilu i wczytywanie notatek z bazy
  useEffect(() => {
    async function fetchUserDataAndNotes() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userId = null;
        if (session?.user) {
          setUser(session.user);
          userId = session.user.id;
        }

        if (userId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('subscription_status, expires_at')
            .eq('id', userId)
            .single();
            
          if (profileData) {
            setProfile(profileData);
            const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
            const isStatusActive = activeStatuses.includes(profileData.subscription_status);
            
            let isExpired = false;
            if (profileData.expires_at) {
              const expirationTime = new Date(profileData.expires_at).getTime();
              const currentTime = new Date().getTime();
              isExpired = currentTime > expirationTime;
            }
            
            if (isStatusActive && !isExpired) {
              setHasAccess(true);
            }
          }
        }

        // Pobranie wszystkich notatek z Twojej tabeli public.notes
        const { data: notesData, error: notesError } = await supabase
          .from("notes")
          .select("*")
          .order("id", { ascending: true });

        if (!notesError && notesData) {
          setNotes(notesData);
        }
      } catch (err) {
        console.error("Błąd pobierania danych:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserDataAndNotes();
  }, []);

  // Inteligentne wyliczanie metadanych na dole po lewej stronie karty
  const getBottomLeftMetadata = (note: any) => {
    // 1. Jeśli z bazy danych idzie prawdziwa data, sformatuj ją ładnie
    if (note.updated_at || note.created_at) {
      try {
        const date = new Date(note.updated_at || note.created_at);
        return `Aktualizacja: ${date.toLocaleDateString("pl-PL", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })}`;
      } catch (_) {}
    }

    // 2. Jeśli brak daty, wygenerujmy dynamiczną, angażującą wskazówkę
    const titleLower = (note.title || "").toLowerCase();
    
    if (note.type === "lektura") {
      const pewniaki = ["lalka", "wesele", "dziady", "kordian", "potop", "przedwiośnie", "treny", "makbet", "skąpiec", "granica"];
      const isPewniak = pewniaki.some(p => titleLower.includes(p));
      return isPewniak ? "🎯 Pewniak maturalny" : "📖 Lektura obowiązkowa";
    }
    
    if (note.type === "epoka") {
      return "⏳ Kontekst epoki";
    }
    
    return "💡 Pomocnik naukowy";
  };

  // Filtrowanie notatek na podstawie wyszukiwarki, kafelków epok oraz typu
  const filteredNotes = notes.filter((note) => {
    // 1. Filtrowanie po wybranej epoce
    if (selectedEra !== "Wszystkie") {
      const eraMatch = note.era?.toLowerCase() === selectedEra.toLowerCase();
      const specialMatch = 
        (selectedEra === "Dwudziestolecie" && note.era?.toLowerCase().includes("międzywojenne")) ||
        (selectedEra === "Współczesność" && note.era?.toLowerCase().includes("współczesność"));
      
      if (!eraMatch && !specialMatch) return false;
    }

    // 2. Filtrowanie po rodzaju notatki (lektura vs epoka vs pomocniki)
    if (selectedType !== "all") {
      if (selectedType === "inne") {
        if (note.type === "epoka" || note.type === "lektura") {
          return false;
        }
      } else if (note.type !== selectedType) {
        return false;
      }
    }

    // 3. Filtrowanie po wpisanej frazie
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = note.title?.toLowerCase().includes(query);
      const eraMatch = note.era?.toLowerCase().includes(query);
      const chipsMatch = Array.isArray(note.chips) && note.chips.some((chip: string) => chip.toLowerCase().includes(query));
      return titleMatch || eraMatch || chipsMatch;
    }

    return true;
  });

  // BEZPIECZNY NASŁUCHIWAĆ KLIKNIĘĆ
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement;
        if (!target) return;

        const isInteractive = 
          target.closest("button") || 
          target.closest("a") || 
          target.closest("[role='button']") ||
          (target.style && window.getComputedStyle(target).cursor === "pointer");

        if (isInteractive) {
          playSound("click");
        }
      } catch (err) {
        // Ignorujemy cicho błędy
      }
    };

    window.addEventListener("click", handleGlobalClick);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // Obsługa kliknięcia w notatkę (zabezpieczenie Premium)
  const handleOpenNote = (note: any) => {
    if (!user) {
      triggerNotification("🔑 Zaloguj się na stronie głównej, aby czytać notatki!", "info");
      return;
    }
    
    if (note.is_free || hasAccess) {
      playSound("success");
      router.push(`/notes/${note.slug}`);
    } else {
      triggerNotification(
        "🔒 Ta epoka wymaga dostępu Premium. Odblokuj pełny pakiet na stronie głównej!", 
        "error"
      );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          0% { transform: translateY(30px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      {/* HEADER SECTION */}
      <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
          <button
            onClick={() => {
              playSound("click"); 
              router.push("/");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs font-medium ${currentTheme.subText} hover:text-stone-100`}
          >
            ← Wróć do kącika
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Wszystkie Notatki Maturalne
            </h1>
          </div>
        </div>

        {/* Globalny Odtwarzacz Lofi */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 border-stone-800/40 pt-3 md:pt-0">
          <div className={`flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all duration-300 select-none shadow-md hover:border-amber-500/20 hover:bg-stone-900/30 hover:shadow-lg hover:shadow-amber-500/5`}>
            <button type="button" onClick={handlePrevTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            <button type="button" onClick={toggleLofi} className="flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all font-semibold text-xs active:scale-95">
              {lofiActive ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="hidden md:inline text-[10px] sm:text-xs tracking-wide">
                {lofiTracks[currentTrackIndex].name}
              </span>
            </button>
            <button type="button" onClick={handleNextTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 ml-1 border-l border-stone-800/80 pl-2 sm:pl-3">
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

      {/* RENDEROWANIE ZAWARTOŚCI */}
      <main className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-6 flex-1 select-none animate-slide-in">
        
        {/* PANEL WYSZUKIWANIA I FILTROWANIA */}
        <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} shadow-md flex flex-col gap-4`}>
          
          {/* Wybór typu: Wszystkie | Epoki | Lektury | Inne */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-stone-800/40 pb-3 mb-1">
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider pl-1 select-none">
              Rodzaj notatek:
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: "all" as const, label: "Wszystkie" },
                { id: "epoka" as const, label: "🏛️ Same Epoki" },
                { id: "lektura" as const, label: "📖 Same Lektury" },
                { id: "inne" as const, label: "📝 Pomocniki / Inne" },
              ].map((typeItem) => (
                <button
                  key={typeItem.id}
                  onClick={() => {
                    playSound("click");
                    setSelectedType(typeItem.id);
                  }}
                  className={`text-[10px] px-3.5 py-1.5 rounded-xl border font-bold uppercase transition-all ${
                    selectedType === typeItem.id
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-stone-950/20 text-stone-500 border-transparent hover:text-stone-300"
                  }`}
                >
                  {typeItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Wyszukiwarki */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Wyszukaj lekturę, motyw lub epokę..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl py-3 px-5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
            />
            <span className="absolute right-5 top-3.5 text-stone-500 text-sm">🔍</span>
          </div>

          {/* Kafelki Epok */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-800">
            {eras.map((era) => (
              <button
                key={era}
                onClick={() => setSelectedEra(era)}
                className={`text-xs px-3.5 py-2 rounded-xl font-semibold border whitespace-nowrap transition-all ${
                  selectedEra === era
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-stone-950/20 text-stone-500 border-stone-800/40 hover:text-stone-300"
                }`}
              >
                {era}
              </button>
            ))}
          </div>

        </div>

        {/* SIATKA KART Z NOTATKAMI */}
        {loading ? (
          <div className="text-center py-16 text-stone-500 text-sm">
            Wczytywanie pełnej bazy notatek...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-stone-800 rounded-3xl text-stone-500">
            <span className="text-3xl block mb-2">📚</span>
            <p className="text-sm font-semibold">Nie znaleźliśmy notatek spełniających wybrane kryteria.</p>
            <p className="text-xs text-stone-600 mt-1">Spróbuj zmienić wpisane słowo kluczowe, wybrany rodzaj lub epokę.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => {
              const isLocked = !note.is_free && !hasAccess;
              
              return (
                <CozyGlowCard 
                  key={note.id}
                  currentTheme={currentTheme}
                  className="p-6 flex flex-col justify-between gap-4 shadow-lg"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase tracking-widest text-amber-500 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          📍 {note.era || "Pomocnik"}
                        </span>
                        
                        {/* Dynamiczny badge typu merytorycznego z bazy danych */}
                        <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded border ${
                          note.type === "epoka" 
                            ? "bg-purple-950/40 border-purple-900/50 text-purple-400" 
                            : note.type === "lektura"
                              ? "bg-amber-950/40 border-amber-900/50 text-amber-400"
                              : "bg-blue-950/40 border-blue-900/50 text-blue-300"
                        }`}>
                          {note.type === "epoka" ? "🏛️ Epoka" : note.type === "lektura" ? "📖 Lektura" : "📝 Pomocnik"}
                        </span>
                      </div>
                      
                      {/* Trudność notatki */}
                      <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded border ${
                        note.difficulty === "Trudny" 
                          ? "bg-red-950/50 border-red-900/40 text-red-400 shrink-0"
                          : "bg-emerald-950/50 border-emerald-900/40 text-emerald-400 shrink-0"
                      }`}>
                        {note.difficulty || "Średni"}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-stone-100 font-serif leading-snug">
                      {note.title}
                    </h2>

                    {/* Poprawiony opis pobierany bezpośrednio z bazy danych */}
                    <p className="text-xs text-stone-400 leading-relaxed font-sans line-clamp-3">
                      {note.content}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 mt-2">
                   {/* Lista tagów (chips) */}
                    {Array.isArray(note.chips) && (
                      <div className="flex flex-wrap gap-1.5">
                        {note.chips.map((chip: string) => (
                          <span 
                            key={chip}
                            className="text-xs text-stone-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-900 transition-colors hover:text-stone-200"
                          >
                            #{chip}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* DYNAMICZNY ZNACZNIK DATY / MATURA HINT ORAZ CZAS CZYTANIA */}
                    <div className="flex items-center justify-between text-[11px] text-stone-500 font-sans px-1">
                      <span>{getBottomLeftMetadata(note)}</span>
                      <span>⏱️ {note.read_time || note.readTime || (Math.max(2, Math.round((String(note.content || "")).split(/\s+/).length / 150)) + " min")}</span>
                    </div>

                    {/* Przycisk otwierania (z kłódką dla zablokowanych lektur) */}
                   {isLocked ? (
                      <button
                        onClick={() => handleOpenNote(note)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-stone-950 border border-stone-800 text-stone-500 hover:bg-stone-900/40"
                      >
                        <span>🔒</span> Zablokowane (Premium)
                      </button>
                    ) : (
                      <a
                        href={`/notes/${note.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md"
                      >
                        Otwórz notatkę 📖
                      </a>
                    )}
                  </div>
                </CozyGlowCard>
              );
            })}
          </div>
        )}
      </main>

      {/* SYSTEM POWIADOMIEŃ */}
      <CozyNotification 
        notification={cozyNotification} 
        onClose={() => setCozyNotification(null)} 
      />
    </div>
  );
}