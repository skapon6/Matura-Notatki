// app/matura-ustna/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { playSound } from "../lib/sounds";
import { useLofi } from "../context/LofiContext";
import { getThemeClasses, CozyTheme } from "../lib/theme";

type ExamMode = "both" | "public_only" | "unseen_only";

export default function MaturaUstnaPage() {
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
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Dynamiczna lista pytań pobrana ze Supabase
  const [ckeQuestions, setCkeQuestions] = useState<any[]>([]);
  
  // Wylosowany pełny zestaw egzaminacyjny (Jawne + Niejawne)
  const [selectedSet, setSelectedSet] = useState<{
    publicQuestion: any;
    unseenQuestion: any;
  } | null>(null);

  // Wybór zakresu treningu (Oba zadania / Tylko jawne / Tylko niejawne)
  const [examMode, setExamMode] = useState<ExamMode>("both");

  // Stany egzaminu (Osobne brudnopisy dla zadań)
  const [draftTextPublic, setDraftTextPublic] = useState(""); 
  const [draftTextUnseen, setDraftTextUnseen] = useState(""); 
  const [speechText, setSpeechText] = useState(""); // wspólna wypowiedź ustna
  
  // Stoper przygotowania (15 minut)
  const [prepTimeLeft, setPrepTimeLeft] = useState(15 * 60);
  const [isPrepTimerRunning, setIsPrepTimerRunning] = useState(false);

  // Rezultat z wirtualnej komisji AI
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Dyktowanie głosowe
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Stany nowego przytulnego okna modalnego dla modelowych odpowiedzi
  const [isOutlineModalOpen, setIsOutlineModalOpen] = useState(false);
  const [outlineModalTitle, setOutlineModalTitle] = useState("");
  const [outlineModalContent, setOutlineModalContent] = useState("");

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

  // LOSOWANIE PEŁNEGO ZESTAWU EGZAMINACYJNEGO
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

  // Otwieranie nowego modalu z pełną odpowiedzią wzorcową CKE (Generowaną przez AI)
  const handleOpenOutlineModal = (title: string, content: string) => {
    try {
      playSound("click");
    } catch (_) {}
    setOutlineModalTitle(title);
    setOutlineModalContent(content);
    setIsOutlineModalOpen(true);
  };

  // Wysyłanie do wirtualnej komisji AI
  const handleSubmitExam = async () => {
    if (isRecording) stopSpeechRecognition();

    const wordCount = speechText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      alert("Wypowiedź jest za krótka! Wygłoś lub wpisz co najmniej 50 słów, aby wirtualna komisja mogła dokonać rzetelnej oceny.");
      return;
    }
    if (wordCount > 2000) {
      alert("Twoja wypowiedź przekracza bezpieczny limit 2000 słów. Skróć nieco tekst przed wysłaniem.");
      return;
    }

    const KOSZT_EGZAMINU = examMode === "both" ? 3 : 2; // Dynamiczny koszt
    if (credits < KOSZT_EGZAMINU) {
      alert(`Niewystarczająca liczba tokenów! Potrzebujesz min. ${KOSZT_EGZAMINU} tokenów na ten zakres egzaminu.`);
      return;
    }

    if (!selectedSet) return;

    setEvaluating(true);
    setEvaluationResult(null);
    playSound("click");
    try {
      const response = await fetch("/api/matura-ustna/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicQuestion: selectedSet.publicQuestion,
          unseenQuestion: selectedSet.unseenQuestion,
          draftPublic: examMode === "unseen_only" ? "" : draftTextPublic,
          draftUnseen: examMode === "public_only" ? "" : draftTextUnseen,
          speech: speechText,
          unseenImageUrl: selectedSet.unseenQuestion.image_url || null,
          examMode: examMode 
        })
      });

      const data = await response.json();

      if (response.ok && data.result) {
        setEvaluationResult(data.result);
        playSound("success");
        setCredits((prev) => Math.max(0, prev - KOSZT_EGZAMINU));
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

  const currentWordCount = speechText.split(/\s+/).filter(Boolean).length;
  const KOSZT_EGZAMINU = examMode === "both" ? 3 : 2;

  // Funkcja oczyszczająca prosty podgląd tekstowy na stronie przed kliknięciem
  const cleanPreviewText = (text: string) => {
    if (!text) return "";
    return text.replace(/\*\*/g, "").replace(/\*\s+/g, "• ");
  };

  // DYNAMICZNY PARSER FORMATEK MARKDOWN DO STYLOWEGO WIDOKU MODALA
  const formatOutlineContent = (text: string) => {
    if (!text) return null;
    
    // Oczyszczamy linie z potworków typu "* **" na starcie
    let cleanText = text
      .replace(/\*\s+\*\*/g, "**") 
      .replace(/\*\s+/g, "• ");   

    const lines = cleanText.split("\n");
    
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-3" />; // pusta przestrzeń dla oddechu

      // Filtrujemy nagłówki główne (np. TEZA, ROZWINIĘCIE, KONTEKST)
      const isHeader = 
        trimmed.toUpperCase().startsWith("**TEZA") || 
        trimmed.toUpperCase().startsWith("**ROZWINIĘCIE") || 
        trimmed.toUpperCase().startsWith("**KONTEKST") ||
        trimmed.toUpperCase().startsWith("TEZA:") ||
        trimmed.toUpperCase().startsWith("ROZWINIĘCIE:") ||
        trimmed.toUpperCase().startsWith("KONTEKST:");

      if (isHeader) {
        const headerText = trimmed.replace(/\*\*/g, "").replace(/:/g, "");
        return (
          <h4 
            key={idx} 
            className="text-xs uppercase tracking-widest text-[#c68a4c] font-extrabold mt-6 mb-2 border-b border-stone-800/80 pb-1.5 w-fit"
          >
            {headerText}
          </h4>
        );
      }

      // Filtrujemy elementy listy ze śródtytułami, np. "• **Śródtytuł:** Opis"
      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        let bulletContent = trimmed.substring(1).trim();
        
        if (bulletContent.startsWith("**")) {
          const endBoldIdx = bulletContent.indexOf("**", 2);
          if (endBoldIdx !== -1) {
            const boldText = bulletContent.substring(2, endBoldIdx).replace(/:/g, "");
            const restText = bulletContent.substring(endBoldIdx + 2).trim();
            return (
              <div key={idx} className="flex gap-2.5 items-start text-xs sm:text-sm text-stone-300 leading-relaxed font-sans pl-1 mb-2">
                <span className="text-amber-500 font-extrabold select-none">▪</span>
                <p>
                  <strong className="text-[#c68a4c] font-semibold">{boldText}: </strong>
                  {restText}
                </p>
              </div>
            );
          }
        }

        const cleanedBullet = bulletContent.replace(/\*\*/g, "");
        return (
          <div key={idx} className="flex gap-2.5 items-start text-xs sm:text-sm text-stone-300 leading-relaxed font-sans pl-1 mb-2">
            <span className="text-amber-500 font-extrabold select-none">▪</span>
            <p>{cleanedBullet}</p>
          </div>
        );
      }

      // Klasyczny akapit tekstu (np. samej tezy) pisany pięknym krojem szeryfowym
      const cleanParagraph = trimmed.replace(/\*\*/g, "");
      return (
        <p 
          key={idx} 
          className="text-xs sm:text-sm text-stone-300 leading-relaxed font-serif italic pl-1 mb-4 select-text"
        >
          {cleanParagraph}
        </p>
      );
    });
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 001.555-.832l3.197-2.132a1 1 0 000-1.664z" />
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
        
        {/* PANEL STATUSU TOKENÓW */}
        <div className="w-full flex items-center justify-between bg-stone-900/40 border border-stone-800/60 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="text-lg">🪙</span>
            <span className="text-sm font-bold text-stone-200">
              Twoje kredyty: <span className="font-mono text-amber-500">{credits} tokenów</span>
            </span>
          </div>
          <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
            Próbny egzamin {examMode === "both" ? "pełny" : "jednostkowy"} (Koszt: {KOSZT_EGZAMINU} kredyty)
          </div>
        </div>

        {/* KROK 1: LOSOWANIE PEŁNEGO ZESTAWU */}
        <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 relative overflow-hidden transition-colors duration-500 flex flex-col gap-4 text-center`}>
          
          {/* Wybór zakresu treningu */}
          <div className="flex flex-col gap-2 bg-stone-900/40 border border-stone-800/60 p-3 rounded-2xl max-w-lg mx-auto mb-2 w-full text-left">
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider pl-1 select-none">
              Wybierz zakres treningu:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "both" as const, label: "👑 Oba zadania (3 Tokeny)", desc: "Pełny zestaw (30 pkt)" },
                { id: "public_only" as const, label: "📖 Tylko jawne (2 Tokeny)", desc: "Lektura (15 pkt)" },
                { id: "unseen_only" as const, label: "🖼️ Tylko niejawne (2 Tokeny)", desc: "Obraz lub wiersz (15 pkt)" },
              ].map((modeItem) => (
                <button
                  key={modeItem.id}
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setExamMode(modeItem.id);
                    setEvaluationResult(null); 
                  }}
                  className={`text-[10px] px-2 py-2 rounded-xl border font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                    examMode === modeItem.id
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-stone-950/20 text-stone-500 border-transparent hover:text-stone-300"
                  }`}
                >
                  <span>{modeItem.label.split(" ")[0]} {modeItem.label.split(" ").slice(1).join(" ")}</span>
                  <span className="text-[8px] opacity-60 font-normal">{modeItem.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-amber-500 font-extrabold">
              Krok 1: Losowanie zestawu egzaminacyjnego
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Zgodnie z wymogami CKE wylosujesz zestaw złożony z pytania jawnego oraz pytania niejawnego.
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
              
              {/* ZADANIE 1: PYTANIE JAWNE (Wyświetlane w trybach "both" i "public_only") */}
              {(examMode === "both" || examMode === "public_only") && (
                <div className={`p-5 rounded-2xl bg-stone-950/80 border border-stone-900 flex flex-col gap-3 justify-between ${examMode !== "both" ? "md:col-span-2" : ""}`}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                      Zadanie 1: Pytanie Jawne ({selectedSet.publicQuestion.category})
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-stone-100 font-serif leading-snug">
                      {selectedSet.publicQuestion.question}
                    </h4>
                  </div>
                </div>
              )}

              {/* ZADANIE 2: PYTANIE NIEJAWNE (Wyświetlane w trybach "both" i "unseen_only") */}
              {(examMode === "both" || examMode === "unseen_only") && (
                <div className={`p-5 rounded-2xl bg-stone-950/80 border border-stone-900 flex flex-col gap-3 justify-between ${examMode !== "both" ? "md:col-span-2" : ""}`}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-fit">
                      Zadanie 2: Pytanie Niejawne ({selectedSet.unseenQuestion.category})
                    </span>
                    
                    {/* Wyświetlanie obrazu (jeśli istnieje) */}
                    {selectedSet.unseenQuestion.image_url && (
                      <div className="w-full rounded-xl overflow-hidden border border-stone-900 bg-stone-950/50 shadow-md my-2 flex items-center justify-center max-h-64 sm:max-h-72">
                        <img 
                          src={selectedSet.unseenQuestion.image_url} 
                          alt="Materiał bodźcowy CKE"
                          className="max-w-full max-h-64 sm:max-h-72 object-contain select-none"
                        />
                      </div>
                    )}

                    {/* Wyświetlanie tekstu źródłowego (jeśli istnieje) */}
                    {selectedSet.unseenQuestion.stimulus_text && (
                      <div className="w-full rounded-xl p-4 sm:p-5 border border-stone-800 bg-stone-900/40 shadow-inner my-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800 text-left">
                        <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold block mb-2 select-none">
                          Tekst źródłowy :
                        </span>
                        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-serif italic whitespace-pre-line select-text">
                          {selectedSet.unseenQuestion.stimulus_text ? selectedSet.unseenQuestion.stimulus_text.replace(/\\n/g, "\n") : ""}
                        </p>
                      </div>
                    )}

                    <h4 className="text-sm sm:text-base font-bold text-stone-100 font-serif leading-snug">
                      {selectedSet.unseenQuestion.question}
                    </h4>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {selectedSet && (
          <>
            {/* KROK 2: STOPER I BRUDNOPISY */}
            <div className={`p-6 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col gap-5`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-850 pb-3">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                    Krok 2: Przygotowanie konspektu (15 minut)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Sporządź notatki i plany odpowiedzi dla zadań wybranego trybu treningu.
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
                {/* Brudnopis Zadanie 1 (Tylko w trybach "both" i "public_only") */}
                {(examMode === "both" || examMode === "public_only") && (
                  <div className={`flex flex-col gap-1.5 ${examMode !== "both" ? "md:col-span-2" : ""}`}>
                    <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold px-1">Brudnopis Zadanie 1 (Pytanie jawne):</span>
                    <textarea
                      placeholder="Zapisz tu tezy, argumenty i odwołania literackie do zadania 1..."
                      value={draftTextPublic}
                      onChange={(e) => setDraftTextPublic(e.target.value)}
                      rows={6}
                      className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans"
                    />
                  </div>
                )}

                {/* Brudnopis Zadanie 2 (Tylko w trybach "both" i "unseen_only") */}
                {(examMode === "both" || examMode === "unseen_only") && (
                  <div className={`flex flex-col gap-1.5 ${examMode !== "both" ? "md:col-span-2" : ""}`}>
                    <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold px-1">Brudnopis Zadanie 2 (Pytanie niejawne):</span>
                    <textarea
                      placeholder="Zapisz tu interpretację obrazu, wnioski i konteksty do zadania 2..."
                      value={draftTextUnseen}
                      onChange={(e) => setDraftTextUnseen(e.target.value)}
                      rows={6}
                      className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans"
                    />
                  </div>
                )}
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
                    Użyj przycisku dyktowania lub wpisz swoją wypowiedź monologową.
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
                placeholder="Wpisz lub kliknij 'Mów (Dyktuj)', aby nagrać swoją wypowiedź monologową dla wybranego zakresu pytań..."
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                rows={8}
                className="w-full bg-[#161210] border border-stone-800 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans"
              />

              <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                <span>Liczba znaków: {speechText.length}</span>
                <span className={currentWordCount > 2000 ? "text-red-400 font-semibold" : ""}>
                  Orientacyjna liczba słów: {currentWordCount} / 2000
                </span>
              </div>

              <button
                onClick={handleSubmitExam}
                disabled={evaluating || credits < KOSZT_EGZAMINU}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
              >
                {evaluating ? "⏳ Wirtualna Komisja CKE analizuje Twój egzamin..." : `🎙️ Wyślij zestaw do weryfikacji AI (Koszt: ${KOSZT_EGZAMINU} Tokeny)`}
              </button>

              {/* DYNAMICZNY OSTRZEGAWCZY BANER REASEKURACYJNY (WYMÓG UX) */}
              {evaluating && (
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-left text-[11px] text-purple-300/95 leading-relaxed font-sans mt-1 animate-pulse">
                  ⚠️ <strong className="text-purple-400 font-bold">Wirtualna Komisja AI analizuje Twój egzamin. Prosimy o cierpliwość i nieodświeżanie tej strony.</strong> Weryfikacja monologu i analiza obrazu wymagają czasu. Twój pakiet tokenów jest bezpieczny – w przypadku wystąpienia jakiegokolwiek błędu połączenia sieciowego, tokeny zostaną automatycznie zwrócone na Twoje konto.
                </div>
              )}
            </div>
          </>
        )}

        {/* KROK 4: REZULTAT OCENY KOMISJI */}
        {evaluationResult && (
          <div className="p-6 sm:p-8 rounded-3xl border border-emerald-900/30 bg-[#121614] flex flex-col gap-6 shadow-xl animate-slide-in w-full text-left">
            
            {/* Nagłówek wyniku z dużym badgem punktacji */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-stone-850 pb-5 gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-100 font-serif flex items-center gap-2">
                  <span>🎓</span> Oficjalny Protokół Egzaminu Ustnego (Ocena Komisji AI)
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mt-0.5">
                  Przeanalizowano wybrane zadania pomyślnie na podstawie kryteriów CKE
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

            {/* Analiza materiału bodźcowego i Podsumowanie komisji */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluationResult.imageAnalysis && (
                <div className="p-4 rounded-2xl bg-stone-950/45 border border-stone-900/80">
                  <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span>🔍</span> Ocena interpretacji materiału (Zadanie 2):
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
                  Wzorując się na prawdziwym egzaminie ustnym, komisja zadaje Ci pytania bezpośrednio nawiązujące do Twojego monologu:
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

            {/* Wskazówki merytoryczne (Modelowe plany odpowiedzi) wyświetlane PO egzaminie */}
            {selectedSet && (
              <div className="p-5 rounded-2xl bg-stone-950/60 border border-stone-900 flex flex-col gap-4 mt-2">
                <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <span>📖</span> Modelowe plany odpowiedzi (Wzorzec CKE):
                </h4>
                <p className="text-[9px] text-stone-500 mb-1 leading-normal">
                  Porównaj swoją wypowiedź z oficjalnym schematem odpowiedzi przygotowanym przez egzaminatorów:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(examMode === "both" || examMode === "public_only") && (
                    <div 
                      onClick={() => handleOpenOutlineModal(
                        "Zadanie 1 (Pytanie jawne)", 
                        evaluationResult?.modelOutlines?.public || selectedSet?.publicQuestion?.model_outline || "Brak opracowania."
                      )}
                      className="p-4 rounded-xl bg-stone-900/40 border border-stone-850 text-xs text-stone-400 leading-relaxed cursor-pointer hover:border-amber-500/30 hover:bg-stone-900/80 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200">Zadanie 1 (Pytanie jawne):</span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 opacity-60">Kliknij, aby otworzyć 🔍</span>
                      </div>
                      <p className="italic font-serif line-clamp-3 mt-1">
                        {cleanPreviewText(evaluationResult?.modelOutlines?.public || selectedSet?.publicQuestion?.model_outline)}
                      </p>
                    </div>
                  )}
                  {(examMode === "both" || examMode === "unseen_only") && (
                    <div 
                      onClick={() => handleOpenOutlineModal(
                        "Zadanie 2 (Pytanie niejawne)", 
                        evaluationResult?.modelOutlines?.unseen || selectedSet?.unseenQuestion?.model_outline || "Brak opracowania."
                      )}
                      className="p-4 rounded-xl bg-stone-900/40 border border-stone-850 text-xs text-stone-400 leading-relaxed cursor-pointer hover:border-amber-500/30 hover:bg-stone-900/80 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200">Zadanie 2 (Pytanie niejawne):</span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 opacity-60">Kliknij, aby otworzyć 🔍</span>
                      </div>
                      <p className="italic font-serif line-clamp-3 mt-1">
                        {cleanPreviewText(evaluationResult?.modelOutlines?.unseen || selectedSet?.unseenQuestion?.model_outline)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informacja małym drukiem */}
            <div className="text-[9px] text-stone-500 leading-relaxed font-sans px-1 mt-1 border-t border-stone-900/60 pt-3">
              * Uwaga: Symulator AI ocenia odpowiedź bardzo rygorystycznie i dosłownie na podstawie kryteriów CKE dla Formuły 2023. Rzeczywista ocena ludzkiej komisji na prawdziwym egzaminie państwowym może różnić się na korzyść zdającego z uwagi na bardziej elastyczną i dynamiczną reakcję podczas rozmowy.
            </div>

          </div>
        )}

      </main>

      {/* MODAL PODGLĄDU PEŁNYCH ODPOWIEDZI WZORCOWYCH CKE */}
      {isOutlineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsOutlineModalOpen(false)} />
          <div className={`relative max-w-xl w-full ${currentTheme.cardBg} border ${currentTheme.cardBorder} p-6 sm:p-8 rounded-3xl shadow-2xl z-10 animate-slide-in flex flex-col gap-4 text-left max-h-[85vh] overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-stone-850 pb-3">
              <h3 className="text-sm font-bold text-stone-100 font-serif uppercase tracking-wider text-amber-500">
                {outlineModalTitle}
              </h3>
              <button
                onClick={() => { playSound("click"); setIsOutlineModalOpen(false); }}
                className="text-stone-500 hover:text-stone-300 text-sm"
              >
                ✕ Zamknij
              </button>
            </div>
            <div className="overflow-y-auto pr-1 flex-1 max-h-[60vh] scrollbar-thin scrollbar-thumb-stone-800">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold block mb-2">
                Modelowy konspekt i teza (Wzorzec CKE):
              </span>
              <div className="space-y-1">
                {formatOutlineContent(outlineModalContent)}
              </div>
            </div>
            <div className="border-t border-stone-850 pt-3 text-[10px] text-stone-500 italic">
              * Możesz zaznaczyć i skopiować ten plan do swojego notesu.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================================================
