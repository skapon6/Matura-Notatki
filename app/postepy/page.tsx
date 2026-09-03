"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { playSound } from "../lib/sounds";
import { useLofi } from "../context/LofiContext";
import { getThemeClasses, CozyTheme } from "../lib/theme";
import { CozyGlowCard } from "../components/CozyGlowCard";
import Link from "next/link";

export default function MojePostepyPage() {
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
  const [loading, setLoading] = useState(true);

  // Stany dla statystyk
  const [quotesCount, setQuotesCount] = useState(0);
  const [credits, setCredits] = useState(0);
  const [essaysCount, setEssaysCount] = useState(0);
  const [essayAverage, setEssayAverage] = useState(0); 
  const [essaySuccessRate, setEssaySuccessRate] = useState(0); 
  const [studyTime, setStudyTime] = useState(0);
  
  // NOWOŚĆ: Stany dla przeczytanych notatek
  const [readNotesCount, setReadNotesCount] = useState(0);
  const [totalNotesCount, setTotalNotesCount] = useState(0);

  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push("/");
          return;
        }
        setUser(session.user);
        const userId = session.user.id;

        // Pobieramy dane równolegle (Promise.all) dodając zapytanie o łączną liczbę notatek
        // Pobieramy dane równolegle (Promise.all) wraz z read_notes z profilu
        const [
          profileRes,
          quotesRes,
          essaysRes,
          flashcardsRes,
          progressRes,
          notesCountRes
        ] = await Promise.all([
          supabase.from("profiles").select("essay_credits, read_notes").eq("id", userId).single(), // <--- dodano read_notes
          supabase.from("personal_notes").select("id", { count: "exact", head: true }),
          supabase.from("essay_evaluations").select("score").eq("user_id", userId),
          supabase.from("flashcards").select("id, era, note_slug, front, back"),
          supabase.from("flashcard_progress").select("flashcard_id, status").eq("user_id", userId),
          supabase.from("notes").select("id", { count: "exact", head: true }) // Zliczanie bazy notatek
        ]);

        // A. Tokeny oraz dokładna liczba przeczytanych notatek z bazy w chmurze
        if (profileRes.data) {
          setCredits(profileRes.data.essay_credits || 0);
          
          if (profileRes.data.read_notes && Array.isArray(profileRes.data.read_notes)) {
            setReadNotesCount(profileRes.data.read_notes.length);
            // Zapisujemy kopię lokalnie dla natychmiastowej spójności
            if (typeof window !== "undefined") {
              localStorage.setItem("read_notes", JSON.stringify(profileRes.data.read_notes));
            }
          }
        }

        // B. Cytaty
        if (quotesRes.count !== null) {
          setQuotesCount(quotesRes.count);
        }

        // C. Liczba wszystkich notatek w bazie
        if (notesCountRes.count !== null) {
          setTotalNotesCount(notesCountRes.count);
        }

        if (profileRes.data) setCredits(profileRes.data.essay_credits || 0);
        if (quotesRes.count !== null) setQuotesCount(quotesRes.count);
        
        // Zapis całkowitej liczby notatek w bazie
        if (notesCountRes.count !== null) {
          setTotalNotesCount(notesCountRes.count);
        }

        if (essaysRes.data) {
          setEssaysCount(essaysRes.data.length);
          let totalScoreNumerator = 0;
          let parsedCount = 0;

          essaysRes.data.forEach((row: any) => {
            const scoreStr = row.score; 
            if (scoreStr && typeof scoreStr === "string") {
              const numerator = parseInt(scoreStr.split("/")[0], 10);
              if (!isNaN(numerator)) {
                totalScoreNumerator += numerator;
                parsedCount++;
              }
            }
          });

          const average = parsedCount > 0 ? parseFloat((totalScoreNumerator / parsedCount).toFixed(1)) : 0;
          setEssayAverage(average);
          setEssaySuccessRate(Math.round((average / 35) * 100));
        }

        if (flashcardsRes.data) setFlashcards(flashcardsRes.data);
        if (progressRes.data) {
          const progressMap: Record<string, string> = {};
          progressRes.data.forEach((row) => {
            progressMap[row.flashcard_id] = row.status;
          });
          setProgress(progressMap);
        }

        // Błyskawiczne zliczanie przeczytanych notatek i czasu z pamięci lokalnej (cache)
        if (typeof window !== "undefined") {
          // 1. Czas nauki
          const savedTime = localStorage.getItem("cozy_study_time_total") || "0";
          setStudyTime(Math.round(parseInt(savedTime) / 60));
          
          // 2. Przeczytane notatki
          const savedReadNotes = localStorage.getItem("read_notes");
          if (savedReadNotes) {
            try {
              const parsedNotes = JSON.parse(savedReadNotes);
              if (Array.isArray(parsedNotes)) {
                setReadNotesCount(parsedNotes.length);
              }
            } catch (e) {}
          }
        }

      } catch (err) {
        console.error("Błąd ładowania statystyk:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [router]);

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

  const calculateGroupProgress = (erasInGroup: string[]) => {
    const cardsInGroup = flashcards.filter((c) =>
      erasInGroup.some((era) => c.era?.toLowerCase() === era.toLowerCase())
    );
    if (cardsInGroup.length === 0) return 0;
    const masteredInGroup = cardsInGroup.filter((c) => progress[c.id] === "mastered");
    return Math.round((masteredInGroup.length / cardsInGroup.length) * 100);
  };

  const starozytnoscProgress = calculateGroupProgress(["antyk", "starożytność", "średniowiecze", "lament swietokrzyski", "pieśń o rolandzie", "rozmowa mistrza polikarpa"]);
  const renesansProgress = calculateGroupProgress(["renesans", "barok", "oświecenie"]);
  const romantyzmProgress = calculateGroupProgress(["romantyzm", "pozytywizm"]);
  const wspolczesnoscProgress = calculateGroupProgress(["dwudziestolecie", "wojna i okupacja", "współczesność"]);

  const masteredFlashcards = flashcards
    .filter((c) => progress[c.id] === "mastered")
    .map((c) => ({
      ...c,
      category: c.era || "Inne",
      note_title: c.note_slug ? prettifySlug(c.note_slug) : null,
      question: c.front,
      answer: c.back,
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">📈</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Analizowanie Twoich postępów nauki...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      
      <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
          <button onClick={() => { playSound("click"); router.push("/"); }} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs font-medium ${currentTheme.subText} hover:text-stone-100`}>
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

        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 border-stone-800/40 pt-3 md:pt-0">
          <div className={`flex items-center gap-3 sm:gap-4 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all select-none shadow-md`}>
            <button type="button" onClick={handlePrevTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
            </button>
            <button type="button" onClick={toggleLofi} className="flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all font-semibold text-xs active:scale-95">
              {lofiActive ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 001.555-.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <span className="hidden md:inline text-[10px] sm:text-xs tracking-wide">{lofiTracks[currentTrackIndex].name}</span>
            </button>
            <button type="button" onClick={handleNextTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg>
            </button>
            <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 ml-1 border-l border-stone-800/80 pl-2 sm:pl-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 12H3a1 1 0 01-1-1V9a1 1 0 011-1h1.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" /></svg>
              <input type="range" min="0" max="1" step="0.05" value={lofiVolume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="w-14 sm:w-16 md:w-20 h-1 bg-stone-850 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none" style={{ WebkitAppearance: "none" }} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-6 flex flex-col gap-6 flex-1 select-none animate-slide-in">
        
       {/* PIĘĆ DYNAMICZNYCH KAFELKÓW STATYSTYK */}
        <div className="flex flex-col gap-3 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            
            <CozyGlowCard currentTheme={currentTheme} className="p-5 flex flex-col items-center justify-center text-center gap-2">
              <div className="text-xl sm:text-2xl">📚</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 leading-normal flex items-baseline gap-1">
                <span className="text-emerald-400">{readNotesCount}</span> 
                <span className="text-[13px] font-sans font-medium text-stone-500">/ {totalNotesCount}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-normal">Przeczytane Notatki</div>
            </CozyGlowCard>

           <CozyGlowCard currentTheme={currentTheme} className="p-5 flex flex-col items-center justify-center text-center gap-2">
              <div className="text-xl sm:text-2xl">⭐</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 leading-normal flex items-baseline gap-1">
                <span>{quotesCount}</span> 
                <span className="text-[13px] font-sans font-medium text-stone-500">/ 100</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-normal">Zapisane cytaty</div>
            </CozyGlowCard>

            
            <CozyGlowCard currentTheme={currentTheme} className="p-5 flex flex-col items-center justify-center text-center gap-2">
              <div className="text-xl sm:text-2xl">🪙</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 leading-normal">{credits}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-normal">Kredyty AI</div>
            </CozyGlowCard>

            <CozyGlowCard currentTheme={currentTheme} className="p-5 flex flex-col items-center justify-center text-center gap-2">
              <div className="text-xl sm:text-2xl">✍️</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 leading-normal">{essaysCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-normal">Ocenione rozprawki</div>
            </CozyGlowCard>

            <CozyGlowCard currentTheme={currentTheme} className="p-5 flex flex-col items-center justify-center text-center gap-2 md:col-span-1 lg:col-span-1 col-span-2">
              <div className="text-xl sm:text-2xl">⏱️</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 leading-normal">{studyTime} min</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-normal">Łączny czas nauki</div>
            </CozyGlowCard>

          </div>

         {/* DYSKRETNY PRZYPIS INFORMACYJNY */}
          <div className="flex items-start gap-2 px-2 opacity-80 mt-1">
            <span className="text-stone-500 text-[11px] mt-0.5 select-none">ℹ️</span>
            <p className="text-[10px] text-stone-500 leading-relaxed font-sans">
              <strong className="text-stone-400">Ważne:</strong> Twój <span className="text-stone-400">łączny czas nauki ze stopera</span> zapisywany jest lokalnie w pamięci tej przeglądarki (wyczyszczenie historii przeglądania zresetuje tę jedną statystykę). Przeczytane notatki, fiszki, historia ocen AI i zapisane cytaty są w 100% bezpiecznie zapisywane w chmurze i synchronizowane między Twoimi urządzeniami!
            </p>
          </div>
        </div>

        {essaysCount > 0 && (
          <CozyGlowCard currentTheme={currentTheme} className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md animate-slide-in">
            <div className="flex items-center gap-4 text-left">
              <div className="text-3xl shrink-0">✍️</div>
              <div>
                <h4 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-1">Analiza Pisania Rozprawek AI</h4>
                <p className="text-xs text-stone-400 leading-relaxed font-sans max-w-md">
                  {essayAverage >= 28 ? (
                    <span>👑 <strong className="text-stone-100 font-semibold">Poziom mistrzowski!</strong> Twoje wypracowania wykraczają merytorycznie poza schematy. Masz świetnie opanowane kryteria CKE i dojrzały język. Jesteś w pełni gotowy!</span>
                  ) : essayAverage >= 17.5 ? (
                    <span>🎯 <strong className="text-stone-100 font-semibold">Solidna i stabilna forma!</strong> Wykazujesz się zadowalającą wiedzą merytoryczną. Skup się teraz na eliminacji drobnych błędów językowych i spójności.</span>
                  ) : (
                    <span>☕ <strong className="text-stone-100 font-semibold">Trening czyni mistrza!</strong> Każda napisana i przeanalizowana praca to krok bliżej do sukcesu. Sprawdź szczegółowe uwagi krytyka w historii ocen!</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-3 sm:gap-4 shrink-0 font-mono text-center select-none">
              <div className="bg-stone-950/40 px-4 py-2 rounded-xl border border-stone-850">
                <span className="block text-lg sm:text-xl font-extrabold text-stone-100">{essaysCount}</span>
                <span className="text-[9px] text-stone-500 uppercase tracking-wider font-sans">Napisane</span>
              </div>
              <div className="bg-stone-950/40 px-4 py-2 rounded-xl border border-stone-850">
                <span className="block text-lg sm:text-xl font-extrabold text-amber-500">
                  {essayAverage} <span className="text-xs text-stone-500">/ 35</span>
                </span>
                <span className="text-[9px] text-stone-500 uppercase tracking-wider font-sans">Średnia</span>
              </div>
              <div className="bg-stone-950/40 px-4 py-2 rounded-xl border border-stone-850">
                <span className="block text-lg sm:text-xl font-extrabold text-stone-100">{essaySuccessRate}%</span>
                <span className="text-[9px] text-stone-500 uppercase tracking-wider font-sans">Skuteczność</span>
              </div>
            </div>
          </CozyGlowCard>
        )}

        <CozyGlowCard currentTheme={currentTheme} className="p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
              Postęp Opanowania Epok (Na podstawie fiszek)
            </h3>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Procenty wyliczają się automatycznie na podstawie fiszek, które oznaczyłeś jako „Opanowane” w strefie nauki.
            </p>
          </div>

          <div className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Starożytność i Średniowiecze</span>
                <span className="font-mono text-amber-500">{starozytnoscProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-900">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" style={{ width: `${starozytnoscProgress}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Renesans, Barok i Oświecenie</span>
                <span className="font-mono text-amber-500">{renesansProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-900">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" style={{ width: `${renesansProgress}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Romantyzm i Pozytywizm (Lektury kluczowe)</span>
                <span className="font-mono text-amber-500">{romantyzmProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-900">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" style={{ width: `${romantyzmProgress}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Współczesność i Międzywojenne</span>
                <span className="font-mono text-amber-500">{wspolczesnoscProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-900">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" style={{ width: `${wspolczesnoscProgress}%` }} />
              </div>
            </div>
          </div>
        </CozyGlowCard>

        <CozyGlowCard currentTheme={currentTheme} className="p-6 sm:p-8 flex flex-col gap-4">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2 select-none">
              <span>🏆</span> Ostatnio Opanowane Fiszki ({masteredFlashcards.length})
            </h3>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Oto lista pojęć i zagadnień maturalnych, które pomyślnie opanowałeś w strefie szybkich fiszek:
            </p>
          </div>

          {masteredFlashcards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in">
              {masteredFlashcards.slice(-4).reverse().map((card) => (
                <div key={card.id} className="p-4 rounded-xl bg-stone-950/50 border border-stone-900/60 text-left flex flex-col gap-2 transition-all hover:border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-950/20">
                      📍 {card.category} {card.note_title ? `• ${card.note_title}` : ""}
                    </span>
                    <span className="text-[9px] text-stone-500 font-bold uppercase">Opanowane ✅</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-200 font-serif leading-snug">
                    {card.question}
                  </h4>
                  <p className="text-[11px] text-stone-400 italic leading-relaxed border-l border-stone-800 pl-2.5 font-serif select-text">
                    {card.answer}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-stone-850 rounded-2xl text-stone-500 select-none animate-slide-in">
              <span className="text-3xl block mb-2">⭐</span>
              <p className="text-xs font-semibold">Nie opanowałeś jeszcze żadnej fiszki w tym kąciku.</p>
              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed max-w-[280px] mx-auto">
                Przejdź do zakładki <Link href="/fiszki" className="text-amber-500 hover:underline">Szybkie Fiszki</Link>, rozpocznij powtórkę i kliknij „Opanowałem!”, aby zobaczyć tu swoje sukcesy!
              </p>
            </div>
          )}
        </CozyGlowCard>

      </main>
    </div>
  );
}