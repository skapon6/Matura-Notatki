// app/ocenianie-rozprawek/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getThemeClasses, CozyTheme } from "../lib/theme";

interface Match {
  start: number;
  end: number;
  annotation: any;
}

// Baza oficjalnych tematów maturalnych CKE (2023–2026)
const OFFICIAL_CKE_YEARS = [
  {
    year: "2026",
    formula: "Formuła 2023",
    topics: [
      { session: "Maj (Sesja główna)", number: "Temat 1", text: "Wpływ pracy na człowieka i na otaczającą go rzeczywistość." },
      { session: "Maj (Sesja główna)", number: "Temat 2", text: "Kiedy dla człowieka jest ważne, jak postrzegają go inni?" },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 1", text: "Rola tradycji i obyczaju w życiu zbiorowości." },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 2", text: "Samotność – wybór człowieka czy wynik okoliczności?" },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 1", text: "Co sprawia, że człowiek poświęca się dla drugiego człowieka?" },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 2", text: "Przeszłość jako inspiracja do działania." },
    ]
  },
  {
    year: "2025",
    formula: "Formuła 2023",
    topics: [
      { session: "Maj (Sesja główna)", number: "Temat 1", text: "Źródło nadziei w czasach trudnych dla człowieka." },
      { session: "Maj (Sesja główna)", number: "Temat 2", text: "Jak błędna ocena sytuacji wpływa na życie człowieka?" },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 1", text: "Dążenie do sprawiedliwości i jego konsekwencje dla jednostki i społeczeństwa." },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 2", text: "Wierność własnym zasadom w obliczu próby." },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 1", text: "Co sprawia, że człowiekowi łatwiej jest mierzyć się z życiowymi problemami?" },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 2", text: "Człowiek wobec upływu czasu i wobec śmierci." },
    ]
  },
  {
    year: "2024",
    formula: "Formuła 2023",
    topics: [
      { session: "Maj (Sesja główna)", number: "Temat 1", text: "Bunt i jego konsekwencje dla człowieka." },
      { session: "Maj (Sesja główna)", number: "Temat 2", text: "Jak relacja z drugą osobą kształtuje człowieka?" },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 1", text: "Trudne wybory moralne i ich wpływ na losy człowieka." },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 2", text: "Rola marzeń i ideałów w życiu jednostki." },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 1", text: "Co motywuje człowieka do przemiany?" },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 2", text: "Człowiek w poszukiwaniu prawdy o sobie i o świecie, w którym żyje." },
    ]
  },
  {
    year: "2023",
    formula: "Formuła 2023",
    topics: [
      { session: "Maj (Sesja główna)", number: "Temat 1", text: "Człowiek – istota pełna sprzeczności." },
      { session: "Maj (Sesja główna)", number: "Temat 2", text: "Co sprawia, że człowiek staje się dla drugiego człowieka bohaterem?" },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 1", text: "Różne postawy człowieka wobec cierpienia." },
      { session: "Czerwiec (Sesja dodatkowa)", number: "Temat 2", text: "Czym dla człowieka może być podróż?" },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 1", text: "Autentyczność i udawanie w relacjach międzyludzkich." },
      { session: "Sierpień (Sesja poprawkowa)", number: "Temat 2", text: "Wolność – dar, ale również odpowiedzialność." },
    ]
  }
];

// Zabezpieczenie przed Spamem
const isSpamText = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.some(word => word.length > 20);
};