// DOJEBANY ATMOSFERYCZNY KOMPONENT ŁADOWANIA (SUB-COMPONENT)
// ==========================================================================
function AtmosphericEssayLoader({ mode }: { mode: "analyze" | "generate" }) {
  const [step, setStep] = useState(0);

  // Dynamiczne, klimatyczne statusy w zależności od akcji
  const analyzeSteps = [
    "Zaparzanie świeżej herbaty i rozgrzewanie maszyn AI...",
    "Egzaminator CKE zakłada okulary i otwiera Twoje wypracowanie...",
    "Analizowanie bogactwa leksykalnego i struktur składniowych...",
    "Weryfikacja tekstu pod kątem błędów rzeczowych i kardynalnych...",
    "Przeszukiwanie bazy RAG w poszukiwaniu wzorców oceniania...",
    "Konstruowanie sprawiedliwej i pomocnej informacji zwrotnej..."
  ];

  const generateSteps = [
    "Zaparzanie świeżej herbaty i rozgrzewanie maszyn AI...",
    "Dobieranie optymalnych lektur i motywów literackich...",
    "Formułowanie dojrzałej, uniwersalnej tezy do tematu...",
    "Konstruowanie wieloaspektowych argumentów merytorycznych...",
    "Dobieranie i płynne wstrzykiwanie funkcjonalnych kontekstów CKE...",
    "Kończenie generowania przykładowego wypracowania..."
  ];

  const loadingSteps = mode === "generate" ? generateSteps : analyzeSteps;

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingSteps.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none w-full">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.1); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse-slow {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes particle-rise {
          0% { transform: translateY(20px) scale(0.8); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-70px) scale(0.4); opacity: 0; }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse-slow { animation: spin-reverse-slow 25s linear infinite; }
      `}} />

      {/* Środkowy element graficzny */}
      <div className="relative w-36 h-36 flex items-center justify-center mb-6">
        <div className="absolute inset-4 bg-amber-500/10 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/10 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-dotted border-orange-500/20 animate-spin-reverse-slow" />

        {/* Pływające pióro i otwarta księga (SVG) */}
        <div className="absolute z-10 animate-float flex items-center justify-center text-amber-500/80">
          <svg className="w-16 h-20 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.967 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            <path strokeLinecap="round" d="M5 8h4M5 11h3M5 14h4M15 8h4M16 11h3M15 14h3" strokeWidth="1" strokeOpacity="0.5" />
          </svg>
        </div>

        {/* Unoszące się iskrzące drobiny */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'particle-rise 4s ease-in-out infinite', left: '25%', bottom: '20px', animationDelay: '0.2s' }} />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animation: 'particle-rise 5s ease-in-out infinite', left: '45%', bottom: '20px', animationDelay: '1.8s' }} />
          <span className="absolute w-1 h-1 rounded-full bg-amber-500" style={{ animation: 'particle-rise 3.5s ease-in-out infinite', left: '65%', bottom: '20px', animationDelay: '0.9s' }} />
          <span className="absolute w-2 h-2 rounded-full bg-amber-300" style={{ animation: 'particle-rise 6s ease-in-out infinite', left: '35%', bottom: '20px', animationDelay: '2.5s' }} />
          <span className="absolute w-1 h-1 rounded-full bg-orange-500" style={{ animation: 'particle-rise 4.2s ease-in-out infinite', left: '55%', bottom: '20px', animationDelay: '1.1s' }} />
        </div>
      </div>

      {/* Podpisy statusu */}
      <div className="max-w-xs">
        <p className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-1.5 animate-pulse">
          {mode === "generate" ? "Trwa generowanie rozprawki..." : "Trwa analiza wypracowania..."}
        </p>
        <p className="text-[11px] text-stone-400 min-h-[32px] leading-relaxed transition-all duration-500">
          {loadingSteps[step]}
        </p>
      </div>
    </div>
  );
}