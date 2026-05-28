"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Lib & Helpers
import { getThemeClasses, CozyTheme } from "./lib/theme";
import { playSound } from "./lib/sounds";

// Wyodrębnione Komponenty
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

// Import globalnego odtwarzacza Lo-Fi
import { useLofi } from "./context/LofiContext";

export default function Home() {
  const router = useRouter();

  // POBIERANIE GLOBALNEGO ODTWARZACZA LO-FI (Czysto i bez zbędnego kodu w tym pliku!)
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

  // Theme state
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");

  // Stan profilu i sesji
  const [profile, setProfile] = useState<any>(null);
  const [recentEssays, setRecentEssays] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Stan otwarcia modalu pomocy (instrukcji)
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Dynamiczne notatki pobierane z bazy
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Osobiste notatki (gwiazdki) pobierane z bazy
  const [personalNotes, setPersonalNotes] = useState<any[]>([]);
  const [personalNotesLoading, setPersonalNotesLoading] = useState(false);

  // Stany otwarcia szczegółowego notesu z cytatami
  const [isPersonalNotesOpen, setIsPersonalNotesOpen] = useState(false);
  const [selectedPersonalNote, setSelectedPersonalNote] = useState<any | null>(null);

  // Stan otwarcia modalu doładowań tokenów
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  // Stan otwarcia nowego menu nawigacji u góry
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);

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
    
    if (type === "success") {
      playSound("success");
    } else if (type === "error") {
      playSound("error");
    } else {
      playSound("click");
    }

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

  // 5. Pobieranie osobistych notatek (gwiazdek)
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
        if (!error && data) {
          setPersonalNotes(data);
        }
      } catch (err) {
        console.error("Error fetching personal notes:", err);
      } finally {
        setPersonalNotesLoading(false);
      }
    }
    fetchPersonalNotes();
  }, [user]);

  // 6. INTELIGENTNE WYKRYWANIE I CZYSZCZENIE URL PO ZAKUPIE STRIPE
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("payment") === "success") {
        triggerNotification(
          "🎉 Dziękujemy za zakup! Twoje konto i tokeny zostały pomyślnie zaktualizowane.", 
          "success"
        );
        
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // 7. OBSŁUGA ZAMYKANIA DROPDOWNA NAWIGACJI PO KLIKNIĘCIU POZA NIM
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    
    if (path === "/ocenianie-rozprawek" || path === "/matura-ustna" || path === "/notes") {
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

  // GLOBALNY INTELIGENTNY NASŁUCHIWAĆ KLIKNIĘĆ
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

    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // Funkcja wywołująca otwarcie modala dla notatek
  const handleOpenPersonalNotes = (note?: any) => {
    if (note) {
      setSelectedPersonalNote(note);
    } else {
      setSelectedPersonalNote(null);
    }
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
        <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>  
        {/* Lewa strefa: Ustawienia Klimatu oraz logo na komórkach */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
          <div className="flex md:hidden items-center gap-2 select-none">
            <span className="text-xl">📖</span>
            <h1 className="text-sm font-bold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              Wiedza Szyta na Miarę
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* ROZWIJANE MENU SKRÓTÓW I NAWIGACJI */}
            <div className="relative" ref={navMenuRef}>
              <button
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-semibold text-stone-300 hover:text-stone-100`}
              >
                <span>🧭</span>
                <span className="hidden sm:inline">Nawigacja</span>
                <svg className={`w-3 h-3 text-stone-500 transition-transform duration-200 ${isNavMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isNavMenuOpen && (
                <div className={`absolute left-0 mt-2 w-52 rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-2 shadow-xl z-50 animate-slide-in flex flex-col gap-1 backdrop-blur-lg`}>
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-stone-500 border-b border-stone-800/40 mb-1">
                    Szybka Nawigacja
                  </div>
                  <button
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      handlePremiumNavigation("/notes");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full"
                  >
                    <span>📚</span> Wszystkie Notatki
                  </button>
                  <button
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      handlePremiumNavigation("/postepy");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full"
                  >
                    <span>📈</span> Moje Postępy
                  </button>
                  <button
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      handlePremiumNavigation("/fiszki");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full"
                  >
                    <span>⚡</span> Szybkie Fiszki
                  </button>
                  <button
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      handleOpenPersonalNotes();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full"
                  >
                    <span>⭐</span> Zapamiętane Cytaty
                  </button>
                  
                  <div className="border-t border-stone-800/40 my-1" />
                  
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-purple-400">
                    Wirtualna Nauka AI
                  </div>
                  <button
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      handlePremiumNavigation("/ocenianie-rozprawek");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-purple-400 hover:bg-stone-900/40 transition-all text-left w-full"
                  >
                    <span>✍️</span> Edytor Rozprawek AI
                  </button>
                  <button
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      handlePremiumNavigation("/matura-ustna");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-purple-400 hover:bg-stone-900/40 transition-all text-left w-full"
                  >
                    <span>🎙️</span> Matura Ustna AI
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-medium ${currentTheme.subText} hover:text-stone-100`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ustawienia
            </button>

            {/* CZYTELNA, INTERAKTYWNA INSTRUKCJA Z NAPISEM */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-medium ${currentTheme.subText} hover:text-stone-100`}
              title="Przewodnik i Pomoc"
            >
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Pomoc</span>
            </button>
          </div>
        </div>

        {/* Środkowa strefa: Logo (wycentrowane absolutnie na desktopie za pomocą md:absolute) */}
        <div className="hidden md:flex flex-col items-center select-none md:absolute md:left-1/2 md:-translate-x-1/2 md:transform z-10">
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

        {/* Prawa strefa: Panel Lo-Fi oraz Profil użytkownika */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 border-stone-800/40 pt-3 md:pt-0">
          
        {/* LEKKO ZMNIEJSZONY PANEL MUZYKI LO-FI Z EFEKTEM HOVER */}
          <div className={`flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all duration-300 select-none shadow-md hover:border-amber-500/20 hover:bg-stone-900/30 hover:shadow-lg hover:shadow-amber-500/5`}>            {/* Poprzedni utwór */}
            <button 
              type="button"
              onClick={handlePrevTrack} 
              className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors"
              title="Poprzedni utwór"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            
            {/* Play / Pauza */}
            <button 
              type="button"
              onClick={toggleLofi} 
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all font-semibold text-xs active:scale-95"
            >
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
            
            {/* Następny utwór */}
            <button 
              type="button"
              onClick={handleNextTrack} 
              className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors"
              title="Następny utwór"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
              </svg>
            </button>
            
            {/* Płynny suwak głośności */}
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
                style={{
                  WebkitAppearance: "none",
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* WYŚWIETLANIE LICZBY AKTYWNYCH TOKENÓW W NAGŁÓWKU */}
            {user && (
              <button
                onClick={() => setIsTokenModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-900/30 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30 active:scale-95 transition-all text-xs font-bold"
                title="Twoje tokeny AI. Kliknij, aby doładować."
              >
                <span>🪙</span>
                <span className="font-mono">{profile?.essay_credits ?? 0}</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-stone-900/60 border border-stone-800">
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
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white transition-all whitespace-nowrap"
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
              &quot;Cierpliwość i praca tworzą wielkie deeds.&quot; — Konfucjusz
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
              {/* LICZNIK DO MATURY */}
              <MaturaCountdown currentTheme={currentTheme} />

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

              {/* ZAPAMIĘTANE CYTATY */}
              <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 transition-colors duration-500 flex flex-col gap-3`}>
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold px-1 flex items-center justify-between">
                  <span>Zapamiętane cytaty ⭐</span>
                  <span className="text-[10px] bg-stone-900 border border-stone-800 text-amber-500/80 px-2 py-0.5 rounded-full">
                    {personalNotes.length}
                  </span>
                </h3>
                
                <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-stone-800">
                  <PersonalNotesList 
                  currentTheme={currentTheme}
                  personalNotes={personalNotes}
                  setPersonalNotes={setPersonalNotes}
                  triggerNotification={triggerNotification}
                  loading={personalNotesLoading}
                  onOpenModal={handleOpenPersonalNotes}
                />
                </div>
              </div>

              {/* STREFA NAUKI AI 🤖 Z DWOMA PRZYCISKAMI */}
              <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 relative overflow-hidden transition-colors duration-500 group`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-all duration-500" />
                
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-800/40">
                    Sztuczna Inteligencja
                  </span>
                  <span className="text-stone-500 text-lg">{hasAccess ? "🤖" : "🔒"}</span>
                </div>

                <h3 className="text-base font-bold text-stone-100 mt-4 font-serif">
                  Strefa Nauki AI 🤖
                </h3>
                
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  Skorzystaj z wirtualnych asystentów, aby sprawdzić swoje wypracowanie lub przeprowadzić próbny egzamin ustny na żywo według kryteriów CKE!
                </p>

                {/* PRZYCISKI DO DWÓCH MODUŁÓW AI */}
                <div className="flex flex-col gap-2.5 mt-4">
                  {/* Przycisk 1: Edytor Rozprawek */}
                  <button
                    onClick={() => handlePremiumNavigation("/ocenianie-rozprawek")}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>✍️</span> Edytor Rozprawek AI (1 Token)
                  </button>

                  {/* Przycisk 2: Symulator Matury Ustnej */}
                  <button
                    onClick={() => handlePremiumNavigation("/matura-ustna")}
                    className="w-full py-2.5 bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-850 hover:text-stone-100 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>🎙️</span> Matura Ustna AI (3 Tokeny)
                  </button>
                </div>

                {user && (
                  <div className="mt-4 pt-4 border-t border-stone-800/60 flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-purple-950/20 border border-purple-900/30 px-3 py-2 rounded-xl">
                      <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Pozostałe tokeny:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-purple-400 bg-stone-900 px-2 py-0.5 rounded-md border border-purple-900/40">
                          {profile?.essay_credits ?? 0} {profile?.essay_credits === 1 ? "token" : "tokeny"}
                        </span>
                        
                        {/* PRZYCISK: DOŁADOWANIE TOKENÓW */}
                        <button
                          onClick={() => setIsTokenModalOpen(true)}
                          className="text-[9px] uppercase tracking-wider font-extrabold bg-amber-500 text-stone-950 px-2 py-1 rounded-md hover:bg-amber-400 transition-all shadow"
                        >
                          Doładuj 🪙
                        </button>
                      </div>
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
                limit={5}
                currentTheme={currentTheme}
                triggerNotification={triggerNotification}
              />

              {/* PRZYCISK PRZEJŚCIA DO PEŁNEJ BAZY NOTATEK (Pokazuje się po załadowaniu) */}
              {!loading && notes.length > 5 && (
                <div className="animate-slide-in">
                  <Link
                    href="/notes"
                    onClick={() => playSound("click")}
                    className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm font-bold text-amber-500 hover:text-amber-400 hover:border-amber-500/40 shadow-md`}
                  >
                    <span>Przejdź do pełnej bazy wszystkich notatek ({notes.length})</span>
                    <span>📚 →</span>
                  </Link>
                </div>
              )}
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

      {/* PERSONAL NOTES DIALOG MODAL */}
      <PersonalNotesModal 
        isOpen={isPersonalNotesOpen}
        onClose={() => {
          setIsPersonalNotesOpen(false);
          setSelectedPersonalNote(null);
        }}
        currentTheme={currentTheme}
        personalNotes={personalNotes}
        setPersonalNotes={setPersonalNotes}
        triggerNotification={triggerNotification}
        selectedNote={selectedPersonalNote}
      />

      {/* MODAL DOŁADOWAŃ TOKENÓW */}
      <TokenRechargeModal 
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentTheme={currentTheme}
        triggerNotification={triggerNotification}
      />

      {/* DUSTY, INTERAKTYWNA INSTRUKCJA */}
      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        currentTheme={currentTheme}
      />
    </div>
  );
}