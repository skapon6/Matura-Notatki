// app/ocenianie-rozprawek/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getThemeClasses, CozyTheme } from "../lib/theme";
import { playSound } from "../lib/sounds";
import { AtmosphericEssayLoader } from "../components/AtmosphericEssayLoader";
import { useLofi } from "../context/LofiContext";

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

const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export default function OcenianieRozprawekPage() {
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState<any>(getThemeClasses("library"));

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [essayText, activeTab]);

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
      playSound("error");
      triggerAlert("Ta praca została wygenerowana jako wzorzec AI. Napisz własną rozprawkę!", "error");
      return;
    }
    if (!selectedTopic.trim()) {
      playSound("error");
      triggerAlert("Wprowadź temat rozprawki przed rozpoczęciem analizy!", "error");
      return;
    }

    const essayWords = essayText.split(/\s+/).filter(Boolean);
    const wordCount = essayWords.length;
    if (wordCount < 50) {
      playSound("error");
      triggerAlert("Rozprawka jest za krótka! Wklej co najmniej 50 słów.", "error");
      return;
    }

    if (!profile || profile.essay_credits <= 0) {
      playSound("error");
      triggerAlert("Brak wolnych kredytów na ocenę! Doładuj kredyty lub kup nowy pakiet.", "error");
      return;
    }

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
      playSound("error");
      triggerAlert(err.message || "Błąd serwera. Spróbuj ponownie.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateEssay = async () => {
    if (!selectedTopic.trim()) {
      playSound("error");
      triggerAlert("Wprowadź temat rozprawki!", "error");
      return;
    }
    if (!profile || profile.essay_credits <= 0) {
      playSound("error");
      triggerAlert("Brak wolnych kredytów! Doładuj kredyty lub kup nowy pakiet.", "error");
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
      playSound("error");
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
    playSound("success");
    triggerAlert("Wczytano pracę z historii (0 kredytów)! 🎉", "success");
  };

  // 🎯 KULOODPORNY RENDERER PODŚWIETLEŃ
  const renderHighlightedText = () => {
    try {
      if (!analysisResult) {
        return <p className="whitespace-pre-wrap leading-relaxed font-serif text-base sm:text-lg">{essayText}</p>;
      }

      const rawAnnotations = Array.isArray(analysisResult.annotations)
        ? analysisResult.annotations
        : typeof analysisResult.annotations === "object" && analysisResult.annotations !== null
        ? Object.values(analysisResult.annotations)
        : [];

      if (rawAnnotations.length === 0) {
        return (
          <>
            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-400 leading-relaxed">
              ⚠️ <strong>Informacja od systemu:</strong> Model AI przyznał punktację i zidentyfikował błędy, ale z powodu błędu formatowania pominął ich dokładną lokalizację w tekście. Przeczytaj uważnie podsumowanie krytyka w prawym panelu.
            </div>
            <p className="whitespace-pre-wrap leading-loose text-stone-300 font-sans text-base sm:text-lg font-serif">{essayText}</p>
          </>
        );
      }

      const matches: Match[] = [];

      rawAnnotations.forEach((anno: any) => {
        if (!anno) return;
        const origText = safeString(anno.original).trim();
        if (!origText) return;

        let cleanOrig = origText
          .replace(/^[„"'\s«.,!?…()[\]{}]+|[”"'\s».,!?…()[\]{}]+$/g, "")
          .trim();
        if (!cleanOrig) return;

        let found = false;

        // KROK 1: Próba dopasowania bezpośredniego
        try {
          const escapedDirect = escapeRegex(cleanOrig)
            .replace(/[-–—]/g, "[-–—]")
            .replace(/\s+/g, "[\\s\\n\\r\\u00A0\t]+");

          const directRegex = new RegExp(escapedDirect, "gi");
          let match: RegExpExecArray | null;
          let count = 0;

          while ((match = directRegex.exec(essayText)) !== null && count < 50) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              annotation: anno
            });
            if (match[0].length === 0) directRegex.lastIndex++;
            count++;
            found = true;
          }
        } catch {}

        // KROK 2: Dopasowanie elastyczne słów
        if (!found) {
          try {
            const words = cleanOrig.split(/[\s\W]+/).filter(w => w.length > 1);
            if (words.length > 0) {
              const wordsRegexStr = words.map(w => escapeRegex(w)).join("[\\s\\W]{1,15}");
              const relaxedRegex = new RegExp(wordsRegexStr, "gi");

              let match: RegExpExecArray | null;
              let count = 0;
              while ((match = relaxedRegex.exec(essayText)) !== null && count < 30) {
                matches.push({
                  start: match.index,
                  end: match.index + match[0].length,
                  annotation: anno
                });
                if (match[0].length === 0) relaxedRegex.lastIndex++;
                count++;
                found = true;
              }
            }
          } catch (e) {
            console.warn("Błąd elastycznego dopasowania adnotacji:", e);
          }
        }
      });

      if (matches.length === 0) {
        return (
          <>
            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-400 leading-relaxed">
              ⚠️ <strong>Informacja od systemu:</strong> Zlokalizowanie błędów w tekście nie powiodło się. Szczegółowy opis błędów znajdziesz w podsumowaniu prawego panelu.
            </div>
            <p className="whitespace-pre-wrap leading-loose text-stone-300 font-sans text-base sm:text-lg font-serif">{essayText}</p>
          </>
        );
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
          className="whitespace-pre-wrap leading-loose text-stone-300 font-sans text-base sm:text-lg font-serif"
        />
      );
    } catch (err) {
      console.error("Awaryjny fallback podświetlania:", err);
      return <p className="whitespace-pre-wrap leading-relaxed text-stone-300 font-sans text-base sm:text-lg font-serif">{essayText}</p>;
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
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      
      {/* 🌟 DEDYKOWANY NAGŁÓWEK MODUŁU */}
      <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500 w-full`}>
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
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">✨</span>
            <h1 className="text-base sm:text-lg font-bold tracking-wide text-stone-100 font-serif">
              Asystent Rozprawek AI
            </h1>
          </div>
        </div>

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
                {lofiTracks[currentTrackIndex]?.name || "Lofi"}
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

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6 w-full">
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

        {/* 🌟 KARTA GŁÓWNA - MAX-W-[1200PX] */}
        <div className={`max-w-[1200px] w-full ${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl p-6 sm:p-10 shadow-2xl mt-8 mb-12 flex flex-col gap-6 transition-colors duration-500`}>
          
          <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-xs font-bold text-stone-300">Stan Twojego konta:</p>
                <p className="text-[11px] text-stone-500 hidden sm:block">Używasz bezpiecznego systemu tokenów edukacyjnych.</p>
              </div>
            </div>
            <span className="text-sm font-bold font-mono px-3.5 py-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-900/50">
              Pozostało ocen: {creditsRemaining}
            </span>
          </div>

          {/* 🌟 SIATKA: 8 KOLUMN NA EDYTOR, 4 KOLUMNY NA WYNIKI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-5">
              
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
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

                {/* 🌟 POWIĘKSZONY, MASYWNY TEMAT */}
                <textarea 
                  rows={2}
                  placeholder="Wpisz temat rozprawki lub wybierz z bazy CKE..."
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  disabled={isAnalyzing || isGenerating || analysisResult !== null}
                  className="w-full bg-stone-900/50 hover:bg-stone-900/70 focus:bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 text-lg sm:text-xl text-stone-100 font-serif font-black leading-relaxed focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed shadow-inner transition-all resize-none min-h-[96px]"
                />
              </div>

              {/* TRYB WYBORU GENEROWANIA ROZPRAWKI */}
              <div 
                onClick={() => {
                  if (isAnalyzing || isGenerating || analysisResult !== null) return;
                  const newState = !isGenerationMode;
                  setIsGenerationMode(newState);
                  if (newState) {
                    setEssayText(""); 
                    setGeneratedContexts([]);
                    setAnalysisResult(null);
                    setIsGeneratedByAi(false);
                  }
                }}
                className={`group relative flex items-center gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  isGenerationMode 
                    ? "bg-amber-950/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                    : "bg-stone-900/40 border-stone-800/80 hover:border-stone-700 hover:bg-stone-900/70"
                } ${(isAnalyzing || isGenerating || analysisResult !== null) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                  isGenerationMode 
                    ? "bg-[#c68a4c] border-amber-400 text-stone-950 shadow-sm scale-105" 
                    : "bg-stone-950 border-stone-700 group-hover:border-stone-500"
                }`}>
                  {isGenerationMode && (
                    <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💡</span>
                    <span className={`text-xs font-bold transition-colors ${isGenerationMode ? "text-amber-300" : "text-stone-200"}`}>
                      Tryb generowania wzorca przez AI
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Zamiast oceniać Twoją pracę, sztuczna inteligencja napisze dla Ciebie idealną rozprawkę maturalną na ten temat.
                  </p>
                </div>
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
                    ref={textareaRef}
                    placeholder={
                      isGenerationMode 
                        ? "Opcja generowania jest włączona. Wpisz temat powyżej i kliknij przycisk generowania." 
                        : "Wklej tutaj treść swojej rozprawki (minimum 50 słów)..."
                    }
                    value={essayText}
                    onChange={(e) => {
                      setEssayText(e.target.value);
                      setIsGeneratedByAi(false);
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    disabled={isAnalyzing || isGenerating || isGenerationMode || analysisResult !== null}
                    className="w-full min-h-[400px] bg-stone-900/50 hover:bg-stone-900/70 focus:bg-stone-900/90 border border-stone-800 rounded-2xl p-6 sm:p-8 text-base sm:text-lg text-stone-200 font-serif leading-loose focus:outline-none focus:border-amber-600/50 disabled:opacity-60 disabled:cursor-not-allowed shadow-inner transition-colors resize-none overflow-hidden"
                  />
                </div>
              ) : (
                <div className="bg-stone-950/40 border border-stone-800 rounded-2xl p-6 min-h-[400px] shadow-inner">
                  <div className="mb-5 border-b border-stone-900 pb-3 flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Zweryfikowana treść:</span>
                    <span className="text-[10px] text-stone-500">Najedź myszką na błąd</span>
                  </div>
                  {renderHighlightedText()}
                </div>
              )}

              {/* PRZYCISKI AKCJI */}
              {analysisResult ? (
                <div className="flex flex-col gap-2.5 w-full animate-slide-in mt-2">
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
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-stone-950 font-extrabold text-sm transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Zresetuj edytor i napisz nową rozprawkę</span>
                  </button>
                </div>
              ) : isGenerationMode ? (
                <button
                  onClick={handleGenerateEssay}
                  disabled={isAnalyzing || isGenerating}
                  className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer shadow-md disabled:opacity-50 mt-2"
                >
                  {isGenerating ? "✍ Trwa generowanie rozprawki..." : "Generuj przykładową rozprawkę (1 kredyt)"}
                </button>
              ) : (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isGenerating}
                  className="w-full py-4 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold text-sm cursor-pointer shadow-md disabled:opacity-50 mt-2"
                >
                  {isAnalyzing ? "🤖 Asystent Rozprawek AI analizuje..." : "Przeanalizuj rozprawkę (1 kredyt)"}
                </button>
              )}

              {/* 🌟 NOWY FIOLETOWY PULSUJĄCY BANER (IDENTYCZNY JAK W MATURZE USTNEJ) */}
              {(isAnalyzing || isGenerating) && (
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-left text-[11px] text-purple-300/95 leading-relaxed font-sans mt-3 animate-pulse">
                  ⚠️ <strong className="text-purple-400 font-bold">
                    {isAnalyzing ? "Asystent Rozprawek AI analizuje Twoje wypracowanie." : "Trwa generowanie przykładowej rozprawki."} Prosimy o cierpliwość i nieodświeżanie tej strony.
                  </strong> Dokładny audyt merytoryczny i językowy wymaga czasu. Twój pakiet tokenów jest bezpieczny – w przypadku wystąpienia jakiegokolwiek błędu połączenia sieciowego, token zostanie automatycznie zwrócony na Twoje konto.
                </div>
              )}
            </div>

            {/* PRAWA KOLUMNA: RAPORT AI (4 KOLUMNY Z 12) */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {isAnalyzing || isGenerating ? (
                /* 🌟 CZYSTY LOADER BEZ TARCZY I ZBĘDNYCH DUSZKÓW */
                <div className="rounded-2xl border border-amber-950/40 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[400px]">
                  <AtmosphericEssayLoader />
                </div>
              ) : analysisResult ? (
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 flex flex-col gap-4 animate-fade-in sticky top-24 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                    <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Wynik Analizy</h3>
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {safeString(analysisResult.score || "0/35")}
                    </span>
                  </div>

                  {detailsArray.length === 0 ? (
                    <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 text-center leading-relaxed">
                       ⚠️ Wystąpił błąd w generowaniu opisu punktów (model pominął ten krok). Zresetuj edytor i spróbuj ponownie, aby otrzymać pełny protokół.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {detailsArray.map((detail: any, i: number) => (
                        <div key={i} className="text-[11.5px] border-b border-stone-900/55 pb-3 last:border-none">
                          <div className="flex justify-between font-bold text-stone-200 mb-1.5">
                            <span>{safeString(detail.criterion)}</span>
                            <span className="text-[#c68a4c] font-mono text-sm">{safeString(detail.points)}</span>
                          </div>
                          <p className="text-stone-400 font-sans leading-relaxed">{safeString(detail.comment)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {analysisResult.summary && (
                    <div className="border-t border-stone-800 pt-4 mt-2">
                      <h4 className="text-xs font-bold text-[#c68a4c] font-serif uppercase tracking-wider mb-2">Podsumowanie krytyka:</h4>
                      <p className="text-xs text-stone-300 italic leading-relaxed">{safeString(analysisResult.summary)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-950/20 p-6 text-center text-xs text-stone-500 h-full flex flex-col items-center justify-center min-h-[400px]">
                  <span className="text-4xl mb-3">🤖</span>
                  <p className="max-w-[200px] leading-relaxed">Po kliknięciu przycisku oceny, tutaj pojawi się szczegółowy raport CKE.</p>
                </div>
              )}
            </div>
          </div>

          {/* HISTORIA PRAC */}
          {history.length > 0 && (
            <div className="border-t border-stone-800/60 pt-8 mt-4">
              <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-5">
                📅 Historia Twoich prac i ocen ({history.length}) – Kliknij, aby wczytać za darmo:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-800">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="p-5 rounded-2xl bg-stone-950/40 border border-stone-800/60 hover:border-amber-700/50 transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div className="flex flex-col gap-1.5 pr-4 min-w-0">
                      <h4 className="text-sm font-bold text-stone-200 truncate font-serif group-hover:text-amber-300 transition-colors">{safeString(item.topic)}</h4>
                      <span className="text-[10px] text-stone-500">{new Date(item.created_at).toLocaleDateString("pl-PL")}</span>
                    </div>
                    <span className="text-base font-bold text-emerald-400 font-mono bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 shadow-inner">
                      {safeString(item.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}