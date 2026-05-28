"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { playSound } from "../lib/sounds";
import { useLofi } from "../context/LofiContext";
import { getThemeClasses } from "../lib/theme";

export default function MaturaUstnaPage() {
  const router = useRouter();
  const currentTheme = getThemeClasses("library");

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
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Dynamiczna lista pytań pobrana ze Supabase
  const [ckeQuestions, setCkeQuestions] = useState<any[]>([]);
  
  // Wylosowany pełny zestaw egzaminacyjny (Jawne + Niejawne)
  const [selectedSet, setSelectedSet] = useState<{
    publicQuestion: any;
    unseenQuestion: any;
  } | null>(null);

  // Stany egzaminu (Osobne brudnopisy dla zadań)
  const [draftTextPublic, setDraftTextPublic] = useState(""); 
  const [draftTextUnseen, setDraftTextUnseen] = useState(""); 
  const [speechText, setSpeechText] = useState(""); // wspólna wypowiedź ustna
  
  // Stoper przygotowania (15 minut)
  const [prepTimeLeft, setPrepTimeLeft] = useState(15 * 60);
  const [isPrepTimerRunning, setIsPrepTimerRunning] = useState(false);

  // Rezultat z wirtualnej komisji AI (zmieniony typ na any dla obiektu JSON)
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Dyktowanie głosowe
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Monitorowanie sesji, tokenów i wczytywanie bazy pytań
  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userId = null;
        if (session?.user) {
          setUser(session.user);
          userId = session.user.id;

          const { data: profile } = await supabase
            .from("profiles")
            .select("essay_credits")
            .eq("id", userId)
            .single();
            
          if (profile) {
            setCredits(profile.essay_credits);
          }
        }

        // Pobranie wszystkich pytań z tabeli cke_oral_questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("cke_oral_questions")
          .select("*")
          .order("id", { ascending: true });

        if (!questionsError && questionsData) {
          setCkeQuestions(questionsData);
        }
      } catch (err) {
        console.error("Błąd ładowania danych początkowych:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  // Obsługa stopera przygotowania
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPrepTimerRunning && prepTimeLeft > 0) {
      interval = setInterval(() => {
        setPrepTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (prepTimeLeft === 0 && isPrepTimerRunning) {
      setIsPrepTimerRunning(false);
      playSound("error");
      alert("Czas na przygotowanie minął! Przejdź do wygłoszenia mowy 🎙️");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPrepTimerRunning, prepTimeLeft]);

  // LOSOWANIE PEŁNEGO ZESTAWU EGZAMINACYJNEGO (1 Jawne + 1 Niejawne)
  const handleDrawSet = () => {
    if (isRecording) stopSpeechRecognition();

    const publicPool = ckeQuestions.filter((q) => q.is_public !== false);
    const unseenPool = ckeQuestions.filter((q) => q.is_public === false);

    if (publicPool.length === 0 || unseenPool.length === 0) {
      alert("Baza pytań w Supabase nie jest w pełni skonfigurowana. Potrzebujesz min. 1 pytania jawnego i 1 niejawnego.");
      return;
    }

    playSound("success");
    
    // Losujemy po jednym z każdej grupy
    const randPublic = publicPool[Math.floor(Math.random() * publicPool.length)];
    const randUnseen = unseenPool[Math.floor(Math.random() * unseenPool.length)];

    setSelectedSet({
      publicQuestion: randPublic,
      unseenQuestion: randUnseen
    });

    // Reset stanów
    setDraftTextPublic("");
    setDraftTextUnseen("");
    setSpeechText("");
    setEvaluationResult(null);
    setPrepTimeLeft(15 * 60); // Reset stopera do 15 min
    setIsPrepTimerRunning(false);
  };

  const startPrepTimer = () => {
    playSound("click");
    setIsPrepTimerRunning(true);
  };

  const pausePrepTimer = () => {
    playSound("click");
    setIsPrepTimerRunning(false);
  };

  const formatPrepTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Dyktowanie głosowe
  const startSpeechRecognition = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Twoja przeglądarka nie wspiera dyktowania głosowego. Użyj Google Chrome lub Microsoft Edge.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "pl-PL";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      playSound("click");
      setIsRecording(true);
    };

    rec.onresult = (event: any) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setSpeechText((prev) => {
          return prev + (prev ? " " : "") + finalTranscript;
        });
      }
    };

    rec.onerror = (err: any) => {
      console.error("Speech Recognition Error:", err);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      playSound("success");
    }
  };

  // Wysyłanie do wirtualnej komisji AI
  const handleSubmitExam = async () => {
    if (isRecording) stopSpeechRecognition();

    if (!speechText.trim()) {
      alert("Wpisz lub wypowiedz swoją odpowiedź przed wysłaniem!");
      return;
    }

    if (credits < 3) {
      alert("Niewystarczająca liczba tokenów! Potrzebujesz min. 3 tokenów na próbny egzamin.");
      return;
    }

    if (!selectedSet) return;

    setEvaluating(true);
    playSound("click");
    try {
      const response = await fetch("/api/matura-ustna/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicQuestion: selectedSet.publicQuestion,
          unseenQuestion: selectedSet.unseenQuestion,
          draftPublic: draftTextPublic,
          draftUnseen: draftTextUnseen,
          speech: speechText,
          unseenImageUrl: selectedSet.unseenQuestion.image_url || null
        })
      });

      const data = await response.json();

      if (response.ok && data.result) {
        setEvaluationResult(data.result);
        playSound("success");
        setCredits((prev) => Math.max(0, prev - 3));
      } else {
        alert(data.error || "Wystąpił błąd podczas analizy egzaminu.");
      }
    } catch (err) {
      console.error(err);
      alert("Błąd połączenia z wirtualną komisją.");
    } finally {
      setEvaluating(false);
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
              if (isRecording) stopSpeechRecognition();
              router.push("/");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs font-medium ${currentTheme.subText} hover:text-stone-100`}
          >
            ← Wróć do kącika
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Symulator Matury Ustnej AI
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
      <main className="max-w-4xl mx-auto w-full p-6 flex flex-col gap-6 flex-1 select-none animate-slide-in">
        
        {loading ? (
          <div className="text-center py-12 text-stone-500 text-sm">Wczytywanie bazy pytań CKE...</div>
        ) : !user ? (
          <div className="text-center py-16 px-4 border border-dashed border-stone-800 rounded-3xl text-stone-500">
            <span className="text-3xl block mb-2">🔑</span>
            <p className="text-sm font-semibold">Zaloguj się na stronie głównej, aby korzystać z symulatora.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* PANEL STATUSU TOKENÓW */}
            <div className="w-full flex items-center justify-between bg-stone-900/40 border border-stone-800/60 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="text-lg">🪙</span>
                <span className="text-sm font-bold text-stone-200">
                  Twoje kredyty: <span className="font-mono text-amber-500">{credits} tokenów</span>
                </span>
              </div>
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                Losowy zestaw (1 Jawne + 1 Niejawne) = 3 tokeny
              </div>
            </div>

            {/* KROK 1: LOSOWANIE PEŁNEGO ZESTAWU */}
            <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 relative overflow-hidden transition-colors duration-500 flex flex-col gap-4 text-center`}>
              <div>
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-extrabold">
                  Krok 1: Losowanie zestawu egzaminacyjnego
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Zgodnie z wymogami CKE wylosujesz zestaw złożony z 1 pytania jawnego (lektura) oraz 1 niejawnego (ikoniczne) [1].
                </p>
              </div>

              <button
                onClick={handleDrawSet}
                className="w-fit mx-auto px-6 py-3 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <span>🎲</span> Wylosuj zestaw maturalny
              </button>

              {selectedSet && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 text-left animate-slide-in">
                  
                  {/* ZADANIE 1: PYTANIE JAWNE */}
                  <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-900 flex flex-col gap-3 justify-between">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                        Zadanie 1: Pytanie Jawne ({selectedSet.publicQuestion.category})
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-stone-100 font-serif leading-snug">
                        {selectedSet.publicQuestion.question}
                      </h4>
                    </div>
                    <div className="mt-2 pt-2.5 border-t border-stone-900/60">
                      <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">Plan modelowej odpowiedzi:</span>
                      <p className="text-[11px] text-stone-400 leading-relaxed font-sans italic mt-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
                        {selectedSet.publicQuestion.modelOutline}
                      </p>
                    </div>
                  </div>

                  {/* ZADANIE 2: PYTANIE NIEJAWNE (Z OBRAZEM) */}
                  <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-900 flex flex-col gap-3 justify-between">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-fit">
                        Zadanie 2: Pytanie Niejawne ({selectedSet.unseenQuestion.category})
                      </span>
                      
                      {/* Wyświetlanie dołączonego obrazu bodźcowego */}
                      {selectedSet.unseenQuestion.image_url && (
                        <div className="w-full rounded-xl overflow-hidden border border-stone-900 bg-stone-950/50 shadow-md my-2 flex items-center justify-center max-h-64 sm:max-h-72">
                          <img 
                            src={selectedSet.unseenQuestion.image_url} 
                            alt="Materiał bodźcowy CKE"
                            className="max-w-full max-h-64 sm:max-h-72 object-contain select-none pointer-events-none"
                          />
                        </div>
                      )}

                      <h4 className="text-sm sm:text-base font-bold text-stone-100 font-serif leading-snug">
                        {selectedSet.unseenQuestion.question}
                      </h4>
                    </div>
                    <div className="mt-2 pt-2.5 border-t border-stone-900/60">
                      <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">Plan interpretacji obrazu:</span>
                      <p className="text-[11px] text-stone-400 leading-relaxed font-sans italic mt-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
                        {selectedSet.unseenQuestion.modelOutline}
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {selectedSet && (
              <>
                {/* KROK 2: STOPER I DWA OSOBNE BRUDNOPISY */}
                <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col gap-5`}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-850 pb-3">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                        Krok 2: Przygotowanie konspektu (15 minut)
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        Sporządź niezależne notatki i plany odpowiedzi dla obu zadań.
                      </p>
                    </div>

                    {/* Stoper */}
                    <div className="flex items-center gap-3 bg-stone-950/80 border border-stone-900 px-4 py-2 rounded-xl">
                      <span className="text-base font-bold font-mono text-stone-100">
                        {formatPrepTime(prepTimeLeft)}
                      </span>
                      {isPrepTimerRunning ? (
                        <button onClick={pausePrepTimer} className="text-xs text-stone-400 hover:text-stone-200">⏸️ Pauza</button>
                      ) : (
                        <button onClick={startPrepTimer} className="text-xs text-amber-500 hover:text-amber-400 font-bold">▶️ Start</button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Brudnopis Zadanie 1 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold px-1">Brudnopis Zadanie 1 (Pytanie jawne):</span>
                      <textarea
                        placeholder="Zapisz tu tezy, argumenty i odwołania literackie do zadania 1..."
                        value={draftTextPublic}
                        onChange={(e) => setDraftTextPublic(e.target.value)}
                        rows={6}
                        className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans"
                      />
                    </div>

                    {/* Brudnopis Zadanie 2 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold px-1">Brudnopis Zadanie 2 (Pytanie niejawne):</span>
                      <textarea
                        placeholder="Zapisz tu interpretację obrazu, wnioski i konteksty do zadania 2..."
                        value={draftTextUnseen}
                        onChange={(e) => setDraftTextUnseen(e.target.value)}
                        rows={6}
                        className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* KROK 3: WYGŁOSZENIE POŁĄCZONEJ MOWY */}
                <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col gap-4`}>
                  <div className="flex items-center justify-between border-b border-stone-850 pb-3">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                        Krok 3: Wygłoszenie wypowiedzi monologowej
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        Użyj przycisku dyktowania lub wpisz swoją wypowiedź monologową (najpierw zadanie 1, potem zadanie 2).
                      </p>
                    </div>

                    {/* INTERAKTYWNE DYKTOWANIE GŁOSOWE */}
                    {isRecording ? (
                      <button
                        onClick={stopSpeechRecognition}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-900/30 bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white font-bold text-xs transition-all animate-pulse"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Zatrzymaj dyktowanie 🛑
                      </button>
                    ) : (
                      <button
                        onClick={startSpeechRecognition}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 text-stone-300 hover:text-stone-100 font-bold text-xs transition-all`}
                      >
                        Mów (Dyktuj) 🎙️
                      </button>
                    )}
                  </div>

                  <textarea
                    placeholder="Wpisz lub kliknij 'Mów (Dyktuj)', aby nagrać swoją pełną, połączoną wypowiedź monologową na oba pytania z zestawu..."
                    value={speechText}
                    onChange={(e) => setSpeechText(e.target.value)}
                    rows={8}
                    className="w-full bg-stone-900/80 border border-stone-800/80 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans"
                  />

                  <button
                    onClick={handleSubmitExam}
                    disabled={evaluating || credits < 3}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                  >
                    {evaluating ? "⏳ Wirtualna Komisja CKE analizuje Twój egzamin..." : "🎙️ Wyślij zestaw do weryfikacji AI (Koszt: 3 Tokeny)"}
                  </button>
                </div>
              </>
            )}

            {/* KROK 4: REZULTAT OCENY KOMISJI */}
            {evaluationResult && (
              <div className="p-6 sm:p-8 rounded-3xl border border-emerald-900/30 bg-[#121614] flex flex-col gap-6 shadow-xl animate-slide-in w-full text-left">
                
                {/* Nagłówek wyniku z dużym badgem punktacji */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-stone-800 pb-5 gap-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-100 font-serif flex items-center gap-2">
                      <span>🎓</span> Oficjalny Protokół Egzaminu Ustnego (Ocena Komisji AI)
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mt-0.5">
                      Przeanalizowano oba zadania pomyślnie na podstawie kryteriów CKE
                    </p>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight bg-stone-950 px-5 py-2.5 rounded-2xl border border-stone-800 shadow-xl">
                      {evaluationResult.score}
                    </span>
                    <span className={`text-[9px] uppercase font-bold tracking-wider mt-2 px-2.5 py-0.5 rounded-full ${
                      evaluationResult.status === "ZDANE" 
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" 
                        : "bg-red-950/40 text-red-400 border border-red-900/30"
                    }`}>
                      {evaluationResult.status}
                    </span>
                  </div>
                </div>

                {/* Kryteria szczegółowe CKE w siatce dwukolumnowej */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluationResult.details?.map((detail: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl bg-stone-950/60 border border-stone-900 hover:border-amber-500/20 transition-all flex flex-col justify-between">
                      <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider text-stone-200 mb-2">
                        <span>{detail.criterion}</span>
                        <span className="text-amber-500 font-mono">{detail.points}</span>
                      </div>
                      <p className="text-[11.5px] text-stone-400 leading-relaxed font-sans">{detail.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Analiza obrazu i Podsumowanie komisji */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluationResult.imageAnalysis && (
                    <div className="p-4 rounded-2xl bg-stone-950/45 border border-stone-900/80">
                      <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span>🖼</span> Ocena interpretacji obrazu w Zadaniu 2:
                      </h4>
                      <p className="text-[11.5px] text-stone-400 leading-relaxed font-sans">{evaluationResult.imageAnalysis}</p>
                    </div>
                  )}
                  {evaluationResult.summary && (
                    <div className="p-4 rounded-2xl bg-stone-950/45 border border-stone-900/80">
                      <h4 className="text-[10px] font-bold text-[#c68a4c] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span>💡</span> Podsumowanie komisji:
                      </h4>
                      <p className="text-[11.5px] text-stone-400 italic leading-relaxed font-sans">{evaluationResult.summary}</p>
                    </div>
                  )}
                </div>

                {/* Pytania dopytujące od Komisji (Follow-up) w wyróżnionej ramce */}
                {evaluationResult.followUpQuestions && evaluationResult.followUpQuestions.length > 0 && (
                  <div className="p-5 rounded-2xl bg-stone-950/60 border border-stone-900 flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold text-stone-200 uppercase tracking-widest flex items-center gap-2">
                      <span>💬</span> Pytania dopytujące od Komisji (Follow-up):
                    </h4>
                    <p className="text-[9px] text-stone-500 mb-1 leading-normal">
                      Wzorując się na prawdziwym egzaminie ustnym, komisja zadaje Ci dwa pytania bezpośrednio nawiązujące do Twojego monologu:
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {evaluationResult.followUpQuestions.map((question: string, qIdx: number) => (
                        <div key={qIdx} className="p-3.5 rounded-xl bg-stone-900/40 border border-stone-850 text-[11.5px] text-stone-300 leading-relaxed font-serif flex gap-3">
                          <span className="text-amber-500 font-bold shrink-0">{qIdx + 1}.</span>
                          <p className="italic">{question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Informacja małym drukiem */}
                <div className="text-[9px] text-stone-500 leading-relaxed font-sans px-1 mt-1 border-t border-stone-900/60 pt-3">
                  * Uwaga: Symulator AI ocenia odpowiedź bardzo rygorystycznie i dosłownie na podstawie kryteriów CKE dla Formuły 2023. Rzeczywista ocena ludzkiej komisji na prawdziwym egzaminie państwowym może różnić się na korzyść zdającego z uwagi na bardziej holistyczną ocenę i dynamiczną reakcję podczas rozmowy.
                </div>

              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}