"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { playSound } from "./lib/sounds";

// Lib & Helpers
import { getThemeClasses, CozyTheme } from "./lib/theme";

// Wyodrębnione Komponenty
import { CozyNotification } from "./components/CozyNotification";
import { ClimaticSettingsModal } from "./components/ClimaticSettingsModal";
import { CozyMug } from "./components/CozyMug";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { QuoteCard } from "./components/QuoteCard";
import { AuthForm } from "./components/AuthForm";
import { PaymentTiers } from "./components/PaymentTiers";
import { NotesBrowser } from "./components/NotesBrowser";

export default function Home() {
  const router = useRouter();

  // Theme state
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");

  // Stan profilu i sesji
  const [profile, setProfile] = useState<any>(null);
  const [recentEssays, setRecentEssays] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dynamiczne notatki pobierane z bazy
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AUTH & STRIPE STATES
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [activePaymentTier, setActivePaymentTier] = useState<string | null>(null);

  // System przytulnych powiadomień
  const [cozyNotification, setCozyNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const triggerNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setCozyNotification({ message, type });
    setTimeout(() => {
      setCozyNotification(null);
    }, 4500);
  };

  // 1. Monitorowanie sesji i logowania
  useEffect(() => {
    async function checkInitialSession() {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    }
    
    checkInitialSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setHasAccess(false);
      }
      setAuthLoading(false);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Pobieranie danych profilu
  useEffect(() => {
    async function fetchUserProfile() {
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_status, essay_credits, expires_at')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData);
          
          const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
          const isStatusActive = activeStatuses.includes(profileData.subscription_status);
          
          let isExpired = false;
          if (profileData.expires_at) {
            const expirationTime = new Date(profileData.expires_at).getTime();
            const currentTime = new Date().getTime();
            isExpired = currentTime > expirationTime;
          }
          
          if (isStatusActive && !isExpired) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        } else {
          setProfile(null);
          setHasAccess(false);
        }
      } else {
        setProfile(null);
        setHasAccess(false);
      }
    }
    fetchUserProfile();
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
          
        if (data && !error) {
          setRecentEssays(data);
        }
      } else {
        setRecentEssays([]);
      }
    }
    fetchRecentEssays();
  }, [user]);

  // 4. Pobieranie bazy notatek
  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("notes").select("*");
        if (!error && data) {
          setNotes(data as any[]);
        }
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, [hasAccess]);

  // Inicjalizacja transakcji Stripe
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
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        triggerNotification('Wystąpił błąd podczas generowania płatności: ' + (data.error || 'Brak linku'), 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Błąd połączenia z serwerem płatności.', 'error');
    } finally {
      setPaymentLoading(false);
      setActivePaymentTier(null);
    }
  };

  // Bezpieczna nawigacja
  const handlePremiumNavigation = (path: string) => {
    if (!user) {
      triggerNotification("🔑 Aby skorzystać z tej funkcji, najpierw się zaloguj!", "info");
      return;
    }
    
    if (path === "/ocenianie-rozprawek") {
      router.push(path);
    } else if (!hasAccess) {
      triggerNotification(
        "🔒 Ta funkcja wymaga konta Premium. Odblokuj pełny dostęp klikając przycisk na górze strony!", 
        "error"
      );
    } else {
      router.push(path);
    }
  };

  // ODTWARZACZ LO-FI: Konfiguracja i obsługa
  const lofiAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lofiActive, setLofiActive] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [lofiVolume, setLofiVolume] = useState(0.3); // domyślna głośność: 30%
  
  const lofiTracks = [
    { name: "Chill Lofi 1", src: "/audio/track1.mp3" },
    { name: "Cozy Lofi 2", src: "/audio/track2.mp3" },
  ];

  const toggleLofi = () => {
    if (!lofiAudioRef.current) {
      lofiAudioRef.current = new Audio(lofiTracks[currentTrackIndex].src);
      lofiAudioRef.current.volume = lofiVolume;
      
      // Kiedy utwór się zakończy, odtwarzaj automatycznie kolejny
      lofiAudioRef.current.addEventListener("ended", () => {
        handleNextTrack();
      });
    }

    if (lofiActive) {
      lofiAudioRef.current.pause();
      setLofiActive(false);
    } else {
      lofiAudioRef.current.play().catch((err) => {
        console.error("Autoodtwarzanie zablokowane przez przeglądarkę:", err);
      });
      setLofiActive(true);
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % lofiTracks.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + lofiTracks.length) % lofiTracks.length);
  };

  const handleVolumeChange = (newVolume: number) => {
    setLofiVolume(newVolume);
    if (lofiAudioRef.current) {
      lofiAudioRef.current.volume = newVolume;
    }
  };

  // Obsługa zmiany utworu w tle
  useEffect(() => {
    if (lofiAudioRef.current) {
      const wasPlaying = lofiActive;
      lofiAudioRef.current.pause();
      lofiAudioRef.current.src = lofiTracks[currentTrackIndex].src;
      lofiAudioRef.current.load();
      if (wasPlaying) {
        lofiAudioRef.current.play().catch((err) => console.error(err));
      }
    }
  }, [currentTrackIndex]);

  // Wyłączenie muzyki przy wyjściu z aplikacji
  useEffect(() => {
    return () => {
      if (lofiAudioRef.current) {
        lofiAudioRef.current.pause();
      }
    };
  }, []);

  // GLOBALNY INTELIGENTNY NASŁUCHIWAĆ KLIKNIĘĆ
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Sprawdzamy, czy kliknięty element (lub jego rodzic) to przycisk, link, lub ma kursor "pointer"
      const isInteractive = 
        target.closest("button") || 
        target.closest("a") || 
        target.closest("[role='button']") ||
        window.getComputedStyle(target).cursor === "pointer";

      // Jeśli element jest klikalny, odtwarzamy dźwięk
      if (isInteractive) {
        playSound("click");
      }
    };

    // Rejestrujemy nasłuchiwanie na poziomie całego okna przeglądarki
    window.addEventListener("click", handleGlobalClick);

    // Czyszczenie nasłuchiwania przy wyjściu ze strony
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes steam {
          0% { transform: translateY(0) scaleX(1); opacity: 0; }
          15% { opacity: 0.4; }
          50% { transform: translateY(-10px) scaleX(1.3); opacity: 0.2; }
          100% { transform: translateY(-22px) scaleX(0.7); opacity: 0; }
        }
        @keyframes slideIn {
          0% { transform: translateY(30px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .steam-line { animation: steam 3.5s infinite ease-in-out; }
        .steam-line-2 { animation: steam 3.5s infinite ease-in-out; animation-delay: 1.2s; }
        .steam-line-3 { animation: steam 3.5s infinite ease-in-out; animation-delay: 2.2s; }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      {/* HEADER SECTION */}
      <header className={`border-b ${currentTheme.cardBorder} px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-sm font-medium ${currentTheme.subText} hover:text-stone-100`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Ustawienia Klimatu
        </button>

        <div className="flex flex-col items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Wiedza Szyta na Miarę
            </h1>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold">
            Maturalny Kącik Spokoju
          </span>
        </div>

        <div className="flex items-center gap-4">
          
          {/* NOWY, ELEGANCKI, WIĘKSZY PANEL STEROWANIA MUZYKĄ LO-FI */}
          <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all select-none shadow-md`}>
            {/* Poprzedni utwór */}
            <button 
              type="button"
              onClick={handlePrevTrack} 
              className="text-stone-400 hover:text-amber-400 p-1.5 rounded-xl hover:bg-stone-800/40 transition-colors"
              title="Poprzedni utwór"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            
            {/* Play / Pauza */}
            <button 
              type="button"
              onClick={toggleLofi} 
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all font-semibold text-sm active:scale-95"
            >
              {lofiActive ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="hidden md:inline text-xs tracking-wide">
                {lofiTracks[currentTrackIndex].name}
              </span>
            </button>
            
            {/* Następny utwór */}
            <button 
              type="button"
              onClick={handleNextTrack} 
              className="text-stone-400 hover:text-amber-400 p-1.5 rounded-xl hover:bg-stone-800/40 transition-colors"
              title="Następny utwór"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
              </svg>
            </button>
            
            {/* Płynny suwak głośności */}
            <div className="flex items-center gap-2.5 ml-1 border-l border-stone-800/80 pl-3">
              <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={lofiVolume} 
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1.5 bg-stone-850 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                style={{
                  WebkitAppearance: "none",
                }}
              />
            </div>
          </div>
          
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-stone-900/60 border border-stone-800">
                <span className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>
                  {user.email.split('@')[0]} (
                  {!hasAccess 
                    ? 'Darmowy' 
                    : profile?.subscription_status 
                      ? (profile.subscription_status.charAt(0).toUpperCase() + profile.subscription_status.slice(1)) 
                      : 'Premium'}
                  )
                </span>
              </div>
              <button
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch (err) {
                    console.warn("Wylogowanie pominięte:", err);
                  } finally {
                    setUser(null);
                    setHasAccess(false);
                    router.refresh();
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white transition-all"
              >
                Wyloguj
              </button>
            </div>
          ) : (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-stone-900/60 border ${currentTheme.cardBorder}`}>
              <span className="w-2 h-2 rounded-full bg-stone-500"></span>
              <span>Gość</span>
            </div>
          )}
        </div>
      </header>

      {/* RENDEROWANIE GŁÓWNEGO WIDOKU */}
      {!user ? (
        <main className="max-w-4xl mx-auto w-full p-6 flex flex-col md:flex-row items-center justify-center gap-12 flex-1">
          <div className="max-w-md text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Matura 2026
            </span>
            <h2 className="text-4xl font-bold text-stone-100 mt-4 leading-tight font-serif tracking-tight">
              Zdasz Maturę z Palcem w Nosie.
            </h2>
            <p className={`mt-4 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
              Witaj w swojej cichej przystani naukowej. Zaloguj się lub utwórz bezpłatne konto, aby uzyskać dostęp do notatek i przygotować się bez zbędnego stresu.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-stone-900/30 border border-stone-800/40 text-xs italic text-stone-400">
              &quot;Cierpliwość i praca tworzą wielkie dzieła.&quot; — Konfucjusz
            </div>
          </div>

          <AuthForm currentTheme={currentTheme} triggerNotification={triggerNotification} />
        </main>
      ) : (
        <>
          {/* HERO BANNER */}
          <div className="max-w-7xl mx-auto w-full px-6 pt-6">
            <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-500 shadow-xl ${currentTheme.glow} flex flex-col md:flex-row items-center justify-between gap-6`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="max-w-xl text-center md:text-left">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {hasAccess ? "Dostęp Aktywny 🎉" : "Matura 2026 🔑"}
                </span>
                
                {hasAccess ? (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-stone-100 mt-3 leading-tight font-serif tracking-tight">
                      Witaj w pakiecie {profile?.subscription_status ? (profile.subscription_status.charAt(0).toUpperCase() + profile.subscription_status.slice(1)) : "Premium"}! 🚀
                    </h2>
                    <p className={`mt-3 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
                      Twój pakiet odblokował pełną bazę wiedzy oraz wszystkie moduły AI. Powodzenia w nauce w najprzytulniejszym kąciku w sieci!
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-stone-100 mt-3 leading-tight font-serif tracking-tight">
                      Odblokuj pełny dostęp Premium.
                    </h2>
                    <p className={`mt-3 text-sm sm:text-base ${currentTheme.subText} leading-relaxed`}>
                      Masz darmowe konto, które pozwala na przeglądanie kącika. Aby odblokować wszystkie notatki z lektur, moduł oceniania wypracowań AI oraz sprawić, by kłódeczki zniknęły – wybierz jeden z pakietów:
                    </p>
                    <PaymentTiers 
                      paymentLoading={paymentLoading}
                      activePaymentTier={activePaymentTier}
                      handlePaymentInit={handlePaymentInit}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-col items-center md:items-end justify-center text-center md:text-right border-t md:border-t-0 md:border-l border-stone-800/80 pt-4 md:pt-0 md:pl-8">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent uppercase">
                  {!hasAccess && "FREE"}
                  {hasAccess && (profile?.subscription_status || "PREMIUM")}
                </span>
                
                <span className="text-xs font-medium uppercase tracking-widest text-stone-400 mt-1">
                  Twój Plan
                </span>
                
                <div className="flex gap-1 mt-2 text-amber-500 text-xs">
                  {profile?.subscription_status === 'mini' && <><span>★</span><span>★</span><span>★</span></>}
                  {profile?.subscription_status === 'medium' && <><span>★</span><span>★</span><span>★</span><span>★</span></>}
                  {(profile?.subscription_status === 'premium' || !hasAccess || !['mini', 'medium'].includes(profile?.subscription_status)) && (
                    <><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></>
                  )}
                </div>
                
                <span className="text-[11px] text-stone-500 mt-1">
                  {!hasAccess && "Zyskaj pełną moc nauki"}
                  {hasAccess && profile?.subscription_status === 'mini' && (
                    profile?.expires_at 
                      ? `Wygasa: ${new Date(profile.expires_at).toLocaleDateString('pl-PL')}` 
                      : "Dostęp ważny na 30 dni"
                  )}
                  {hasAccess && profile?.subscription_status === 'medium' && (
                    profile?.expires_at 
                      ? `Wygasa: ${new Date(profile.expires_at).toLocaleDateString('pl-PL')}` 
                      : "Dostęp ważny na 90 dni"
                  )}
                  {hasAccess && (profile?.subscription_status === 'premium' || !['mini', 'medium'].includes(profile?.subscription_status)) && "Dostęp dożywotni bez reklam"}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT DASHBOARD GRID */}
          <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            {/* COLUMN 1: NAVIGATION & AI ESSAY INFO */}
            <section className="lg:col-span-3 flex flex-col gap-6">
              <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-4 transition-colors duration-500`}>
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-3 px-1">
                  Nawigacja
                </h3>
                <nav className="flex flex-col gap-1">
                  <Link 
                    href="/notes" 
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📚</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Wszystkie Notatki</span>
                    </div>
                    <span className="text-xs bg-stone-900 border border-stone-800 text-amber-500/80 px-2 py-0.5 rounded-full">
                      {notes.length}
                    </span>
                  </Link>

                  <button 
                    onClick={() => handlePremiumNavigation("/postepy")}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📈</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Moje Postępy</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      hasAccess 
                        ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400' 
                        : 'bg-stone-900/60 border-stone-800 text-stone-500'
                    }`}>
                      {hasAccess ? "Wejdź ✨" : "Premium 🔒"}
                    </span>
                  </button>

                  <button 
                    onClick={() => handlePremiumNavigation("/fiszki")}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-900/60 group transition-all text-left w-full"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚡</span>
                      <span className="text-sm font-medium group-hover:text-amber-400 transition-colors">Szybkie Fiszki</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      hasAccess 
                        ? 'bg-purple-950/50 border-purple-900/60 text-purple-300' 
                        : 'bg-stone-900/60 border-stone-800 text-stone-500'
                    }`}>
                      {hasAccess ? "Graj ⚡" : "Premium 🔒"}
                    </span>
                  </button>
                </nav>
              </div>

              {/* AI Essay Card */}
              <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 relative overflow-hidden transition-colors duration-500 group`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-all duration-500" />
                
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-800/40">
                    Kryteria CKE + AI
                  </span>
                  <span className="text-stone-500 text-lg">{hasAccess ? "✨" : "🔒"}</span>
                </div>

                <h3 className="text-base font-bold text-stone-100 mt-4 font-serif">
                  Ocenianie Rozprawek AI
                </h3>
                
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  Prześlij swoje wypracowanie maturalne z języka polskiego. Nasz algorytm AI przeanalizuje je w kilka sekund zgodnie z najnowszymi wytycznymi CKE.
                </p>

                <button
                  onClick={() => handlePremiumNavigation("/ocenianie-rozprawek")}
                  className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    hasAccess 
                      ? 'bg-purple-600 text-white hover:bg-purple-500' 
                      : 'text-purple-200 border border-purple-900/60 bg-purple-950/20 hover:bg-[#2c1b3d]'
                  }`}
                >
                  {hasAccess ? "Uruchom Edytor ✨" : "Zyskaj Dostęp Premium 🔑"}
                </button>

                {user && (
                  <div className="mt-4 pt-4 border-t border-stone-800/60 flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-purple-950/20 border border-purple-900/30 px-3 py-2 rounded-xl">
                      <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Pozostałe tokeny:</span>
                      <span className="text-xs font-bold font-mono text-purple-400 bg-stone-900 px-2 py-0.5 rounded-md border border-purple-900/40">
                        {profile?.essay_credits ?? 0} {profile?.essay_credits === 1 ? "token" : "tokeny"}
                      </span>
                    </div>

                    {recentEssays.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Ostatnio oceniane:</span>
                        <div className="flex flex-col gap-1.5">
                          {recentEssays.map((essay) => (
                            <div 
                              key={essay.id}
                              onClick={() => handlePremiumNavigation("/ocenianie-rozprawek")}
                              className="flex justify-between items-center p-2 rounded-lg bg-stone-950/40 hover:bg-purple-950/20 border border-stone-900 hover:border-purple-900/30 transition-all cursor-pointer group/item"
                            >
                              <span className="text-[10px] text-stone-400 font-serif truncate max-w-[130px] group-hover/item:text-stone-200">
                                {essay.topic || "Bez tytułu"}
                              </span>
                              <span className="text-[10px] font-bold font-mono text-emerald-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                                {essay.score || "Ocena"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* COLUMN 2: CENTRAL NOTES BROWSER */}
            <section className="lg:col-span-6 flex flex-col gap-5">
              <NotesBrowser 
                notes={notes}
                loading={loading}
                hasAccess={hasAccess}
                currentTheme={currentTheme}
                triggerNotification={triggerNotification}
              />
            </section>

            {/* COLUMN 3: STUDY CORNER SIDEBAR */}
            <section className="lg:col-span-3 flex flex-col gap-6">
              <CozyMug currentTheme={currentTheme} />
              
              <PomodoroTimer 
                currentTheme={currentTheme} 
                triggerNotification={triggerNotification} 
              />
              
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

      {/* CLIMATIC SETTINGS DIALOG */}
      <ClimaticSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        cozyTheme={cozyTheme}
        setCozyTheme={setCozyTheme}
        user={user}
        triggerNotification={triggerNotification}
      />

      {/* COZY NOTIFICATIONS */}
      <CozyNotification 
        notification={cozyNotification} 
        onClose={() => setCozyNotification(null)} 
      />
    </div>
  );
}