export default function OcenianieRozprawekPage() {
  const router = useRouter();

  // Dynamiczny stan motywu
  const [currentTheme, setCurrentTheme] = useState<any>(getThemeClasses("library"));

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCurrentTheme(getThemeClasses(savedTheme));
    }
  }, []);

  // Stany autoryzacji i profilu
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Stany edytora i wyników AI
  const [essayText, setEssayText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationMode, setIsGenerationMode] = useState(false);
  const [isGeneratedByAi, setIsGeneratedByAi] = useState(false); // <--- NOWOŚĆ: Śledzenie czy tekst pochodzi z generowania AI
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [generatedContexts, setGeneratedContexts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  // Stany selektora tematów CKE (Modal)
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [activeYearTab, setActiveYearTab] = useState("2026");

  // Stan historii ocen
  const [history, setHistory] = useState<any[]>([]);

  // Powiadomienia wewnętrzne
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [topicSearch, setTopicSearch] = useState("");

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

  const handleSelectCkeTopic = (topicText: string) => {
    setSelectedTopic(topicText);
    setIsTopicModalOpen(false);
    triggerAlert("Wstawiono oficjalny temat z bazy CKE! 📜", "success");
  };

  const handleAnalyze = async () => {
    if (!selectedTopic.trim()) {
      triggerAlert("Wprowadź temat rozprawki przed rozpoczęciem analizy!", "error");
      return;
    }

    const topicWords = selectedTopic.split(/\s+/).filter(Boolean);
    const hasInvalidTopicWord = topicWords.some((word) => word.length > 20);

    if (hasInvalidTopicWord) {
      triggerAlert("Temat zawiera nieprawidłowe, zbyt długie słowa (maksymalnie 20 znaków na słowo)!", "error");
      return;
    }

    if (topicWords.length > 200) {
      triggerAlert("Temat rozprawki przekracza maksymalny limit 200 słów!", "error");
      return;
    }

    if (selectedTopic.length > 2000) {
      triggerAlert("Temat rozprawki przekracza maksymalny limit 2000 znaków!", "error");
      return;
    }

    if (essayText.length > 10000) {
      triggerAlert("Wypracowanie jest zbyt długie (maksymalnie 10 000 znaków)!", "error");
      return;
    }

    const essayWords = essayText.split(/\s+/).filter(Boolean);
    const hasInvalidEssayWord = essayWords.some((word) => word.length > 20);

    if (hasInvalidEssayWord) {
      triggerAlert("Wypracowanie zawiera nieprawidłowe, zbyt długie słowa (maksymalnie 20 znaków na słowo)!", "error");
      return;
    }

    const wordCount = essayWords.length;
    if (wordCount < 50) {
      triggerAlert("Wprowadzona rozprawka jest za krótka! Wklej co najmniej 50 słów, aby przeprowadzić analizę.", "error");
      return;
    }
    if (wordCount > 1500) {
      triggerAlert("Wprowadzona rozprawka przekracza maksymalny limit 1500 słów. Skróć tekst przed analizą.", "error");
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

  const handleGenerateEssay = async () => {
    if (!selectedTopic.trim()) {
      triggerAlert("Wprowadź temat rozprawki, na który mam napisać przykładową pracę!", "error");
      return;
    }

    const topicWords = selectedTopic.split(/\s+/).filter(Boolean);
    const hasInvalidTopicWord = topicWords.some((word) => word.length > 20);

    if (hasInvalidTopicWord) {
      triggerAlert("Temat zawiera nieprawidłowe, zbyt długie słowa (maksymalnie 20 znaków na słowo)!", "error");
      return;
    }

    if (topicWords.length > 200) {
      triggerAlert("Temat rozprawki przekracza maksymalny limit 200 słów!", "error");
      return;
    }

    if (selectedTopic.length > 2000) {
      triggerAlert("Temat rozprawki przekracza maksymalny limit 2000 znaków!", "error");
      return;
    }

    if (!profile || profile.essay_credits <= 0) {
      triggerAlert("Brak wolnych kredytów na wygenerowanie rozprawki! Kup pakiet Premium.", "error");
      return;
    }

    setIsGenerating(true);
    setGeneratedContexts([]);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/generate-essay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: selectedTopic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd podczas generowania wypracowania.");
      }

      setProfile((prev: any) => ({ ...prev, essay_credits: data.newCredits }));
      setEssayText(data.essayText);
      setIsGeneratedByAi(true); // <--- Aktywujemy blokadę kopiowania dla tekstu wygenerowanego przez AI
      if (data.alternativeContexts) {
        setGeneratedContexts(data.alternativeContexts);
      }
      setIsGenerationMode(false);
      setActiveTab("write");
      triggerAlert("Przykładowa rozprawka została wygenerowana! Pobrano 1 kredyt.", "success");

    } catch (err: any) {
      console.error("Błąd podczas generowania wypracowania:", err);
      triggerAlert(err.message || "Wystąpił błąd serwera. Spróbuj ponownie.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadFromHistory = (item: any) => {
    setSelectedTopic(item.topic);
    setEssayText(item.essay_text);
    setAnalysisResult(item.analysis_result);
    setGeneratedContexts([]);
    setIsGenerationMode(false);
    setIsGeneratedByAi(false); // Tekst z historii własnych prac ucznia jest odblokowany
    setActiveTab("preview");
    triggerAlert("Pomyślnie wczytano pracę z historii (0 kredytów)!", "success");
  };

  const renderHighlightedText = () => {
    if (!analysisResult || !analysisResult.annotations || analysisResult.annotations.length === 0) {
      return <p className="whitespace-pre-wrap leading-relaxed">{essayText}</p>;
    }

    const escapedText = essayText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const matches: Match[] = [];

    analysisResult.annotations.forEach((anno: any) => {
      if (!anno.original || !anno.original.trim()) return;

      const escapedOriginal = anno.original
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      let idx = escapedText.indexOf(escapedOriginal);
      while (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + escapedOriginal.length,
          annotation: anno
        });
        idx = escapedText.indexOf(escapedOriginal, idx + 1);
      }
    });

    matches.sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      return (b.end - b.start) - (a.end - a.start);
    });

    const nonOverlappingMatches: Match[] = [];
    let lastIndex = 0;

    for (const m of matches) {
      if (m.start >= lastIndex) {
        nonOverlappingMatches.push(m);
        lastIndex = m.end;
      }
    }

    let resultHtml = "";
    let currentIdx = 0;

    nonOverlappingMatches.forEach((m) => {
      resultHtml += escapedText.substring(currentIdx, m.start);

      let colorClass = "";
      if (m.annotation.type === "rzeczowy") {
        colorClass = "bg-amber-950/50 border-b-2 border-amber-500 text-amber-200 cursor-help";
      } else if (m.annotation.type === "językowy") {
        colorClass = "bg-blue-950/50 border-b-2 border-blue-500 text-blue-200 cursor-help";
      } else if (m.annotation.type === "ortograficzny") {
        colorClass = "bg-purple-950/50 border-b-2 border-purple-500 text-purple-200 cursor-help";
      } else {
        colorClass = "bg-red-950/50 border-b-2 border-red-500 text-red-200 cursor-help";
      }

      const originalText = escapedText.substring(m.start, m.end);
      const explanation = m.annotation.explanation.replace(/"/g, "&quot;");
      const replacement = m.annotation.replacement.replace(/"/g, "&quot;");

      resultHtml += `<span class="${colorClass} relative group inline-block font-medium">${originalText}<span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-stone-900 border border-stone-800 text-stone-300 text-[11px] p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 leading-relaxed font-sans font-normal"><strong class="text-[#c68a4c] uppercase tracking-wider block mb-1">Błąd ${m.annotation.type}:</strong>${explanation}<br/><span class="text-emerald-400 font-semibold block mt-1.5">Poprawnie: ${replacement}</span></span></span>`;

      currentIdx = m.end;
    });

    resultHtml += escapedText.substring(currentIdx);

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: resultHtml }} 
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
  const currentWordCount = essayText.split(/\s+/).filter(Boolean).length;

  const isTopicSpam = isSpamText(selectedTopic);
  const isEssaySpam = isSpamText(essayText);
  const isTopicLengthExceeded = selectedTopic.length > 2000;
  const isEssayLengthExceeded = essayText.length > 10000;
  const topicWordsCount = selectedTopic.split(/\s+/).filter(Boolean).length;
  const isTopicWordsExceeded = topicWordsCount > 200;
  const hasValidationError = isTopicSpam || isEssaySpam || isTopicLengthExceeded || isEssayLengthExceeded || isTopicWordsExceeded;

  const currentYearData = OFFICIAL_CKE_YEARS.find(y => y.year === activeYearTab);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans p-6 items-center`}>
      
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
          notification.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" : "bg-red-950/90 border-red-500/30 text-red-200"
        }`}>
          <p className="text-xs font-semibold leading-relaxed pr-2">{notification.message}</p>
        </div>
      )}

      {/* NOWOCZESNY, CZYTELNY MODAL TEMATÓW CKE */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#181311] border border-stone-800 rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-hidden">
            
            {/* Nagłówek i Wyszukiwarka */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800/80 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-amber-950/40 border border-amber-900/40">📜</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif text-stone-100">Baza Oficjalnych Tematów CKE</h3>
                  <p className="text-[11px] text-stone-400">Wybierz gotowy temat maturalny, aby przeanalizować pracę</p>
                </div>
              </div>

              {/* Wyszukiwarka motywów */}
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Szukaj (np. bunt, praca, nadzieja)..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2 pl-8 pr-8 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/70 transition-all font-sans"
                />
                {topicSearch && (
                  <button 
                    onClick={() => setTopicSearch("")} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Zakładki Roczników */}
            {!topicSearch && (
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-stone-800/50">
                <div className="flex gap-2">
                  {OFFICIAL_CKE_YEARS.map((y) => (
                    <button
                      key={y.year}
                      onClick={() => setActiveYearTab(y.year)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                        activeYearTab === y.year
                          ? "bg-[#c68a4c] text-stone-950 shadow-lg scale-102 font-serif"
                          : "bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                      }`}
                    >
                      <span>Matura {y.year}</span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-amber-500/80 font-mono tracking-widest hidden md:inline-block">
                  {currentYearData?.formula}
                </span>
              </div>
            )}

            {/* Siatka Tematów */}
            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {topicSearch ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-stone-400">
                    Wyniki wyszukiwania dla frazy: <strong className="text-amber-400">„{topicSearch}”</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {OFFICIAL_CKE_YEARS.flatMap(y => 
                      y.topics.map(t => ({ ...t, year: y.year }))
                    ).filter(t => t.text.toLowerCase().includes(topicSearch.toLowerCase())).map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectCkeTopic(t.text)}
                        className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 hover:border-amber-600/60 hover:bg-[#231b17] transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-900/40">
                            Matura {t.year} • {t.session.split(" ")[0]}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">{t.number}</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed group-hover:text-amber-200 transition-colors">
                          „{t.text}”
                        </p>
                        <div className="text-[10px] text-[#c68a4c] font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          Wybierz ten temat <span>→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <h4 className="text-[11px] uppercase tracking-widest text-amber-400 font-bold">
                        Sesja Główna (Maj)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentYearData?.topics.filter(t => t.session.includes("Maj")).map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectCkeTopic(t.text)}
                          className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 hover:border-amber-500/60 hover:bg-[#241c18] transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm hover:shadow-xl"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                              {t.number}
                            </span>
                            <span className="text-[10px] text-[#c68a4c] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Wstaw do edytora ↵
                            </span>
                          </div>
                          <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">
                            „{t.text}”
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentYearData?.topics.some(t => t.session.includes("Czerwiec")) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        <h4 className="text-[11px] uppercase tracking-widest text-sky-400 font-bold">
                          Sesja Dodatkowa (Czerwiec)
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentYearData?.topics.filter(t => t.session.includes("Czerwiec")).map((t, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectCkeTopic(t.text)}
                            className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 hover:border-sky-500/60 hover:bg-[#152026] transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm hover:shadow-xl"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-950/60 text-sky-300 border border-sky-800/40">
                                {t.number}
                              </span>
                              <span className="text-[10px] text-sky-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                Wstaw do edytora ↵
                              </span>
                            </div>
                            <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">
                              „{t.text}”
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      <h4 className="text-[11px] uppercase tracking-widest text-orange-400 font-bold">
                        Sesja Poprawkowa (Sierpień)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentYearData?.topics.filter(t => t.session.includes("Sierpień")).map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectCkeTopic(t.text)}
                          className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 hover:border-orange-500/60 hover:bg-[#261914] transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm hover:shadow-xl"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-orange-950/60 text-orange-300 border border-orange-800/40">
                              {t.number}
                            </span>
                            <span className="text-[10px] text-orange-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Wstaw do edytora ↵
                            </span>
                          </div>
                          <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">
                            „{t.text}”
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stopka Modalu */}
            <div className="border-t border-stone-800/80 pt-3 flex justify-between items-center text-[11px] text-stone-500">
              <span>Wszystkie tematy pochodzą z oficjalnych arkuszy CKE</span>
              <button
                onClick={() => setIsTopicModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-all"
              >
                Zamknij okno
              </button>
            </div>

          </div>
        </div>
      )}

      <div className={`max-w-4xl w-full ${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl p-6 sm:p-8 shadow-xl mt-8 flex flex-col gap-6 transition-colors duration-500`}>
        
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
            className={`self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:scale-105 active:scale-95 transition-all`}
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
              <p className="text-[11px] text-stone-500">Używasz bezpiecznego systemu tokenów edukacyjnych.</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
                  Temat Twojej rozprawki (Maksymalnie 200 słów)
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(true)}
                  disabled={isAnalyzing || isGenerating}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#231b16] border border-amber-800/40 hover:border-amber-500/70 hover:bg-[#2c221c] text-[#c68a4c] hover:text-[#d99c5d] text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span>📚</span>
                  <span>Wybierz z bazy CKE (2022–2026) ▾</span>
                </button>
              </div>

              <input 
                type="text"
                placeholder="Wpisz tutaj pełny temat swojej rozprawki lub wybierz z bazy CKE powyżej..."
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={isAnalyzing || isGenerating}
                className="w-full bg-stone-900/90 border border-stone-800 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 font-sans transition-all"
              />

              {isTopicSpam && (
                <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse">
                  ⚠️ Wykryto nieprawidłowe, zbyt długie słowo bez spacji (maksymalnie 20 znaków). Popraw temat, aby odblokować analizę!
                </p>
              )}
              {isTopicLengthExceeded && (
                <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse">
                  ⚠️ Temat rozprawki przekracza maksymalny limit 2000 znaków!
                </p>
              )}
              {isTopicWordsExceeded && (
                <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse">
                  ⚠️ Temat rozprawki przekracza maksymalny limit 200 słów!
                </p>
              )}
            </div>

            {/* Tryb wyboru generowania rozprawki */}
            <div className="flex items-center gap-2.5 bg-stone-900/40 border border-stone-800/60 p-3 rounded-xl">
              <input 
                type="checkbox"
                id="generationMode"
                checked={isGenerationMode}
                onChange={(e) => {
                  setIsGenerationMode(e.target.checked);
                  if (e.target.checked) {
                    setEssayText(""); 
                    setGeneratedContexts([]);
                    setAnalysisResult(null);
                    setIsGeneratedByAi(false);
                  }
                }}
                disabled={isAnalyzing || isGenerating}
                className="w-4 h-4 rounded border-stone-800 text-amber-500 focus:ring-amber-500 bg-stone-950 cursor-pointer accent-[#c68a4c]"
              />
              <label htmlFor="generationMode" className="text-xs font-semibold text-stone-300 cursor-pointer select-none">
                Chcę wygenerować przykładową rozprawkę przez AI (zamiast oceniać własną)
              </label>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-stone-500 font-semibold block">
                    Treść Twojego wypracowania
                  </label>
                  {/* DYSKRETNA INFORMACJA O BLOKADZIE DLA WZORCA AI */}
                  {isGeneratedByAi && (
                    <span className="text-[10px] text-amber-500/90 font-semibold flex items-center gap-1 bg-amber-950/40 border border-amber-900/50 px-2.5 py-0.5 rounded-md">
                      🔒 Wzorzec AI (Tylko do odczytu / Kopiowanie zablokowane)
                    </span>
                  )}
                </div>

                <textarea
                  rows={12}
                  placeholder={
                    isGenerationMode 
                      ? "Opcja automatycznego generowania rozprawki przez AI jest włączona. Treść Twojego wypracowania jest zablokowana. Wpisz lub wybierz temat powyżej i kliknij przycisk generowania." 
                      : "Wklej tutaj treść swojej rozprawki (minimum 50 słów)..."
                  }
                  value={essayText}
                  onChange={(e) => {
                    setEssayText(e.target.value);
                    // Gdy uczeń sam modyfikuje lub pisze własny tekst, wyłączamy blokadę kopiowania
                    setIsGeneratedByAi(false);
                  }}
                  onCopy={(e) => {
                    // BLOKADA KOPIOWANIA WYŁĄCZNIE DLA TEKSTU WYGENEROWANEGO PRZEZ AI
                    if (isGeneratedByAi) {
                      e.preventDefault();
                      triggerAlert("🔒 Kopiowanie prac wzorcowych AI jest zablokowane. Wykorzystaj ten tekst do inspiracji i samodzielnej nauki!", "error");
                    }
                  }}
                  onCut={(e) => {
                    if (isGeneratedByAi) {
                      e.preventDefault();
                      triggerAlert("🔒 Kopiowanie prac wzorcowych AI jest zablokowane.", "error");
                    }
                  }}
                  onContextMenu={(e) => {
                    if (isGeneratedByAi) {
                      e.preventDefault();
                    }
                  }}
                  disabled={isAnalyzing || isGenerating || isGenerationMode}
                  className={`w-full bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans disabled:opacity-50 disabled:cursor-not-allowed ${
                    isGeneratedByAi ? "select-none cursor-default" : ""
                  }`}
                />

                {isEssaySpam && (
                  <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse">
                    ⚠️ Wykryto nieprawidłowe, zbyt długie słowo bez spacji (maksymalnie 20 znaków). Popraw wypracowanie, aby odblokować analizę!
                  </p>
                )}
                {isEssayLengthExceeded && (
                  <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse">
                    ⚠️ Wypracowanie przekracza maksymalny limit 10 000 znaków!
                  </p>
                )}
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>Liczba znaków: {essayText.length}</span>
                  <span className={currentWordCount > 1500 ? "text-red-400 font-semibold" : ""}>
                    Orientacyjna liczba słów: {currentWordCount} / 1500
                  </span>
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
              <div className="flex flex-col gap-2 w-full">
                {isGenerationMode ? (
                  <button
                    onClick={handleGenerateEssay}
                    disabled={isAnalyzing || isGenerating || isTopicSpam || isTopicLengthExceeded || isTopicWordsExceeded}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all text-xs sm:text-sm shadow-md disabled:bg-stone-800 disabled:text-stone-500 cursor-pointer"
                  >
                    {isGenerating ? "✍ Trwa generowanie rozprawki..." : "Generuj przykładową rozprawkę (1 kredyt)"}
                  </button>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || isGenerating || hasValidationError}
                    className="w-full py-3 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold transition-all text-xs sm:text-sm shadow-md disabled:bg-stone-800 disabled:text-stone-500 cursor-pointer"
                  >
                    {isAnalyzing ? "🤖 Trwa analiza tekstu..." : "Przeanalizuj rozprawkę (1 kredyt)"}
                  </button>
                )}

                {(isAnalyzing || isGenerating) && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/30 text-left text-[11px] text-amber-400/95 leading-relaxed font-sans mt-1 animate-pulse">
                    ⚠️ <strong className="text-amber-300 font-bold">Trwa analiza przez sztuczną inteligencję. Prosimy o cierpliwość i nieodświeżanie tej strony.</strong> Zamknięcie lub przeładowanie karty w tym momencie uniemożliwi wyświetlenie wyników. Twój kredyt jest bezpieczny – w przypadku wystąpienia jakiegokolwiek błędu połączenia sieciowego, pobrany token zostanie automatycznie zwrócony na Twoje konto.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-3.5 bg-red-950/20 border border-red-950/40 rounded-xl text-xs text-red-400">
                Wykorzystałeś wszystkie darmowe oceny wypracowań. Kup pakiet Premium, aby natychmiast otrzymać kolejne próby! 🚀
              </div>
            )}

            {activeTab === "write" && generatedContexts.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-stone-950/50 border border-stone-800/80 animate-fade-in">
                <h4 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-3 flex items-center gap-2">
                  <span>💡</span> Propozycje alternatywnych kontekstów do tego tematu:
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {generatedContexts.map((ctx, index) => (
                    <div key={index} className="p-3 rounded-xl bg-stone-900/60 border border-stone-800/50 text-[11px] leading-relaxed">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-stone-200">{ctx.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-950/40 text-amber-400 border border-amber-900/30">
                          {ctx.type}
                        </span>
                      </div>
                      <p className="text-stone-400">{ctx.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prawa kolumna: Raport AI */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {isAnalyzing || isGenerating ? (
              <div className="rounded-2xl border border-amber-950/40 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
                <AtmosphericEssayLoader mode={isGenerating ? "generate" : "analyze"} />
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

            {/* DYSKRETNE ZASTRZEŻENIE DOTYCZĄCE PUNKTACJI AI */}
            <div className="p-3.5 rounded-2xl bg-stone-950/50 border border-stone-800/70 flex items-start gap-2.5 text-[11px] text-stone-400 leading-relaxed font-sans shadow-inner">
              <span className="text-amber-500 text-sm shrink-0 mt-0.5">ℹ️</span>
              <p>
                <strong className="text-stone-300 font-semibold">Uwaga:</strong> Model AI dokonuje bardzo rygorystycznej i dosłownej oceny według wytycznych CKE (a zwłaszcza zasad dotyczących interpunkcji, stylu i gramatyki). Rzeczywista punktacja na egzaminie państwowym może różnić się na korzyść zdającego z uwagi na bardziej elastyczną i holistyczną ocenę ludzkiego egzaminatora.
              </p>
            </div>
          </div>

        </div>

        {/* Sekcja historii */}
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

// ==========================================================================
// KOMPONENT ŁADOWANIA (SUB-COMPONENT)
// ==========================================================================
function AtmosphericEssayLoader({ mode }: { mode: "analyze" | "generate" }) {
  const [step, setStep] = useState(0);

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

      <div className="relative w-36 h-36 flex items-center justify-center mb-6">
        <div className="absolute inset-4 bg-amber-500/10 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/10 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-dotted border-orange-500/20 animate-spin-reverse-slow" />

        <div className="absolute z-10 animate-float flex items-center justify-center text-amber-500/80">
          <svg className="w-16 h-20 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.967 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            <path strokeLinecap="round" d="M5 8h4M5 11h3M5 14h4M15 8h4M16 11h3M15 14h3" strokeWidth="1" strokeOpacity="0.5" />
          </svg>
        </div>

        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'particle-rise 4s ease-in-out infinite', left: '25%', bottom: '20px', animationDelay: '0.2s' }} />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animation: 'particle-rise 5s ease-in-out infinite', left: '45%', bottom: '20px', animationDelay: '1.8s' }} />
          <span className="absolute w-1 h-1 rounded-full bg-amber-500" style={{ animation: 'particle-rise 3.5s ease-in-out infinite', left: '65%', bottom: '20px', animationDelay: '0.9s' }} />
          <span className="absolute w-2 h-2 rounded-full bg-amber-300" style={{ animation: 'particle-rise 6s ease-in-out infinite', left: '35%', bottom: '20px', animationDelay: '2.5s' }} />
          <span className="absolute w-1 h-1 rounded-full bg-orange-500" style={{ animation: 'particle-rise 4.2s ease-in-out infinite', left: '55%', bottom: '20px', animationDelay: '1.1s' }} />
        </div>
      </div>

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