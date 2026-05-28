"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { ThemeClasses } from "../lib/theme";
import { useLofi } from "../context/LofiContext";

interface HeaderProps {
  currentTheme: ThemeClasses;
  user: any;
  profile: any;
  hasAccess: boolean;
  onOpenSettings: () => void;
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
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);

  // Bezpośrednie pobieranie odtwarzacza wewnątrz nagłówka!
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

  // Zamykanie menu po kliknięciu poza nie
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

  return (
    <header className={`border-b ${currentTheme.cardBorder} px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500`}>
      {/* Lewa strefa: Ustawienia, Nawigacja, Pomoc */}
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
                
                {/* Przycisk: Moje Postępy (Zabezpieczony kłódką dla kont darmowych) */}
                <button
                  onClick={() => {
                    setIsNavMenuOpen(false);
                    handlePremiumNavigation("/postepy");
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full group"
                >
                  <div className="flex items-center gap-2.5">
                    <span>📈</span>
                    <span>Moje Postępy</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                    hasAccess 
                      ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400 font-semibold' 
                      : 'bg-stone-900/60 border-stone-800 text-stone-500'
                  }`}>
                    {hasAccess ? "Wejdź" : "Premium 🔒"}
                  </span>
                </button>
                
                {/* Przycisk: Szybkie Fiszki (Zabezpieczony kłódką dla kont darmowych) */}
                <button
                  onClick={() => {
                    setIsNavMenuOpen(false);
                    handlePremiumNavigation("/fiszki");
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full group"
                >
                  <div className="flex items-center gap-2.5">
                    <span>⚡</span>
                    <span>Szybkie Fiszki</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                    hasAccess 
                      ? 'bg-purple-950/50 border-purple-900/60 text-purple-300 font-semibold' 
                      : 'bg-stone-900/60 border-stone-800 text-stone-500'
                  }`}>
                    {hasAccess ? "Graj" : "Premium 🔒"}
                  </span>
                </button>

                {/* Przycisk: Mapa Myśli */}
                <button 
                  onClick={() => {
                    setIsNavMenuOpen(false);
                    handlePremiumNavigation("/mapa-mysli");
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-amber-400 hover:bg-stone-900/40 transition-all text-left w-full group"
                >
                  <div className="flex items-center gap-2.5">
                    <span>🧠</span>
                    <span>Mapa Myśli</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                    hasAccess 
                      ? 'bg-amber-950/50 border-amber-900/60 text-amber-400 font-semibold' 
                      : 'bg-stone-900/60 border-stone-800 text-stone-500'
                  }`}>
                    {hasAccess ? "Wejdź" : "Premium 🔒"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsNavMenuOpen(false);
                    onOpenPersonalNotes();
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
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-medium ${currentTheme.subText} hover:text-stone-100`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ustawienia
          </button>

          <button
            onClick={onOpenHelp}
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

      {/* Środkowa strefa: Logo */}
      <div className="hidden md:flex flex-col items-center select-none">
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

      {/* Prawa strefa: Lo-Fi, Tokeny, Wylogowywanie */}
      <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 border-stone-800/40 pt-3 md:pt-0">
        <div className={`flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} transition-all duration-300 select-none shadow-md hover:border-amber-500/20 hover:bg-stone-900/30 hover:shadow-lg hover:shadow-amber-500/5`}>
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
        
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={onOpenTokens}
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
                onClick={handleSignOut}
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
  );
}