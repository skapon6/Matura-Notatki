"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { playSound } from "../lib/sounds";
import { useLofi } from "../context/LofiContext";
import { getThemeClasses } from "../lib/theme";

export default function PostepyPage() {
  const router = useRouter();
  const currentTheme = getThemeClasses("library");

  // Globalny odtwarzacz Lo-Fi (gra płynnie bez przerw przy nawigacji!)
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

  // PRAWDZIWE STANY STATYSTYK Z BAZY
  const [essayCount, setEssayCount] = useState(0);
  const [savedQuotesCount, setSavedQuotesCount] = useState(0);
  const [essayCredits, setEssayCredits] = useState(0);

  // Łączny czas nauki (pobierany z localStorage)
  const [totalStudyMinutes, setTotalStudyMinutes] = useState<number>(0);

  // STANY DLA DYNAMICZNEGO POSTĘPU EPOK (Porównanie tabel flashcards i flashcard_progress)
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, "mastered" | "learning">>({});

  useEffect(() => {
    async function fetchProgressData() {
      setLoading(true);
      try {
        // 1. Sprawdź zalogowanego użytkownika
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/"); // Brak sesji -> powrót na główną [1]
          return;
        }

        // 2. Pobierz profil z bazy, aby sprawdzić status premium
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_status, expires_at, essay_credits")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profileData) {
          router.push("/"); // Błąd pobierania profilu -> powrót na główną
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

        // 3. Route Guard: wyrzucenie darmowego użytkownika z powrotem na główną [1]
        if (!hasPremiumAccess) {
          router.push("/");
          return;
        }

        // Zapisanie zalogowanego użytkownika i jego tokenów z bazy
        setUser(session.user);
        setEssayCredits(profileData.essay_credits);
        const userId = session.user.id;

        // 4. Pobierz liczbę ocenionych rozprawek użytkownika z tabeli essay_evaluations
        const { count: essays, error: essayError } = await supabase
          .from("essay_evaluations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!essayError && essays !== null) {
          setEssayCount(essays);
        }

        // 5. Pobierz liczbę zapisanych cytatów użytkownika z tabeli personal_notes
        const { count: quotes, error: quotesError } = await supabase
          .from("personal_notes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!quotesError && quotes !== null) {
          setSavedQuotesCount(quotes);
        }

        // 6. Pobierz informacje o wszystkich fiszkach w systemie (ich id oraz epoki)
        const { data: cardsData, error: cardsError } = await supabase
          .from("flashcards")
          .select("id, era");
        if (!cardsError && cardsData) {
          setFlashcards(cardsData);
        }

        // 7. Pobierz postępy fiszek dla danego użytkownika z tabeli flashcard_progress
        const { data: progressData, error: progressError } = await supabase
          .from("flashcard_progress")
          .select("flashcard_id, status")
          .eq("user_id", userId);
        if (!progressError && progressData) {
          const progressMap: Record<string, "mastered" | "learning"> = {};
          progressData.forEach((row) => {
            progressMap[row.flashcard_id] = row.status as "mastered" | "learning";
          });
          setProgress(progressMap);
        }

        // 8. Wczytaj łączny czas nauki z localStorage
        if (typeof window !== "undefined") {
          const savedTotal = localStorage.getItem("cozy_total_study_minutes");
          if (savedTotal) {
            setTotalStudyMinutes(parseFloat(savedTotal));
          }
        }

      } catch (err) {
        console.error("Błąd podczas wczytywania statystyk:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    fetchProgressData();
  }, [router]);

  // Funkcja obliczająca rzeczywisty, dynamiczny procent opanowania danej grupy epok
  const getEpochProgressPercent = (eras: string[]) => {
    if (flashcards.length === 0) return 0;

    const eraCards = flashcards.filter((card) =>
      eras.some((era) => card.era?.toLowerCase() === era.toLowerCase())
    );

    if (eraCards.length === 0) return 0;

    const masteredCardsCount = eraCards.filter(
      (card) => progress[card.id] === "mastered"
    ).length;

    return Math.round((masteredCardsCount / eraCards.length) * 100);
  };

  // Piękne formatowanie łącznego czasu nauki (minuty -> godziny i minuty)
  const formatStudyTime = (minutes: number) => {
    if (minutes < 1) return "0 min";
    if (minutes < 60) {
      return `${Math.floor(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return mins > 0 ? `${hours} godz. ${mins} min` : `${hours} godz.`;
  };

  // Czysty i bezpieczny ekran ładowania podczas autoryzacji
  if (loading) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">☕</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Weryfikacja dostępu do dziennika postępów...
        </p>
      </div>
    );
  }

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
            onClick={() => router.push("/")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs font-medium ${currentTheme.subText} hover:text-stone-100`}
          >
            ← Wróć do kącika
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Moje Postępy i Statystyki
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
      <main className="max-w-4xl mx-auto w-full p-6 flex flex-col justify-center flex-1 select-none animate-slide-in">
        
        <div className="w-full flex flex-col gap-6">
          
          {/* PANEL DYNAMICZNYCH STATYSTYK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KAFELEK 1: ZAPISANE CYTATY */}
            <div className={`p-5 rounded-2xl border ${currentTheme.cardBorder} bg-[#161210] flex flex-col items-center justify-center text-center shadow-md`}>
              <span className="text-2xl mb-1">⭐</span>
              <span className="text-2xl font-bold font-mono text-stone-100">{savedQuotesCount}</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">
                Zapisane Cytaty
              </span>
            </div>

            {/* KAFELEK 2: POZOSTAŁE TOKENY */}
            <div className={`p-5 rounded-2xl border ${currentTheme.cardBorder} bg-[#161210] flex flex-col items-center justify-center text-center shadow-md`}>
              <span className="text-2xl mb-1">🪙</span>
              <span className="text-2xl font-bold font-mono text-amber-500">{essayCredits}</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">
                Pozostałe Tokeny AI
              </span>
            </div>

            {/* KAFELEK 3: OCENIONE ROZPRAWKI */}
            <div className={`p-5 rounded-2xl border ${currentTheme.cardBorder} bg-[#161210] flex flex-col items-center justify-center text-center shadow-md`}>
              <span className="text-2xl mb-1">✍️</span>
              <span className="text-2xl font-bold font-mono text-stone-100">{essayCount}</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">
                Ocenione Rozprawki
              </span>
            </div>

            {/* KAFELEK 4: ŁĄCZNY CZAS NAUKI */}
            <div className={`p-5 rounded-2xl border ${currentTheme.cardBorder} bg-[#161210] flex flex-col items-center justify-center text-center shadow-md`}>
              <span className="text-2xl mb-1">⏱️</span>
              <span className="text-xl font-bold font-mono text-stone-100 whitespace-nowrap">
                {formatStudyTime(totalStudyMinutes)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">
                Łączny Czas Nauki
              </span>
            </div>

          </div>

          {/* PANEL DYNAMICZNEGO POSTĘPU OPANOWANIA EPOK */}
          <div className={`p-6 sm:p-8 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} shadow-lg flex flex-col gap-6`}>
            <div>
              <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                Postęp Opanowania Epok (Na Podstawie Fiszek)
              </h3>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                Procenty wyliczają się automatycznie na podstawie fiszek, które oznaczyłeś jako „Opanowane” w strefie nauki.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              
              {/* Epoka 1: Starożytność i Średniowiecze */}
              {(() => {
                const percent = getEpochProgressPercent(["Antyk", "Średniowiecze"]);
                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-300 font-serif">Starożytność i Średniowiecze</span>
                      <span className="font-mono text-stone-400">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-950/60 rounded-full overflow-hidden border border-stone-900">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Epoka 2: Renesans, Barok i Oświecenie */}
              {(() => {
                const percent = getEpochProgressPercent(["Renesans", "Barok", "Oświecenie"]);
                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-300 font-serif">Renesans, Barok i Oświecenie</span>
                      <span className="font-mono text-stone-400">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-950/60 rounded-full overflow-hidden border border-stone-900">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Epoka 3: Romantyzm i Pozytywizm */}
              {(() => {
                const percent = getEpochProgressPercent(["Romantyzm", "Pozytywizm"]);
                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-300 font-serif">Romantyzm i Pozytywizm (Lektury kluczowe)</span>
                      <span className="font-mono text-stone-400">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-950/60 rounded-full overflow-hidden border border-stone-900">
                      <div 
                        className="h-full bg-amber-600 rounded-full transition-all duration-1000" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Epoka 4: Współczesność i Dwudziestolecie */}
              {(() => {
                const percent = getEpochProgressPercent(["Współczesność", "XX Międzywojenne"]);
                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-300 font-serif">Współczesność i Międzywojenne</span>
                      <span className="font-mono text-stone-400">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-950/60 rounded-full overflow-hidden border border-stone-900">
                      <div 
                        className="h-full bg-stone-700 rounded-full transition-all duration-1000" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}