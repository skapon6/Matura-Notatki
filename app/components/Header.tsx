// components/Header.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { ThemeClasses } from "../lib/theme";
import { useLofi } from "../context/LofiContext";

interface HeaderProps {
  currentTheme: ThemeClasses;
  user: any;
  profile: any;
  hasAccess: boolean;
  onOpenSettings: (tab?: "climate" | "account" | "goal") => void;
  onOpenHelp: () => void;
  onOpenTokens: () => void;
  onOpenPersonalNotes: () => void;
  handlePremiumNavigation: (path: string) => void;
}

export function Header({
  currentTheme,
  user,
  profile,
  hasAccess,
  onOpenSettings,
  onOpenHelp,
  onOpenTokens,
  onOpenPersonalNotes,
  handlePremiumNavigation,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);

  const {
    lofiActive,
    currentTrackIndex,
    lofiVolume,
    lofiTracks,
    toggleLofi,
    handleNextTrack,
    handlePrevTrack,
    handleVolumeChange,
  } = useLofi();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Wylogowanie pominięte:", err);
    } finally {
      router.refresh();
      window.location.reload();
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className={`border-b ${currentTheme.cardBorder} backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
      <div className="px-4 sm:px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4 w-full mx-auto max-w-[1800px]">

        {/* --- STREFA LEWA --- */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2 select-none shrink-0 group cursor-pointer active:scale-95 transition-transform"
          >
            <span className="text-xl sm:text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">📖</span>
            <div className="flex flex-col text-left">
              <h1 className="text-sm md:text-base font-bold tracking-wide bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 bg-clip-text text-transparent drop-shadow-sm group-hover:brightness-110 transition-all">
                <span className="hidden sm:inline">Wiedza Szyta na Miarę</span>
                <span className="inline sm:hidden tracking-widest">WSnM</span>
              </h1>
              <span className="hidden xl:block text-[9px] uppercase tracking-widest text-amber-500/60 font-semibold group-hover:text-amber-400/80 transition-colors">
                Maturalny Kącik Spokoju
              </span>
            </div>
          </Link>

          {/* Szybkie Akcje */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="relative" ref={navMenuRef}>
              <button
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-semibold text-stone-300 hover:text-stone-100 cursor-pointer`}
              >
                <span>🧭</span>
                <span className="hidden sm:inline">Nawigacja</span>
                <svg className={`w-3 h-3 text-stone-500 transition-transform duration-200 ${isNavMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isNavMenuOpen && (
                <div className={`absolute right-0 lg:left-0 lg:right-auto mt-2 w-52 rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-2 shadow-xl z-50 animate-slide-in flex flex-col gap-1 backdrop-blur-lg`}>
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-stone-500 border-b border-stone-800/40 mb-1">
                    Szybka Nawigacja
                  </div>
                  
                  <button onClick={() => { setIsNavMenuOpen(false); handlePremiumNavigation("/notes"); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full cursor-pointer">
                    <span>📚</span> Wszystkie Notatki
                  </button>
                  
                  <button onClick={() => { setIsNavMenuOpen(false); handlePremiumNavigation("/postepy"); }} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full group cursor-pointer">
                    <div className="flex items-center gap-2.5"><span>📈</span><span>Moje Postępy</span></div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${hasAccess ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400 font-semibold' : 'bg-stone-900/60 border-stone-800 text-stone-500'}`}>{hasAccess ? "Wejdź" : "Premium 🔒"}</span>
                  </button>
                  
                  <button onClick={() => { setIsNavMenuOpen(false); handlePremiumNavigation("/fiszki"); }} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full group cursor-pointer">
                    <div className="flex items-center gap-2.5"><span>⚡</span><span>Szybkie Fiszki</span></div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${hasAccess ? 'bg-purple-950/50 border-purple-900/60 text-purple-300 font-semibold' : 'bg-stone-900/60 border-stone-800 text-stone-500'}`}>{hasAccess ? "Graj" : "Premium 🔒"}</span>
                  </button>

                  <button onClick={() => { setIsNavMenuOpen(false); handlePremiumNavigation("/mapa-mysli"); }} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full group cursor-pointer">
                    <div className="flex items-center gap-2.5"><span>🧠</span><span>Mapa Myśli</span></div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${hasAccess ? 'bg-amber-950/50 border-amber-900/60 text-amber-400 font-semibold' : 'bg-stone-900/60 border-stone-800 text-stone-500'}`}>{hasAccess ? "Wejdź" : "Premium 🔒"}</span>
                  </button>

                  <button onClick={() => { setIsNavMenuOpen(false); onOpenPersonalNotes(); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full cursor-pointer">
                    <span>⭐</span> Zapamiętane Cytaty
                  </button>
                  
                  <div className="border-t border-stone-800/40 my-1" />
                  
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-purple-400">
                    Wirtualna Nauka AI
                  </div>
                  
                  <button onClick={() => { setIsNavMenuOpen(false); handlePremiumNavigation("/ocenianie-rozprawek"); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-purple-400 hover:bg-stone-900/40 transition-all text-left w-full cursor-pointer">
                    <span>✍️</span> Edytor Rozprawek AI
                  </button>
                  
                  <button onClick={() => { setIsNavMenuOpen(false); handlePremiumNavigation("/matura-ustna"); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-purple-400 hover:bg-stone-900/40 transition-all text-left w-full cursor-pointer">
                    <span>🎙️</span> Matura Ustna AI
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => onOpenSettings("climate")} className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-medium ${currentTheme.subText} hover:text-stone-100 cursor-pointer`} title="Ustawienia">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden xl:inline">Ustawienia</span>
            </button>

            <button onClick={onOpenHelp} className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-medium ${currentTheme.subText} hover:text-stone-100 cursor-pointer`} title="Przewodnik i Pomoc">
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden xl:inline">Pomoc</span>
            </button>
          </div>
        </div>

        {/* --- STREFA PRAWA --- */}
        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-3 lg:gap-4 border-t lg:border-t-0 border-stone-800/40 pt-3 lg:pt-0">
          
          {/* Lo-Fi Player */}
          <div className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all duration-300 select-none shadow-md hover:border-amber-500/20 hover:bg-stone-900/30 hover:shadow-lg hover:shadow-amber-500/5`}>
            <button onClick={handlePrevTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors cursor-pointer" title="Poprzedni utwór">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            
            <button onClick={toggleLofi} className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all font-semibold text-xs active:scale-95 cursor-pointer">
              {lofiActive ? (
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-[10px] sm:text-[11px] tracking-wide truncate max-w-[80px] md:max-w-[120px] xl:max-w-[150px]">
                {lofiTracks[currentTrackIndex].name}
              </span>
            </button>
            
            <button onClick={handleNextTrack} className="text-stone-400 hover:text-amber-400 p-1 rounded-xl hover:bg-stone-800/40 transition-colors cursor-pointer" title="Następny utwór">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
              </svg>
            </button>
            
            {/* Suwak głośności */}
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2 ml-1 border-l border-stone-800/80 pl-2 sm:pl-3">
              <svg className="w-4 h-4 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 12H3a1 1 0 01-1-1V9a1 1 0 011-1h1.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={lofiVolume} 
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-12 lg:w-16 xl:w-20 h-1 bg-stone-850 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                style={{ WebkitAppearance: "none" }}
              />
            </div>
          </div>
          
          {/* Panel Użytkownika */}
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                onClick={onOpenTokens}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-purple-900/30 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30 active:scale-95 transition-all text-xs font-bold cursor-pointer shadow-sm"
                title="Twoje tokeny AI. Kliknij, aby doładować."
              >
                <span>🪙</span>
                <span className="font-mono">{profile?.essay_credits ?? 0}</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {/* 🎯 KLIKALNY KAFELEK PROFILU BEZ ZIELONEJ KROPKI */}
                <button
                  onClick={() => onOpenSettings("account")}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs rounded-full bg-stone-900/70 border border-stone-800 hover:border-amber-500/40 hover:bg-stone-900 text-stone-300 hover:text-amber-200 transition-all cursor-pointer select-none active:scale-95 shadow-sm group"
                  title="Kliknij, aby zmienić hasło lub zarządzać kontem"
                >
                  <span className="text-[11px] group-hover:scale-110 transition-transform">👤</span>
                  <span className="font-medium">
                    {user.email.split('@')[0]}
                    <span className="text-stone-500 ml-1 font-normal">
                      ({!hasAccess 
                        ? 'Darmowy' 
                        : profile?.subscription_status 
                          ? (profile.subscription_status.charAt(0).toUpperCase() + profile.subscription_status.slice(1)) 
                          : 'Premium'})
                    </span>
                  </span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white transition-all whitespace-nowrap cursor-pointer active:scale-95"
                >
                  Wyloguj
                </button>
              </div>
            ) : (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-stone-900/60 border ${currentTheme.cardBorder}`}>
                <span className="text-[11px]">👤</span>
                <span>Gość</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}