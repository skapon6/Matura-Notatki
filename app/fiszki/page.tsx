// app/fiszki/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { playSound } from "../lib/sounds";
import { useLofi } from "../context/LofiContext";
import { getThemeClasses, CozyTheme } from "../lib/theme";

// Pomocnicza funkcja do upiększania slugów notatek na czytelne tytuły lektur
const prettifySlug = (slug: string) => {
  if (!slug) return "";
  const preMapped: Record<string, string> = {
    "lalka": "Lalka",
    "wesele": "Wesele",
    "kordian": "Kordian",
    "pan-tadeusz": "Pan Tadeusz",
    "dziady-cz-iii": "Dziady cz. III",
    "makbet": "Makbet",
    "skapiec": "Skąpiec",
    "dzuma": "Dżuma",
    "rok-1984": "Rok 1984"
  };
  if (preMapped[slug.toLowerCase()]) return preMapped[slug.toLowerCase()];
  return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

export default function FiszkiPage() {
  const router = useRouter();
  
  // 1. Jeden główny stan dla motywu
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");
  
  // 2. Wyliczamy klasy CSS dynamicznie (bez osobnego stanu!)
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
  const [loading, setLoading] = useState(true);
  
  // Dynamiczna lista fiszek pobrana z bazy Supabase
  const [flashcards, setFlashcards] = useState<any[]>([]);
  
  // Stan przechowywania postępów z bazy danych
  const [progress, setProgress] = useState<Record<string, "mastered" | "learning">>({});
  
  // Filtrowanie fiszek po stanie nauki: 'all' (gra) | 'learning' (lista do nauki) | 'mastered' (lista opanowane)
  const [filter, setFilter] = useState<"all" | "learning" | "mastered">("all");
  
  // Dynamiczne filtry kategorii (np. 'Wszystkie', 'Pozytywizm', 'Lalka')
  const [selectedCategory, setSelectedCategory] = useState<string>("Wszystkie");
  const [availableCategories, setAvailableCategories] = useState<string[]>(["Wszystkie"]);
  
  // Stany dla rozwijanego, szukanego dropdownu (Combobox)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Kierunek animacji Swipe ('left' lub 'right')
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  // Monitorowanie sesji oraz pobieranie danych + ZABEZPIECZENIE PREMIUM
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 1. Sprawdzamy sesję użytkownika
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push("/"); // Brak sesji -> powrót na główną
          return;
        }

        // 2. Pobieramy status premium z bazy danych
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_status, expires_at")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profileData) {
          router.push("/");
          return;
        }

        const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
        const isStatusActive = activeStatuses.includes(profileData.subscription_status);
        
        let isExpired = false;
        if (profileData.expires_at) {
          const expirationTime = new Date(profileData.expires_at).getTime();
          const currentTime = new Date().getTime();
          isExpired = currentTime > expirationTime;
        }

        const hasPremiumAccess = isStatusActive && !isExpired;

        // 3. Sprawdzamy, czy użytkownik ma uprawnienia Premium
        if (!hasPremiumAccess) {
          router.push("/"); // Brak premium -> powrót na główną [1]
          return;
        }

        setUser(session.user);

        // 4. Pobieramy fiszki
        const { data: cardsData, error: cardsError } = await supabase
          .from("flashcards")
          .select("*")
          .order("id", { ascending: true });

        if (!cardsError && cardsData) {
          const mappedCards = cardsData.map((row) => ({
            id: row.id.toString(),
            category: row.era || "Inne",
            note_slug: row.note_slug || null,
            note_title: row.note_slug ? prettifySlug(row.note_slug) : null,
            question: row.front,
            answer: row.back,
          }));
          setFlashcards(mappedCards);

          // Ekstrakcja unikalnych Epok (era) oraz Lektur (note_slug)
          const eras = Array.from(new Set(mappedCards.map(c => c.category).filter(Boolean)));
          const lectures = Array.from(new Set(mappedCards.map(c => c.note_title).filter(Boolean)));
          
          // Łączymy w jedną listę kategorii filtrów
          setAvailableCategories(["Wszystkie", ...eras.sort(), ...lectures.sort()]);
        }

        // 5. Pobieramy postępy fiszek
        const { data: progressData, error: progressError } = await supabase
          .from("flashcard_progress")
          .select("flashcard_id, status")
          .eq("user_id", session.user.id);
            
        if (!progressError && progressData) {
          const progressMap: Record<string, "mastered" | "learning"> = {};
          progressData.forEach((row) => {
            progressMap[row.flashcard_id] = row.status as "mastered" | "learning";
          });
          setProgress(progressMap);
        }
      } catch (err) {
        console.error("Błąd weryfikacji i pobierania danych:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [router]);

  // Filtrowanie fiszek na podstawie wybranego statusu nauki ORAZ wybranej lektury/epoki
  const filteredCards = flashcards.filter((card) => {
    // A. Filtrowanie po stanie nauki
    const cardStatus = progress[card.id];
    if (filter === "mastered" && cardStatus !== "mastered") return false;
    if (filter === "learning" && cardStatus === "mastered") return false;

    // B. Filtrowanie po wybranej epoce lub lekturze
    if (selectedCategory !== "Wszystkie") {
      const matchesEra = card.category === selectedCategory;
      const matchesLecture = card.note_title === selectedCategory;
      if (!matchesEra && !matchesLecture) return false;
    }

    return true; 
  });

  // Reset indeksu przy zmianie jakichkolwiek filtrów
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSwipeDirection(null);
  }, [filter, selectedCategory]);

  const safeCurrentIndex = currentIndex >= filteredCards.length ? 0 : currentIndex;
  const activeCard = filteredCards[safeCurrentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    if (filteredCards.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (filteredCards.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    }
  };

  // OBSŁUGA DLA TRYBU GRY (Z animacją swipe i dźwiękiem)
  const handleMarkStatusGame = async (cardId: string, status: "mastered" | "learning") => {
    if (!user || !cardId) return;

    if (status === "mastered") {
      setSwipeDirection("right");
      playSound("success");
    } else {
      setSwipeDirection("left");
      playSound("error");
    }

    setProgress((prev) => ({
      ...prev,
      [cardId]: status,
    }));

    try {
      await supabase
        .from("flashcard_progress")
        .upsert({
          user_id: user.id,
          flashcard_id: cardId,
          status: status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "user_id,flashcard_id"
        });
    } catch (err) {
      console.error("Błąd zapisu postępu:", err);
    }

    setTimeout(() => {
      setIsFlipped(false);
      setSwipeDirection(null);
      if (filteredCards.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
      }
    }, 250);
  };

  // OBSŁUGA DLA TRYBU LISTY
  const handleMarkStatusList = async (cardId: string, status: "mastered" | "learning") => {
    if (!user || !cardId) return;

    if (status === "mastered") {
      playSound("success");
    } else {
      playSound("error");
    }

    setProgress((prev) => ({
      ...prev,
      [cardId]: status,
    }));

    try {
      await supabase
        .from("flashcard_progress")
        .upsert({
          user_id: user.id,
          flashcard_id: cardId,
          status: status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "user_id,flashcard_id"
        });
    } catch (err) {
      console.error("Błąd zapisu postępu na liście:", err);
    }
  };

  // Liczenie statystyk na podstawie wszystkich fiszek
  const masteredCount = flashcards.filter(card => progress[card.id] === "mastered").length;
  const learningCount = flashcards.length - masteredCount;

  // Filtrowanie kategorii na liście rozwijanej wyszukiwania
  const filteredCategoriesList = availableCategories.filter((cat) =>
    cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">☕</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Weryfikacja dostępu do strefy fiszek...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />

      {/* Tło do zamykania dropdownu po kliknięciu poza niego */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
      )}

      {/* HEADER SECTION */}
      <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
          <button
            onClick={() => router.push("/")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs font-medium ${currentTheme.subText} hover:text-stone-100`}
          >
            ← Wróć do panelu
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Szybkie Fiszki Maturalne
            </h1>
          </div>
        </div>

        {/* Globalny Odtwarzacz Lofi */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 border-stone-800/40 pt-3 md:pt-0">
          <div className={`flex items-center gap-3 sm:gap-4 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all select-none shadow-md`}>
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
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
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
      <main className="max-w-2xl mx-auto w-full p-6 flex flex-col items-center justify-center flex-1">
        
        {/* PANEL FILTROWANIA I STATYSTYK */}
        <div className="w-full flex items-center justify-between mb-4 bg-stone-900/40 border border-stone-800/60 p-2.5 rounded-2xl relative z-20">
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "learning", "mastered"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-[11px] px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  filter === tab
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {tab === "all" && "Wszystkie (Zabawa)"}
                {tab === "learning" && `Do nauki (${learningCount})`}
                {tab === "mastered" && `Opanowane (${masteredCount})`}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider pr-1 select-none">
            Matura 2026
          </div>
        </div>

        {/* DYNAMICZNY FILTR EPOK I LEKTUR - ROZWIJANY COMBOBOX (WYSZUKIWARKA) */}
        <div className="w-full flex flex-col gap-2 mb-6 bg-stone-900/40 border border-stone-800/60 p-4 rounded-2xl relative z-40">
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider pl-1 select-none">
            Filtruj po epoce lub lekturze:
          </span>
          
          <div className="relative">
            {/* Przycisk otwierający dropdown */}
            <button
              onClick={() => {
                playSound("click");
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border border-stone-800 bg-stone-950/60 hover:bg-stone-900 text-stone-200 transition-all text-xs font-semibold`}
            >
              <span className="flex items-center gap-2">
                <span>📖</span> {selectedCategory === "Wszystkie" ? "Wszystkie epoki i lektury" : selectedCategory}
              </span>
              <span className="text-stone-500 text-[10px] select-none">▼ Kliknij, aby zmienić</span>
            </button>

            {/* Rozwijany panel z wyszukiwarką */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-stone-900 border border-stone-800/90 rounded-xl shadow-2xl flex flex-col gap-2 max-h-60 overflow-hidden z-40 animate-slide-in">
                
                {/* Wyszukiwarka tekstowa */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Wpisz szukaną lekturę lub epokę (np. Lalka, Antyk)..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg py-2.5 pl-8 pr-3 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60 transition-all"
                    autoFocus
                  />
                  <svg className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Lista przefiltrowanych kategorii */}
                <div className="flex flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
                  {filteredCategoriesList.length > 0 ? (
                    filteredCategoriesList.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          playSound("click");
                          setSelectedCategory(cat);
                          setCategorySearchQuery("");
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          selectedCategory === cat
                            ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30"
                            : "text-stone-400 hover:bg-stone-950 hover:text-stone-200 border border-transparent"
                        }`}
                      >
                        {cat === "Wszystkie" ? "✨ Wszystkie epoki i lektury" : cat}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-stone-600">
                      Brak wyników dla "{categorySearchQuery}"
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-stone-800 rounded-3xl w-full text-stone-500 select-none">
            <span className="text-3xl block mb-2">⭐</span>
            <p className="text-sm font-semibold">Brak fiszek w tej kategorii.</p>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              {filter === "mastered" 
                ? "Nie oznaczyłeś jeszcze żadnej fiszki z tej grupy jako opanowanej. Kliknij 'Znam' podczas gry!"
                : "Wspaniale! Opanowałeś już wszystkie dostępne fiszki w wybranej kategorii!"}
            </p>
          </div>
        ) : filter === "all" ? (
          
          /* TRYB GRY (DLA KATEGORII 'WSZYSTKIE') */
          <div className="w-full flex flex-col gap-6 select-none animate-slide-in relative z-10">
            
            {/* GŁÓWNA KARTA FISZKI Z SZYBKĄ ANIMACJĄ (75ms) I BŁYSKIEM KOLORU */}
            <div 
              onClick={() => { 
                if (!swipeDirection) {
                  playSound("click"); 
                  setIsFlipped(!isFlipped); 
                }
              }}
              className={`perspective-1000 w-full h-[400px] cursor-pointer transition-all duration-300 ease-out transform ${
                swipeDirection === "left" 
                  ? "translate-x-[-150%] rotate-[-15deg] opacity-0" 
                  : swipeDirection === "right" 
                    ? "translate-x-[150%] rotate-[15deg] opacity-0" 
                    : "translate-x-0 rotate-0 opacity-100"
              }`}
            >
              <div className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* STRONA A: PYTANIE */}
                <div className={`absolute inset-0 w-full h-full rounded-3xl border transition-all duration-75 ${
                  swipeDirection === "left" 
                    ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]" 
                    : swipeDirection === "right" 
                      ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]" 
                      : currentTheme.cardBorder
                } bg-[#161210] p-8 flex flex-col justify-between backface-hidden shadow-xl`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                      📍 {activeCard?.category} {activeCard?.note_title ? `• ${activeCard.note_title}` : ""}
                    </span>
                    <span className="text-stone-500 font-semibold font-mono">
                      Fiszka {safeCurrentIndex + 1} z {filteredCards.length}
                    </span>
                  </div>

                  <div className="text-center my-auto">
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-100 leading-snug px-2">
                      {activeCard?.question}
                    </h2>
                  </div>

                  <p className="text-center text-[10px] text-stone-500 uppercase tracking-widest font-semibold animate-pulse">
                    Kliknij, aby odwrócić i poznać odpowiedź 🔄
                  </p>
                </div>

                {/* STRONA B: ODPOWIEDŹ */}
                <div className={`absolute inset-0 w-full h-full rounded-3xl border transition-all duration-75 ${
                  swipeDirection === "left" 
                    ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]" 
                    : swipeDirection === "right" 
                      ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]" 
                      : "border-amber-950/40"
                } bg-[#161210] p-8 flex flex-col justify-between backface-hidden rotate-y-180 shadow-xl`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      Odpowiedź
                    </span>
                    <span className="text-stone-500 font-semibold font-mono">
                      {activeCard?.category}
                    </span>
                  </div>

                  <div className="my-auto overflow-y-auto max-h-56 pr-1 scrollbar-thin scrollbar-thumb-stone-800">
                    <p className="text-sm sm:text-base text-stone-200 leading-relaxed font-serif pr-2 select-text">
                      {activeCard?.answer}
                    </p>
                  </div>

                  <p className="text-center text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                    Kliknij, aby wrócić do pytania 🔄
                  </p>
                </div>

              </div>
            </div>

            {/* INTERAKTYWNE KLAWISZE SPRAWDZENIA WIEDZY */}
            <div className="grid grid-cols-2 gap-3.5 w-full">
              <button
                onClick={() => handleMarkStatusGame(activeCard?.id, "learning")}
                disabled={!!swipeDirection}
                className="py-3 px-5 rounded-2xl text-xs font-bold border border-red-900/30 bg-red-950/10 hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <span>❌</span> Jeszcze nie znam
              </button>
              <button
                onClick={() => handleMarkStatusGame(activeCard?.id, "mastered")}
                disabled={!!swipeDirection}
                className="py-3 px-5 rounded-2xl text-xs font-bold border border-emerald-900/30 bg-emerald-950/10 hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <span>✅</span> Opanowałem!
              </button>
            </div>

            {/* NAWIGACJA POPRZEDNIA / NASTĘPNA */}
            <div className="flex justify-between items-center w-full px-2 mt-1">
              <button
                onClick={handlePrev}
                className="text-xs text-stone-500 hover:text-stone-300 transition-colors font-semibold"
              >
                ← Poprzednia
              </button>
              
              {/* Kropki postępu na dole */}
              <div className="flex gap-1 max-w-[200px] overflow-hidden justify-center">
                {filteredCards.slice(0, 15).map((_, idx) => (
                  <span 
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                      idx === safeCurrentIndex ? "bg-amber-500 w-3" : "bg-stone-800"
                    }`}
                  />
                ))}
                {filteredCards.length > 15 && <span className="text-[8px] text-stone-600 font-bold">...</span>}
              </div>

              <button
                onClick={handleNext}
                className="text-xs text-stone-500 hover:text-stone-300 transition-colors font-semibold"
              >
                Następna →
              </button>
            </div>

          </div>
        ) : (
          
          /* TRYB WYGODNEJ, SZYBKIEJ LISTY */
          <div className="w-full flex flex-col gap-4 animate-slide-in select-none relative z-10">
            {filteredCards.map((card) => (
              <div 
                key={card.id}
                className={`p-5 rounded-2xl border ${currentTheme.cardBorder} bg-[#161210] flex flex-col gap-3.5 shadow-md relative group`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest text-amber-500 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    📍 {card.category} {card.note_title ? `• ${card.note_title}` : ""}
                  </span>
                  
                  {/* Szybka akcja bezpośrednio z poziomu wiersza na liście */}
                  <div className="flex gap-2">
                    {filter === "learning" ? (
                      <button
                        onClick={() => handleMarkStatusList(card.id, "mastered")}
                        className="text-[10px] font-bold px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/20 hover:text-emerald-300 transition-all flex items-center gap-1"
                      >
                        <span>✅</span> Opanowane
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkStatusList(card.id, "learning")}
                        className="text-[10px] font-bold px-3 py-1 rounded-xl bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all flex items-center gap-1"
                      >
                        <span>❌</span> Do nauki
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-base font-bold text-stone-100 font-serif leading-snug">
                    {card.question}
                  </h4>
                  <p className="text-xs text-stone-400 leading-relaxed pl-3 border-l-2 border-stone-800 italic font-serif select-text">
                    {card.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}