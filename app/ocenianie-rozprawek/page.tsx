"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function OcenianieRozprawekPage() {
  const router = useRouter();

  // Stany autoryzacji i profilu
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Stany edytora i wyników AI
  const [essayText, setEssayText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  // Stan historii ocen
  const [history, setHistory] = useState<any[]>([]);

  // Powiadomienia wewnętrzne
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerAlert = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    async function checkUserAndCredits() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push("/");
          return;
        }
        setUser(session.user);
        await fetchUserProfile(session.user.id);
        await fetchUserHistory(session.user.id);
      } catch (err) {
        console.error(err);
        router.push("/");
      } finally {
        setCheckingAuth(false);
      }
    }
    checkUserAndCredits();
  }, [router]);

  async function fetchUserProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status, essay_credits")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  }

  // Pobranie historii zapisanych ocen użytkownika
  async function fetchUserHistory(userId: string) {
    const { data, error } = await supabase
      .from("essay_evaluations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Błąd podczas pobierania historii:", error);
    } else if (data) {
      setHistory(data);
    }
  }

  const handleAnalyze = async () => {
    if (!selectedTopic.trim()) {
      triggerAlert("Wprowadź temat rozprawki przed rozpoczęciem analizy!", "error");
      return;
    }

    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      triggerAlert("Wprowadzona rozprawka jest za krótka! Wklej co najmniej 50 słów, aby przeprowadzić analizę.", "error");
      return;
    }

    if (!profile || profile.essay_credits <= 0) {
      triggerAlert("Brak wolnych kredytów na ocenę! Kup pakiet Premium, aby otrzymać dodatkowe próby.", "error");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setActiveTab("write");

    try {
      const response = await fetch("/api/analyze-essay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: selectedTopic,
          essayText: essayText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd podczas analizy.");
      }

      setProfile((prev: any) => ({ ...prev, essay_credits: data.newCredits }));
      setAnalysisResult(data.analysisResult);
      setActiveTab("preview");
      
      // Odśwież listę historii, aby nowo oceniona praca od razu się tam pojawiła
      if (user) {
        await fetchUserHistory(user.id);
      }
      
      triggerAlert("Analiza ukończona pomyślnie! Pobrano 1 kredyt.", "success");

    } catch (err: any) {
      console.error("Błąd podczas analizy wypracowania:", err);
      triggerAlert(err.message || "Wystąpił błąd serwera. Spróbuj ponownie.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ładowanie historycznej pracy bezpośrednio do stanów
  const loadFromHistory = (item: any) => {
    setSelectedTopic(item.topic);
    setEssayText(item.essay_text);
    setAnalysisResult(item.analysis_result);
    setActiveTab("preview");
    triggerAlert("Pomyślnie wczytano pracę z historii (0 kredytów)!", "success");
  };

  const renderHighlightedText = () => {
    if (!analysisResult || !analysisResult.annotations || analysisResult.annotations.length === 0) {
      return <p className="whitespace-pre-wrap leading-relaxed">{essayText}</p>;
    }

    let tempText = essayText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const sortedAnnotations = [...analysisResult.annotations].sort(
      (a, b) => b.original.length - a.original.length
    );

    sortedAnnotations.forEach((anno: any) => {
      if (!anno.original.trim()) return;

      const escapedOriginal = anno.original.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedOriginal})`, "g");

      let colorClass = "";
      if (anno.type === "rzeczowy") {
        colorClass = "bg-amber-950/50 border-b-2 border-amber-500 text-amber-200 cursor-help";
      } else if (anno.type === "językowy") {
        colorClass = "bg-blue-950/50 border-b-2 border-blue-500 text-blue-200 cursor-help";
      } else if (anno.type === "ortograficzny") {
        colorClass = "bg-purple-950/50 border-b-2 border-purple-500 text-purple-200 cursor-help";
      } else {
        colorClass = "bg-red-950/50 border-b-2 border-red-500 text-red-200 cursor-help";
      }

      tempText = tempText.replace(
        regex,
        `<span class="${colorClass} relative group inline-block font-medium">${anno.original}<span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-stone-900 border border-stone-800 text-stone-300 text-[11px] p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 leading-relaxed font-sans font-normal"><strong class="text-[#c68a4c] uppercase tracking-wider block mb-1">Błąd ${anno.type}:</strong>${anno.explanation}<br/><span class="text-emerald-400 font-semibold block mt-1.5">Poprawnie: ${anno.replacement}</span></span></span>`
      );
    });

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: tempText }} 
        className="whitespace-pre-wrap leading-loose text-stone-300 font-sans text-xs sm:text-sm"
      />
    );
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">🤖</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Łączenie z modułem sztucznej inteligencji...
        </p>
      </div>
    );
  }

  const creditsRemaining = profile?.essay_credits ?? 0;
  const isPremiumUser = profile?.subscription_status === "paid" || profile?.subscription_status === "admin";

  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
          notification.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" : "bg-red-950/90 border-red-500/30 text-red-200"
        }`}>
          <p className="text-xs font-semibold leading-relaxed pr-2">{notification.message}</p>
        </div>
      )}

      <div className="max-w-4xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-8 shadow-xl mt-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Asystent Rozprawek AI</h1>
              <p className="text-xs text-stone-400 mt-1">Interaktywna weryfikacja prac z języka polskiego</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-amber-700 transition-all"
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Informacja o Kredytach */}
        <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-xs font-bold text-stone-300">Stan Twojego konta:</p>
              <p className="text-[11px] text-stone-500">
                {isPremiumUser 
                  ? "Posiadasz nielimitowane notatki oraz pakiet 10 ocen wypracowań." 
                  : "Używasz darmowego konta testowego z limitem 1 bezpłatnej oceny."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold font-mono px-3.5 py-2 rounded-xl ${
              creditsRemaining > 0 ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" : "bg-red-950/30 text-red-400 border border-red-900/30"
            }`}>
              Pozostało ocen: {creditsRemaining}
            </span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Lewa kolumna: Edytor i podgląd */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-amber-500 font-semibold block mb-2">
                Temat Twojej rozprawki
              </label>
              <input 
                type="text"
                placeholder="Wpisz tutaj pełny temat swojej rozprawki..."
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={isAnalyzing}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 font-sans"
              />
            </div>

            {analysisResult && (
              <div className="flex border-b border-stone-800 gap-2 mb-1">
                <button
                  onClick={() => setActiveTab("write")}
                  className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all ${
                    activeTab === "write" 
                      ? "text-[#c68a4c] border-b-2 border-[#c68a4c]" 
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  ✍ Edytor tekstu
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all ${
                    activeTab === "preview" 
                      ? "text-emerald-400 border-b-2 border-emerald-400" 
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  🔍 Podgląd korekt i błędów
                </button>
              </div>
            )}

            {activeTab === "write" ? (
              <div>
                <label className="text-xs uppercase tracking-widest text-stone-500 font-semibold block mb-2">
                  Treść Twojego wypracowania
                </label>
                <textarea
                  rows={12}
                  placeholder="Wklej tutaj treść swojej rozprawki (minimum 50 słów)..."
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 font-sans leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>Liczba znaków: {essayText.length}</span>
                  <span>Orientacyjna liczba słów: {essayText.split(/\s+/).filter(Boolean).length}</span>
                </div>
              </div>
            ) : (
              <div className="bg-stone-950/40 border border-stone-800 rounded-2xl p-5 min-h-[300px] shadow-inner">
                <div className="mb-4 border-b border-stone-900 pb-3 flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Zweryfikowana treść wypracowania:</span>
                  <span className="text-[10px] text-stone-500">Najedź myszką na błąd, aby zobaczyć wyjaśnienie</span>
                </div>
                {renderHighlightedText()}
              </div>
            )}

            {creditsRemaining > 0 ? (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold transition-all text-xs sm:text-sm shadow-md disabled:bg-stone-800 disabled:text-stone-500"
              >
                {isAnalyzing ? "🤖 Trwa analiza tekstu przez AI... (to potrwa chwilę)" : "Przeanalizuj rozprawkę (Pobiera 1 kredyt)"}
              </button>
            ) : (
              <div className="text-center p-3.5 bg-red-950/20 border border-red-950/40 rounded-xl text-xs text-red-400">
                Wykorzystałeś wszystkie darmowe oceny wypracowań. Kup pakiet Premium, aby natychmiast otrzymać kolejne próby! 🚀
              </div>
            )}
          </div>

          {/* Prawa kolumna: Miejsce na wyniki (Raport AI) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {isAnalyzing ? (
              <div className="rounded-2xl border border-amber-950/40 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
                <div className="text-4xl animate-spin mb-3">🔮</div>
                <h3 className="text-sm font-bold text-stone-200 font-serif">Algorytm pracuje...</h3>
                <p className="text-[11px] text-stone-500 mt-2 max-w-[200px] leading-relaxed">
                  Trwa weryfikacja poprawności stylistycznej, kompozycji oraz kryteriów rzeczowych CKE.
                </p>
              </div>
            ) : analysisResult ? (
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 flex flex-col gap-3.5 animate-fade-in max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Wynik Analizy</h3>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                    {analysisResult.score}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {analysisResult.details.map((detail: any, i: number) => (
                    <div key={i} className="text-[11px] border-b border-stone-900/55 pb-2.5 last:border-none">
                      <div className="flex justify-between font-bold text-stone-200 mb-1">
                        <span>{detail.criterion}</span>
                        <span className="text-[#c68a4c] font-mono">{detail.points}</span>
                      </div>
                      <p className="text-stone-400 font-sans leading-relaxed">{detail.comment}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-800 pt-3 mt-1">
                  <h4 className="text-[11px] font-bold text-stone-200 font-serif uppercase tracking-wider text-[#c68a4c] mb-1">Podsumowanie krytyka:</h4>
                  <p className="text-[11.5px] text-stone-400 italic leading-relaxed">{analysisResult.summary}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
                <span className="text-4xl mb-3">🤖</span>
                <h3 className="text-sm font-bold text-stone-200 font-serif">Gotowy do analizy</h3>
                <p className="text-xs text-stone-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                  Po kliknięciu przycisku oceny, tutaj pojawi się kompletny, szczegółowy raport CKE z punktacją i uwagami stylisty.
                </p>
              </div>
            )}
            
            <div className="rounded-2xl bg-stone-900/40 border border-stone-800/60 p-4">
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">🔍 Zasady oceniania</h4>
              <ul className="text-[11px] text-stone-400 space-y-2">
                <li className="flex gap-2"><span>✔</span> Sprawdzenie poprawności kompozycji (wstęp, rozwinięcie, zakończenie)</li>
                <li className="flex gap-2"><span>✔</span> Weryfikacja poprawności rzeczowej i językowej</li>
                <li className="flex gap-2"><span>✔</span> Wykrywanie ewentualnego błędu kardynalnego</li>
              </ul>
            </div>
          </div>

        </div>

        {/* [NOWOŚĆ] Sekcja historii prac użytkownika na samym dole strony */}
        {history.length > 0 && (
          <div className="border-t border-stone-800/60 pt-6 mt-2">
            <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-4 flex items-center gap-2">
              <span>📅</span> Historia Twoich prac i ocen ({history.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 hover:border-amber-700/50 hover:bg-[#1f1915]/60 transition-all cursor-pointer flex justify-between items-center group"
                >
                  <div className="flex flex-col gap-1 pr-4 min-w-0">
                    <h4 className="text-xs font-bold text-stone-200 truncate font-serif leading-tight">
                      {item.topic}
                    </h4>
                    <span className="text-[10px] text-stone-500">
                      {new Date(item.created_at).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono bg-stone-900/80 px-2.5 py-1.5 rounded-xl border border-stone-800 group-hover:border-emerald-500/30 transition-all">
                      {item.score}
                    </span>
                    <span className="text-stone-600 group-hover:text-amber-500 transition-all text-xs">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}