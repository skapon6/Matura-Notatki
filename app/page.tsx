"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Lib, Helpers & Wydzielone komponenty
import { getThemeClasses, CozyTheme } from "./lib/theme";
import { playSound } from "./lib/sounds";
import { Header } from "./components/Header";
import { CozyGlowCard } from "./components/CozyGlowCard";

// Pozostałe Komponenty
import { CozyNotification } from "./components/CozyNotification";
import { ClimaticSettingsModal } from "./components/ClimaticSettingsModal";
import { CozyMug } from "./components/CozyMug";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { QuoteCard } from "./components/QuoteCard";
import { AuthForm } from "./components/AuthForm";
import { PaymentTiers } from "./components/PaymentTiers";
import { NotesBrowser } from "./components/NotesBrowser";
import { PersonalNotesList } from "./components/PersonalNotesList";
import { PersonalNotesModal } from "./components/PersonalNotesModal";
import { MaturaCountdown } from "./components/MaturaCountdown";
import { TokenRechargeModal } from "./components/TokenRechargeModal";
import { HelpModal } from "./components/HelpModal";

export default function Home() {
  const router = useRouter();

  // Theme state
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");

  // Stan profilu i sesji
  const [profile, setProfile] = useState<any>(null);
  const [recentEssays, setRecentEssays] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Dynamiczne notatki pobierane z bazy
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Osobiste notatki (gwiazdki)
  const [personalNotes, setPersonalNotes] = useState<any[]>([]);
  const [personalNotesLoading, setPersonalNotesLoading] = useState(false);
  const [isPersonalNotesOpen, setIsPersonalNotesOpen] = useState(false);
  const [selectedPersonalNote, setSelectedPersonalNote] = useState<any | null>(null);

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  // AUTH, PROFILE LOADING & STRIPE STATES
  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [activePaymentTier, setActivePaymentTier] = useState<string | null>(null);

  // Stan banneru regulaminu
  const [showTosBanner, setShowTosBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasAccepted = localStorage.getItem("tos_accepted_v1");
      if (!hasAccepted) {
        setShowTosBanner(true);
      }
    }
  }, []);

  const acceptTos = () => {
    localStorage.setItem("tos_accepted_v1", "true");
    setShowTosBanner(false);
    playSound("success");
  };

  // Powiadomienia
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

  // 1. Monitorowanie stanu sesji
  useEffect(() => {
    async function checkInitialSession() {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      else setUser(null);
      setAuthLoading(false);
    }
    
    checkInitialSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser(session.user);
      else {
        setUser(null);
        setHasAccess(false);
      }
      setAuthLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // 2. Pobieranie danych profilu (subskrypcja, tokeny, data) - lekko i bez pętli
  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setHasAccess(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('subscription_status, essay_credits, expires_at')
        .eq('id', user.id)
        .single();
        
      if (profileData && !error) {
        setProfile(profileData);
        const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
        const isStatusActive = activeStatuses.includes(profileData.subscription_status);
        
        let isExpired = false;
        if (profileData.expires_at) {
          const expirationTime = new Date(profileData.expires_at).getTime();
          const currentTime = new Date().getTime();
          isExpired = currentTime > expirationTime;
        }
        
        setHasAccess(isStatusActive && !isExpired);
      } else {
        setProfile(null);
        setHasAccess(false);
      }
      setProfileLoading(false);
    }

    fetchProfile();
  }, [user]);

  // 3. Pobieranie ostatnich rozprawki
  useEffect(() => {
    async function fetchRecentEssays() {
      if (user) {
        const { data, error } = await supabase
          .from("essay_evaluations")
          .select("id, topic, score")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);
          
        if (data && !error) setRecentEssays(data);
      } else setRecentEssays([]);
    }
    fetchRecentEssays();
  }, [user]);

  // 4. Pobieranie bazy notatek
  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("notes").select("*");
        if (!error && data) setNotes(data as any[]);
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, []);

  // 5. Pobieranie osobistych notatek (cytaty)
  useEffect(() => {
    async function fetchPersonalNotes() {
      if (!user) {
        setPersonalNotes([]);
        return;
      }
      setPersonalNotesLoading(true);
      try {
        const { data, error } = await supabase
          .from("personal_notes")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) setPersonalNotes(data);
      } catch (err) {
        console.error("Error fetching personal notes:", err);
      } finally {
        setPersonalNotesLoading(false);
      }
    }
    fetchPersonalNotes();
  }, [user]);

  // 6. URL Cleanup (po powrocie ze Stripe lub wylogowaniu z innego urządzenia)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("payment") === "success") {
        triggerNotification("🎉 Dziękujemy za zakup! Twoje konto i tokeny zostały pomyślnie zaktualizowane.", "success");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (urlParams.get("session") === "expired") {
        triggerNotification("🔒 Zostałeś wylogowany, ponieważ zalogowano się na Twoje konto z innego urządzenia.", "error");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Wczytywanie motywu
  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCozyTheme(savedTheme);
    }
  }, []);

  // Dźwięk kliknięcia w elementy interaktywne
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInteractive = 
        target.closest("button") || 
        target.closest("a") || 
        target.closest("[role='button']") ||
        window.getComputedStyle(target).cursor === "pointer";

      if (isInteractive) {
        playSound("click");
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handlePaymentInit = async (tier: 'mini' | 'medium' | 'premium') => {
    setPaymentLoading(true);
    setActivePaymentTier(tier);
    try {
      const response = await fetch('/api/checkout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else triggerNotification('Wystąpił błąd płatności: ' + (data.error || 'Brak linku'), 'error');
    } catch (err) {
      console.error(err);
      triggerNotification('Błąd połączenia z serwerem płatności.', 'error');
    } finally {
      setPaymentLoading(false);
      setActivePaymentTier(null);
    }
  };

  const handlePremiumNavigation = (path: string) => {
    if (!user) {
      triggerNotification("🔑 Aby skorzystać z tej funkcji, najpierw się zaloguj!", "info");
      return;
    }
    if (path === "/ocenianie-rozprawek" || path === "/matura-ustna" || path === "/notes" || path === "/mapa-mysli") {
      router.push(path);
    } else if (!hasAccess) {
      triggerNotification("🔒 Ta funkcja wymaga kupna jednego z pakietów.", "error");
    } else {
      router.push(path);
    }
  };

  const handleOpenPersonalNotes = (note?: any) => {
    if (note) setSelectedPersonalNote(note);
    else setSelectedPersonalNote(null);
    setIsPersonalNotesOpen(true);
  };

  const currentTheme = getThemeClasses(cozyTheme);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">☕</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Rozgrzewanie pieca i parzenie herbaty...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${currentTheme.bg} text-stone-200 font-sans`}>
      
      {/* HEADER */}
      <Header 
        currentTheme={currentTheme}
        user={user}
        profile={profile}
        hasAccess={hasAccess}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenTokens={() => setIsTokenModalOpen(true)}
        onOpenPersonalNotes={handleOpenPersonalNotes}
        handlePremiumNavigation={handlePremiumNavigation}
      />

      {/* BANNER REGULAMINU */}
      {user && showTosBanner && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-in relative z-30">
          <div className="flex items-center gap-3">
            <span className="text-xl">📜</span>
            <p className="text-xs text-stone-300 font-sans">
              Zaktualizowaliśmy <Link href="/regulamin" className="text-amber-500 hover:text-amber-400 font-semibold underline underline-offset-2">Regulamin Serwisu</Link> oraz Politykę Prywatności. Zmiany obejmują m.in. doprecyzowanie zasad korzystania z nowych pakietów i mechanizmu powiadomień. Dalsze korzystanie z serwisu po 14 dniach oznacza akceptację zmian.
            </p>
          </div>
          <button
            onClick={acceptTos}
            className="shrink-0 px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Rozumiem
          </button>
        </div>
      )}

      {/* RENDEROWANIE GŁÓWNEGO WIDOKU */}
      {!user ? (
        <main className="max-w-4xl mx-auto w-full p-6 flex flex-col md:flex-row items-center justify-center gap-12 flex-1">
          <div className="max-w-md text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Matura 2027
            </span>
            <h2 className="text-4xl font-bold text-stone-100 mt-4 leading-tight font-serif tracking-tight">
              Zdasz Maturę z Palcem w Nosie.
            </h2>
            <p className={`mt-4 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
              Witaj w swojej cichej przystani naukowej. Zaloguj się lub utwórz bezpłatne konto, aby uzyskać dostęp do notatek.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-stone-900/30 border border-stone-800/40 text-xs italic text-stone-400">
              &quot;Czytanie książek to najpiękniejsza zabawa, jaką sobie ludzkość wymyśliła.&quot; — Wisława Szymborska
            </div>
          </div>
          <AuthForm currentTheme={currentTheme} triggerNotification={triggerNotification} />
        </main>
      ) : (
        <>
         {/* HERO BANNER */}
          <div className="max-w-7xl mx-auto w-full px-6 pt-6 animate-slide-in">
            <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-500 shadow-xl ${currentTheme.glow} flex flex-col md:flex-row items-center justify-between gap-6`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl z-0 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl z-0 pointer-events-none" />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                <span className="text-xl sm:text-2xl md:text-[3.5vw] font-black uppercase tracking-[0.18em] text-amber-500/[0.04] whitespace-nowrap leading-none font-serif -rotate-6">
                  Wiedza Szyta na Miarę
                </span>
              </div>

              {/* LEWA KOLUMNA */}
              <div className="max-w-xl text-center md:text-left relative z-10 w-full">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {profileLoading ? "Weryfikacja..." : hasAccess ? "Dostęp Aktywny 🎉" : "Matura 2026 🔑"}
                </span>
                
                {profileLoading ? (
                  <div className="animate-pulse space-y-3.5 mt-4">
                    <div className="h-8 bg-stone-800/60 rounded-xl w-3/4"></div>
                    <div className="h-4 bg-stone-800/40 rounded-lg w-5/6"></div>
                    <div className="h-4 bg-stone-800/40 rounded-lg w-2/3"></div>
                  </div>
                ) : hasAccess ? (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-stone-100 mt-3 leading-tight font-serif tracking-tight">
                      Witaj w pakiecie {profile?.subscription_status ? (profile.subscription_status.charAt(0).toUpperCase() + profile.subscription_status.slice(1)) : "Premium"}! 🚀
                    </h2>
                    <p className={`mt-3 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
                      Twój pakiet odblokował pełną bazę wiedzy oraz wszystkie moduły AI. Powodzenia w nauce!
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-stone-100 mt-3 leading-tight font-serif tracking-tight">
                      Odblokuj pełny dostęp.
                    </h2>
                    <p className={`mt-3 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
                      Masz darmowe konto. Wybierz jeden z pakietów, aby odblokować pełny zasób wiedzy:
                    </p>
                    
                    <PaymentTiers 
                      paymentLoading={paymentLoading}
                      activePaymentTier={activePaymentTier}
                      handlePaymentInit={handlePaymentInit}
                    />

                    {/* DYSKRETNY PRZYPIS O BRAKU UPGRADE'U */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-stone-950/40 border border-stone-800/70 flex items-start gap-2.5 text-[11px] text-stone-400 leading-relaxed font-sans shadow-inner">
                      <span className="text-amber-500 text-sm shrink-0 mt-0.5">ℹ️</span>
                      <p>
                        <strong className="text-stone-300 font-semibold">Informacja:</strong> Pakiety to zakupy jednorazowe na określony czas. W trakcie trwania aktywnego planu nie ma możliwości jego zmiany ani ulepszenia (nowy pakiet wybierzesz po wygaśnięciu obecnego). W każdej chwili możesz natomiast dokupować same tokeny AI w panelu bocznym.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* PRAWA KOLUMNA */}
              <div className="flex flex-col items-center md:items-end justify-center text-center md:text-right border-t md:border-t-0 md:border-l border-stone-800/80 pt-4 md:pt-0 md:pl-8 relative z-10 shrink-0">
                {profileLoading ? (
                  <div className="animate-pulse flex flex-col items-center md:items-end gap-2.5">
                    <div className="h-8 bg-stone-800/60 rounded-lg w-20"></div>
                    <div className="h-3 bg-stone-800/40 rounded w-16"></div>
                    <div className="h-3 bg-stone-800/40 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent uppercase">
                      {!hasAccess && "FREE"}
                      {hasAccess && (profile?.subscription_status || "PREMIUM")}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-widest text-stone-400 mt-1">Twój Plan</span>
                    
                    <div className="flex gap-1 mt-2 text-amber-500 text-xs">
                      {profile?.subscription_status === 'mini' && <><span>★</span><span>★</span><span>★</span></>}
                      {profile?.subscription_status === 'medium' && <><span>★</span><span>★</span><span>★</span></>}
                      {(profile?.subscription_status === 'premium' || !hasAccess || !['mini', 'medium'].includes(profile?.subscription_status)) && (
                        <><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></>
                      )}
                    </div>

                    <div className="flex flex-col items-center md:items-end mt-2 text-center md:text-right">
                      {!hasAccess ? (
                        <span className="text-[11px] text-stone-500 font-medium">Zyskaj pełną moc nauki</span>
                      ) : profile?.expires_at ? (
                        (() => {
                          const expDate = new Date(profile.expires_at);
                          const diffMs = expDate.getTime() - Date.now();
                          const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

                          if (diffDays > 1000) {
                            return (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                <span>👑</span> Dostęp bezterminowy
                              </span>
                            );
                          }

                          return (
                            <>
                              <span className="text-[11px] text-stone-300 font-medium">
                                Aktywny do: <strong className="text-amber-400">{expDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</strong>
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono mt-0.5">
                                (pozostało: {diffDays} {diffDays === 1 ? "dzień" : "dni"})
                              </span>
                            </>
                          );
                        })()
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold">Dostęp aktywny 🌟</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            <section className="lg:col-span-3 flex flex-col gap-6">
              <MaturaCountdown currentTheme={currentTheme} />

              <CozyGlowCard currentTheme={currentTheme} className="p-4">
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-3 px-1">Nawigacja</h3>
                <nav className="flex flex-col gap-1">
                  <Link href="/notes" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📚</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Wszystkie Notatki</span>
                    </div>
                    <span className="text-xs bg-stone-900 border border-stone-800 text-amber-500/80 px-2 py-0.5 rounded-full">{notes.length}</span>
                  </Link>
                  <button onClick={() => handlePremiumNavigation("/mapa-mysli")} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🧠</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Mapa Myśli</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasAccess ? 'bg-amber-950/50 border-amber-900/60 text-amber-400 font-semibold' : 'bg-stone-900/60 border-stone-800 text-stone-500'}`}>{hasAccess ? "Wejdź 🧠" : "Brak dostępu 🔒"}</span>
                  </button>
                  <button onClick={() => handlePremiumNavigation("/postepy")} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📈</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Moje Postępy</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasAccess ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400' : 'bg-stone-900/60 border-stone-800 text-stone-500'}`}>{hasAccess ? "Wejdź ✨" : "Brak dostępu 🔒"}</span>
                  </button>
                  <button onClick={() => handlePremiumNavigation("/fiszki")} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚡</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Szybkie Fiszki</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasAccess ? 'bg-purple-950/50 border-purple-900/60 text-purple-300' : 'bg-stone-900/60 border-stone-800 text-stone-500'}`}>{hasAccess ? "Graj ⚡" : "Brak dostępu 🔒"}</span>
                  </button>
                </nav>
              </CozyGlowCard>

              {/* ZAPAMIĘTANE CYTATY Z JEDNOLINOWYM LICZNIKIEM */}
              <CozyGlowCard currentTheme={currentTheme} className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 px-1 border-b border-stone-850/50 pb-2">
                  <span className="text-xs uppercase tracking-wider text-amber-500 font-bold truncate">
                    Zapamiętane cytaty ⭐
                  </span>
                  <span className="text-[10px] bg-stone-900 border border-stone-800 text-amber-500/90 px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0 whitespace-nowrap shadow-inner">
                    {personalNotes.length} / 100
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-stone-800">
                  <PersonalNotesList currentTheme={currentTheme} personalNotes={personalNotes} setPersonalNotes={setPersonalNotes} triggerNotification={triggerNotification} loading={personalNotesLoading} onOpenModal={handleOpenPersonalNotes} />
                </div>
              </CozyGlowCard>

              <CozyGlowCard currentTheme={currentTheme} className="p-5 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-all duration-500" />
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-800/40">Sztuczna Inteligencja</span>
                  {!hasAccess ? (
                    (profile?.essay_credits ?? 0) > 0 ? (
                      <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[9px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wide animate-pulse">🎁 Wypróbuj za darmo</span>
                    ) : (
                      <span className="bg-red-950/20 text-red-400 border border-red-900/30 text-[9px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wide">🔒 Brak tokenów</span>
                    )
                  ) : (
                    <span className="text-stone-500 text-lg">🤖</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-stone-100 mt-4 font-serif">Strefa Nauka AI 🤖</h3>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">Wirtualni asystenci pomogą sprawdzić Twoje wypracowanie lub przeprowadzić próbny egzamin ustny na żywo według kryteriów CKE!</p>

                  {!hasAccess && (
                    (profile?.essay_credits ?? 0) > 0 ? (
                      <div className="mt-3.5 px-3.5 py-2.5 bg-emerald-950/40 border border-emerald-800/30 rounded-xl flex items-center gap-2">
                        <span className="text-base shrink-0">🪙</span>
                        <p className="text-[11px] font-sans font-semibold text-emerald-400 leading-snug text-left">
                          {!user ? "Załóż darmowe konto i przetestuj jedną rozprawkę za darmo! Otrzymasz 1 token na start." : "Masz wolne tokeny! Wykorzystaj je powyżej na analizę rozprawki lub symulację matury ustnej."}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3.5 px-3.5 py-2.5 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center gap-2">
                        <span className="text-base shrink-0">🔒</span>
                        <p className="text-[11px] font-sans font-semibold text-red-400 leading-snug text-left">
                          Wykorzystałeś darmowe tokeny. Odblokuj pełny pakiet lub doładuj tokeny powyżej, aby dalej korzystać z asystentów AI!
                        </p>
                      </div>
                    )
                  )}

                <div className="flex flex-col gap-2.5 mt-4">
                  <button onClick={() => handlePremiumNavigation("/ocenianie-rozprawek")} className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]">✍️ Edytor Rozprawek AI (1 Token)</button>
                  <button onClick={() => handlePremiumNavigation("/matura-ustna")} className="w-full py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-violet-500 hover:border-violet-400 shadow-lg shadow-violet-500/10 active:scale-[0.98]">🎙️ Matura Ustna AI (3 Tokeny)</button>
                </div>

                {user && (
                  <div className="mt-4 pt-4 border-t border-stone-800/60 flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-purple-950/20 border border-purple-900/30 px-3 py-2 rounded-xl">
                      <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Pozostałe tokeny:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-purple-400 bg-stone-900 px-2 py-0.5 rounded-md border border-purple-900/40">{profile?.essay_credits ?? 0} tokeny</span>
                        <button onClick={() => setIsTokenModalOpen(true)} className="text-[9px] uppercase tracking-wider font-extrabold bg-gradient-to-br from-amber-300 to-amber-500 text-stone-950 px-2 py-1 rounded-md hover:from-amber-200 hover:to-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer">
                          Doładuj <span className="text-[11px]">🪙</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CozyGlowCard>
            </section>

            <section className="lg:col-span-6 flex flex-col gap-5">
              <NotesBrowser notes={notes} loading={loading} hasAccess={hasAccess} limit={5} currentTheme={currentTheme} triggerNotification={triggerNotification} />
              
              {!loading && notes.length > 5 && (
                <div className="animate-slide-in">
                  <Link href="/notes" onClick={() => playSound("click")} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm font-bold text-amber-500 hover:text-amber-400 hover:border-amber-500/40 shadow-md`}>
                    <span>Przejdź do pełnej bazy wszystkich notatek ({notes.length})</span>
                    <span>📚 →</span>
                  </Link>
                </div>
              )}
            </section>

            <section className="lg:col-span-3 flex flex-col gap-6">
              <CozyMug currentTheme={currentTheme} />
              <PomodoroTimer currentTheme={currentTheme} triggerNotification={triggerNotification} />
              <QuoteCard currentTheme={currentTheme} />
            </section>
          </main>
        </>
      )}

      {/* FOOTER */}
      <footer className={`border-t ${currentTheme.cardBorder} mt-auto py-6 px-6 text-center text-xs ${currentTheme.subText} transition-colors duration-500 bg-stone-950/20`}>
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Wiedza Szyta na Miarę. Stworzone z miłości do spokojnej nauki.</p>
          <div className="flex gap-4">
            <Link href="/regulamin" className="hover:text-stone-100 transition-colors">Regulamin</Link>
            <Link href="/prywatnosc" className="hover:text-stone-100 transition-colors">Prywatność</Link>
            <Link href="/kontakt" className="hover:text-stone-100 transition-colors">Kontakt</Link>
          </div>
        </div>
      </footer>

      {/* MODALE DIALOGOWE */}
      <ClimaticSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} cozyTheme={cozyTheme} setCozyTheme={setCozyTheme} user={user} triggerNotification={triggerNotification} />
      <CozyNotification notification={cozyNotification} onClose={() => setCozyNotification(null)} />
      <PersonalNotesModal isOpen={isPersonalNotesOpen} onClose={() => { setIsPersonalNotesOpen(false); setSelectedPersonalNote(null); }} currentTheme={currentTheme} personalNotes={personalNotes} setPersonalNotes={setPersonalNotes} triggerNotification={triggerNotification} selectedNote={selectedPersonalNote} />
      <TokenRechargeModal isOpen={isTokenModalOpen} onClose={() => setIsTokenModalOpen(false)} currentTheme={currentTheme} triggerNotification={triggerNotification} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} currentTheme={currentTheme} />
    </div>
  );
}