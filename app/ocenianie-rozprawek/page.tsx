// app/ocenianie-rozprawek/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getThemeClasses, CozyTheme } from "../lib/theme";
import { playSound } from "../lib/sounds";
import { AtmosphericEssayLoader } from "../components/AtmosphericEssayLoader";

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

const isSpamText = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.some(word => word.length > 25);
};

const safeString = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeString).join(", ");
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "";
    }
  }
  return String(val);
};

const escapeHtml = (val: any): string => {
  const str = safeString(val);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default function OcenianieRozprawekPage() {
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState<any>(getThemeClasses("library"));

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCurrentTheme(getThemeClasses(savedTheme));
    }
  }, []);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [essayText, setEssayText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationMode, setIsGenerationMode] = useState(false);
  const [isGeneratedByAi, setIsGeneratedByAi] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [generatedContexts, setGeneratedContexts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [activeYearTab, setActiveYearTab] = useState("2026");

  const [history, setHistory] = useState<any[]>([]);
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
    
    if (data) setProfile(data);
  }

  async function fetchUserHistory(userId: string) {
    const { data, error } = await supabase
      .from("essay_evaluations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (!error && data) setHistory(data);
  }

  const handleSelectCkeTopic = (topicText: string) => {
    setSelectedTopic(topicText);
    setIsTopicModalOpen(false);
    triggerAlert("Wstawiono oficjalny temat z bazy CKE! 📜", "success");
  };

const handleAnalyze = async () => {
    if (isGeneratedByAi) {
      triggerAlert("Ta praca została wygenerowana jako wzorzec AI. Napisz własną rozprawkę!", "error");
      return;
    }
    if (!selectedTopic.trim()) {
      triggerAlert("Wprowadź temat rozprawki przed rozpoczęciem analizy!", "error");
      return;
    }

    const essayWords = essayText.split(/\s+/).filter(Boolean);
    const wordCount = essayWords.length;
    if (wordCount < 50) {
      triggerAlert("Rozprawka jest za krótka! Wklej co najmniej 50 słów.", "error");
      return;
    }

    if (!profile || profile.essay_credits <= 0) {
      triggerAlert("Brak wolnych kredytów na ocenę! Doładuj kredyty lub kup nowy pakiet.", "error");
      return;
    }

    // ... dalsza część kodu analizy

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setActiveTab("write");

    try {
      const response = await fetch("/api/analyze-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      playSound("success");
      
      if (user) await fetchUserHistory(user.id);
      triggerAlert("Analiza ukończona pomyślnie! Pobrano 1 kredyt.", "success");

    } catch (err: any) {
      console.error("Błąd analizy:", err);
      triggerAlert(err.message || "Błąd serwera. Spróbuj ponownie.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateEssay = async () => {
    if (!selectedTopic.trim()) {
      triggerAlert("Wprowadź temat rozprawki!", "error");
      return;
    }
    if (!profile || profile.essay_credits <= 0) {
      triggerAlert("Brak kredytów!", "error");
      return;
    }

    setIsGenerating(true);
    setGeneratedContexts([]);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/generate-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedTopic }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Błąd generowania.");

      setProfile((prev: any) => ({ ...prev, essay_credits: data.newCredits }));
      setEssayText(data.essayText);
      setIsGeneratedByAi(true);
      if (data.alternativeContexts) setGeneratedContexts(data.alternativeContexts);
      setIsGenerationMode(false);
      setActiveTab("write");
      playSound("success");
      triggerAlert("Wygenerowano rozprawkę! Pobrano 1 kredyt.", "success");

    } catch (err: any) {
      triggerAlert(err.message || "Błąd generowania.", "error");
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
    setIsGeneratedByAi(false);
    setActiveTab("preview");
    triggerAlert("Wczytano pracę z historii (0 kredytów)! 🎉", "success");
  };

  const renderHighlightedText = () => {
    try {
      if (!analysisResult) {
        return <p className="whitespace-pre-wrap leading-relaxed">{essayText}</p>;
      }

      const rawAnnotations = Array.isArray(analysisResult.annotations)
        ? analysisResult.annotations
        : typeof analysisResult.annotations === "object" && analysisResult.annotations !== null
        ? Object.values(analysisResult.annotations)
        : [];

      if (rawAnnotations.length === 0) {
        return <p className="whitespace-pre-wrap leading-relaxed">{essayText}</p>;
      }

      const matches: Match[] = [];

      rawAnnotations.forEach((anno: any) => {
        if (!anno) return;
        const origText = safeString(anno.original).trim();
        if (!origText) return;

        let cleanOrig = origText.replace(/^[„"'\s«]+|[”"'\s»]+$/g, "").trim();
        if (!cleanOrig) return;

        try {
          const escapedRegexStr = cleanOrig
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\s+/g, "\\s+");
          const regex = new RegExp(escapedRegexStr, "gi");

          let match: RegExpExecArray | null;
          let count = 0;
          while ((match = regex.exec(essayText)) !== null && count < 50) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              annotation: anno
            });
            if (match[0].length === 0) regex.lastIndex++;
            count++;
          }
        } catch (err) {
          console.warn("Błąd parsowania adnotacji:", err);
        }
      });

      if (matches.length === 0) {
        return <p className="whitespace-pre-wrap leading-relaxed">{essayText}</p>;
      }

      matches.sort((a, b) => a.start - b.start || b.end - a.end);

      interface ErrorCluster {
        start: number;
        end: number;
        annotations: any[];
      }

      const clusters: ErrorCluster[] = [];

      for (const m of matches) {
        if (clusters.length === 0) {
          clusters.push({ start: m.start, end: m.end, annotations: [m.annotation] });
          continue;
        }

        const lastCluster = clusters[clusters.length - 1];
        if (m.start < lastCluster.end) {
          lastCluster.end = Math.max(lastCluster.end, m.end);
          const isDuplicate = lastCluster.annotations.some(
            (a) => safeString(a.type) === safeString(m.annotation.type) && safeString(a.explanation) === safeString(m.annotation.explanation)
          );
          if (!isDuplicate) lastCluster.annotations.push(m.annotation);
        } else {
          clusters.push({ start: m.start, end: m.end, annotations: [m.annotation] });
        }
      }

      let resultHtml = "";
      let currentIdx = 0;

      clusters.forEach((cluster) => {
        resultHtml += escapeHtml(essayText.substring(currentIdx, cluster.start));

        const clusterRawText = essayText.substring(cluster.start, cluster.end);
        const clusterEscapedText = escapeHtml(clusterRawText);
        const isMultiError = cluster.annotations.length > 1;

        let colorClass = "bg-red-950/50 text-red-200 border-b-2 border-red-500";
        if (isMultiError) {
          colorClass = "bg-red-950/40 text-amber-200 border-b-2 border-dashed border-amber-400";
        } else {
          const type = safeString(cluster.annotations[0]?.type).toLowerCase();
          if (type.includes("rzecz")) colorClass = "bg-amber-950/50 text-amber-200 border-b-2 border-amber-500";
          else if (type.includes("język")) colorClass = "bg-blue-950/50 text-blue-200 border-b-2 border-blue-500";
          else if (type.includes("orto")) colorClass = "bg-purple-950/50 text-purple-200 border-b-2 border-purple-500";
        }

        let tooltipContent = "";
        if (isMultiError) {
          tooltipContent += `<div class="font-bold text-[10px] uppercase tracking-wider text-amber-400 mb-2 pb-1 border-b border-stone-800 flex items-center justify-between"><span>⚠️ Zbieg błędów (${cluster.annotations.length}):</span><span class="text-[9px] text-stone-500 lowercase">w tym fragmencie</span></div>`;
        }

        cluster.annotations.forEach((anno: any, aIdx: number) => {
          const explanation = escapeHtml(anno?.explanation || "");
          const replacement = escapeHtml(anno?.replacement || "");
          const typeStr = safeString(anno?.type || "Błąd").toLowerCase();

          let badgeColor = "text-amber-400";
          if (typeStr.includes("język")) badgeColor = "text-blue-400";
          else if (typeStr.includes("orto")) badgeColor = "text-purple-400";
          else if (typeStr.includes("interp")) badgeColor = "text-red-400";

          tooltipContent += `<div class="${aIdx > 0 ? "pt-2 mt-2 border-t border-stone-800/80" : ""}"><div class="flex items-center justify-between mb-0.5"><strong class="${badgeColor} text-[10px] tracking-wider uppercase font-mono">Błąd ${escapeHtml(anno?.type)}:</strong></div><p class="text-stone-300 text-[11px] leading-relaxed my-0.5 whitespace-normal">${explanation}</p>${replacement ? `<span class="text-emerald-400 font-semibold block text-[10.5px] mt-1 whitespace-normal">✓ Poprawnie: ${replacement}</span>` : ""}</div>`;
        });

        const countBadge = isMultiError 
          ? `<span class="inline-flex items-center justify-center text-[9px] font-bold bg-amber-500 text-stone-950 rounded-full w-4 h-4 ml-1 select-none align-middle font-mono shadow-sm">${cluster.annotations.length}</span>` 
          : "";

        resultHtml += `<span class="${colorClass} relative group inline font-medium cursor-help rounded-sm px-1 py-0.5">${clusterEscapedText}${countBadge}<span class="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-w-[88vw] bg-[#161210] border border-stone-800 text-stone-300 text-[11px] p-3.5 rounded-2xl shadow-2xl z-50 leading-relaxed font-sans font-normal backdrop-blur-md whitespace-normal block text-left">${tooltipContent}</span></span>`;

        currentIdx = cluster.end;
      });

      resultHtml += escapeHtml(essayText.substring(currentIdx));

      return (
        <div 
          dangerouslySetInnerHTML={{ __html: resultHtml }} 
          className="whitespace-pre-wrap leading-loose text-stone-300 font-sans text-xs sm:text-sm"
        />
      );
    } catch (err) {
      console.error("Awaryjny fallback podświetlania:", err);
      return <p className="whitespace-pre-wrap leading-relaxed text-stone-300 font-sans text-xs sm:text-sm">{essayText}</p>;
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">🤖</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">Łączenie z modułem sztucznej inteligencji...</p>
      </div>
    );
  }

  const creditsRemaining = profile?.essay_credits ?? 0;
  const currentWordCount = essayText.split(/\s+/).filter(Boolean).length;
  const currentYearData = OFFICIAL_CKE_YEARS.find(y => y.year === activeYearTab);

  const detailsArray = Array.isArray(analysisResult?.details)
    ? analysisResult.details
    : typeof analysisResult?.details === "object" && analysisResult?.details !== null
    ? Object.entries(analysisResult.details).map(([k, v]: [string, any]) => ({
        criterion: k,
        points: safeString(v?.points || v?.score || ""),
        comment: typeof v === "string" ? v : safeString(v?.comment || JSON.stringify(v))
      }))
    : [];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans p-6 items-center`}>
      
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
          notification.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" : "bg-red-950/90 border-red-500/30 text-red-200"
        }`}>
          <p className="text-xs font-semibold leading-relaxed pr-2">{notification.message}</p>
        </div>
      )}

      {/* MODAL TEMATÓW CKE */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#181311] border border-stone-800 rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-hidden">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800/80 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-amber-950/40 border border-amber-900/40">📜</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif text-stone-100">Baza Oficjalnych Tematów CKE</h3>
                  <p className="text-[11px] text-stone-400">Wybierz gotowy temat maturalny, aby przeanalizować pracę</p>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Szukaj (np. bunt, praca)..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2 pl-8 pr-8 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/75 transition-all font-sans"
                />
                {topicSearch && (
                  <button onClick={() => setTopicSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs">✕</button>
                )}
              </div>
            </div>

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

            <div className="flex flex-col gap-4 overflow-y-auto pr-1 max-h-[60vh]">
              {topicSearch ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-stone-400">Wyniki wyszukiwania dla frazy: <strong className="text-amber-400">„{topicSearch}”</strong></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {OFFICIAL_CKE_YEARS.flatMap(y => y.topics.map(t => ({ ...t, year: y.year }))).filter(t => t.text.toLowerCase().includes(topicSearch.toLowerCase())).map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectCkeTopic(t.text)}
                        className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 hover:border-amber-600/60 transition-all cursor-pointer group flex flex-col justify-between gap-3"
                      >
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-900/40 w-max">
                          Matura {t.year} • {t.session.split(" ")[0]}
                        </span>
                        <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">„{t.text}”</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SESJA GŁÓWNA (MAJ) */}
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest text-amber-400 font-bold mb-2 px-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span> Sesja Główna (Maj)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentYearData?.topics.filter(t => t.session.includes("Maj")).map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectCkeTopic(t.text)}
                          className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 hover:border-amber-500/60 transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm"
                        >
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 w-max">{t.number}</span>
                          <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">„{t.text}”</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SESJA DODATKOWA (CZERWIEC) */}
                  {currentYearData?.topics.some(t => t.session.includes("Czerwiec")) && (
                    <div>
                      <h4 className="text-[11px] uppercase tracking-widest text-sky-400 font-bold mb-2 px-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span> Sesja Dodatkowa (Czerwiec)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentYearData?.topics.filter(t => t.session.includes("Czerwiec")).map((t, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectCkeTopic(t.text)}
                            className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 hover:border-sky-500/60 transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm"
                          >
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-950/60 text-sky-300 border border-sky-800/40 w-max">{t.number}</span>
                            <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">„{t.text}”</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SESJA POPRAWKOWA (SIERPIEŃ) */}
                  {currentYearData?.topics.some(t => t.session.includes("Sierpień")) && (
                    <div>
                      <h4 className="text-[11px] uppercase tracking-widest text-orange-400 font-bold mb-2 px-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400"></span> Sesja Poprawkowa (Sierpień)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentYearData?.topics.filter(t => t.session.includes("Sierpień")).map((t, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectCkeTopic(t.text)}
                            className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 hover:border-orange-500/60 transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-sm"
                          >
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-orange-950/60 text-orange-300 border border-orange-800/40 w-max">{t.number}</span>
                            <p className="text-xs sm:text-[13px] text-stone-100 font-serif leading-relaxed">„{t.text}”</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-stone-800/80 pt-3 flex justify-between items-center text-[11px] text-stone-500">
              <span>Wszystkie tematy pochodzą z oficjalnych arkuszy CKE</span>
              <button onClick={() => setIsTopicModalOpen(false)} className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold">Zamknij</button>
            </div>

          </div>
        </div>
      )}

      <div className={`max-w-4xl w-full ${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl p-6 sm:p-8 shadow-xl mt-8 flex flex-col gap-6 transition-colors duration-500`}>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Asystent Rozprawek AI</h1>
              <p className="text-xs text-stone-400 mt-1">Interaktywna weryfikacja prac z języka polskiego</p>
            </div>
          </div>
          <Link href="/" className={`self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} bg-stone-900/60 text-stone-400 hover:text-stone-100 transition-all`}>
            ← Wróć do kącika
          </Link>
        </div>

        <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-xs font-bold text-stone-300">Stan Twojego konta:</p>
              <p className="text-[11px] text-stone-500">Używasz bezpiecznego systemu tokenów edukacyjnych.</p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono px-3.5 py-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-900/50">
            Pozostało ocen: {creditsRemaining}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
                  Temat Twojej rozprawki
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(true)}
                  disabled={isAnalyzing || isGenerating || analysisResult !== null}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#231b16] border border-amber-800/40 hover:border-amber-500/70 text-[#c68a4c] text-[11px] font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <span>📚</span>
                  <span>Wybierz z bazy CKE (2023–2026) ▾</span>
                </button>
              </div>

              <input 
                type="text"
                placeholder="Wpisz temat rozprawki lub wybierz z bazy CKE..."
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={isAnalyzing || isGenerating || analysisResult !== null}
                className="w-full bg-stone-900/90 border border-stone-800 rounded-xl py-2.5 px-3.5 text-xs text-stone-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* TRYB WYBORU GENEROWANIA ROZPRAWKI */}
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
                disabled={isAnalyzing || isGenerating || analysisResult !== null}
                className="w-4 h-4 rounded border-stone-800 text-amber-500 bg-stone-950 cursor-pointer accent-[#c68a4c]"
              />
              <label htmlFor="generationMode" className="text-xs font-semibold text-stone-300 cursor-pointer select-none">
                Chcę wygenerować przykładową rozprawkę przez AI (zamiast oceniać własną)
              </label>
            </div>

            {analysisResult && (
              <div className="flex border-b border-stone-800 gap-2 mb-1">
                <button onClick={() => setActiveTab("write")} className={`px-4 py-2 text-xs font-semibold uppercase ${activeTab === "write" ? "text-[#c68a4c] border-b-2 border-[#c68a4c]" : "text-stone-500"}`}>✍ Edytor tekstu (Zablokowany)</button>
                <button onClick={() => setActiveTab("preview")} className={`px-4 py-2 text-xs font-semibold uppercase ${activeTab === "preview" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-stone-500"}`}>🔍 Podgląd korekt i błędów</button>
              </div>
            )}

            {activeTab === "write" ? (
              <div>
                <textarea
                  rows={12}
                  placeholder={
                    isGenerationMode 
                      ? "Opcja generowania jest włączona. Wpisz temat powyżej i kliknij przycisk generowania." 
                      : "Wklej tutaj treść swojej rozprawki (minimum 50 słów)..."
                  }
                  value={essayText}
                  onChange={(e) => {
                    setEssayText(e.target.value);
                    setIsGeneratedByAi(false);
                  }}
                  disabled={isAnalyzing || isGenerating || isGenerationMode || analysisResult !== null}
                  className="w-full bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            ) : (
              <div className="bg-stone-950/40 border border-stone-800 rounded-2xl p-5 min-h-[300px] shadow-inner">
                <div className="mb-4 border-b border-stone-900 pb-3 flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Zweryfikowana treść:</span>
                  <span className="text-[10px] text-stone-500">Najedź myszką na błąd</span>
                </div>
                {renderHighlightedText()}
              </div>
            )}

            {/* PRZYCISKI AKCJI */}
            {analysisResult ? (
              <div className="flex flex-col gap-2.5 w-full animate-slide-in">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setAnalysisResult(null);
                    setEssayText("");
                    setSelectedTopic("");
                    setIsGeneratedByAi(false);
                    setActiveTab("write");
                    playSound("success");
                    triggerAlert("Zresetowano edytor. Możesz wpisać nową rozprawkę!", "success");
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-stone-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>Zresetuj edytor i napisz nową rozprawkę</span>
                </button>
              </div>
            ) : isGenerationMode ? (
              <button
                onClick={handleGenerateEssay}
                disabled={isAnalyzing || isGenerating}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isGenerating ? "✍ Trwa generowanie rozprawki..." : "Generuj przykładową rozprawkę (1 kredyt)"}
              </button>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isGenerating}
                className="w-full py-3 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isAnalyzing ? "🤖 Asystent Rozprawek AI analizuje..." : "Przeanalizuj rozprawkę (1 kredyt)"}
              </button>
            )}
          </div>

          {/* PRAWA KOLUMNA: RAPORT AI */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {isAnalyzing || isGenerating ? (
              <div className="rounded-2xl border border-amber-950/40 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
                <AtmosphericEssayLoader />
              </div>
            ) : analysisResult ? (
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 flex flex-col gap-3.5 animate-fade-in max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Wynik Analizy</h3>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                    {safeString(analysisResult.score || "0/35")}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {detailsArray.map((detail: any, i: number) => (
                    <div key={i} className="text-[11px] border-b border-stone-900/55 pb-2.5 last:border-none">
                      <div className="flex justify-between font-bold text-stone-200 mb-1">
                        <span>{safeString(detail.criterion)}</span>
                        <span className="text-[#c68a4c] font-mono">{safeString(detail.points)}</span>
                      </div>
                      <p className="text-stone-400 font-sans leading-relaxed">{safeString(detail.comment)}</p>
                    </div>
                  ))}
                </div>

                {analysisResult.summary && (
                  <div className="border-t border-stone-800 pt-3 mt-1">
                    <h4 className="text-[11px] font-bold text-[#c68a4c] font-serif uppercase tracking-wider mb-1">Podsumowanie krytyka:</h4>
                    <p className="text-[11.5px] text-stone-400 italic leading-relaxed">{safeString(analysisResult.summary)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-950/20 p-5 text-center text-xs text-stone-500">
                Po kliknięciu przycisku oceny, tutaj pojawi się raport CKE.
              </div>
            )}
          </div>
        </div>

        {/* HISTORIA PRAC */}
        {history.length > 0 && (
          <div className="border-t border-stone-800/60 pt-6 mt-2">
            <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-4">
              📅 Historia Twoich prac i ocen ({history.length}) – Kliknij, aby wczytać za darmo:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 hover:border-amber-700/50 transition-all cursor-pointer flex justify-between items-center"
                >
                  <div className="flex flex-col gap-1 pr-4 min-w-0">
                    <h4 className="text-xs font-bold text-stone-200 truncate font-serif">{safeString(item.topic)}</h4>
                    <span className="text-[10px] text-stone-500">{new Date(item.created_at).toLocaleDateString("pl-PL")}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 font-mono bg-stone-900 px-2.5 py-1.5 rounded-xl border border-stone-800">
                    {safeString(item.score)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}