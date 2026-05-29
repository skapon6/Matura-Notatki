"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Lib, Helpers & Komponenty
import { getThemeClasses, CozyTheme } from "../lib/theme";
import { playSound } from "../lib/sounds";
import { Header } from "../components/Header";
import { ConceptMindMap } from "../components/ConceptMindMap";

// Modale i powiadomienia
import { CozyNotification } from "../components/CozyNotification";
import { ClimaticSettingsModal } from "../components/ClimaticSettingsModal";
import { TokenRechargeModal } from "../components/TokenRechargeModal";
import { HelpModal } from "../components/HelpModal";
import { PersonalNotesModal } from "../components/PersonalNotesModal";


export default function MapaMysliPage() {
  const router = useRouter();

  // Theme state
// Theme state
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCozyTheme(savedTheme);
    }
  }, []);
  
  

  // Stan profilu i sesji
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Modale states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isPersonalNotesOpen, setIsPersonalNotesOpen] = useState(false);
  const [selectedPersonalNote, setSelectedPersonalNote] = useState<any | null>(null);
  const [personalNotes, setPersonalNotes] = useState<any[]>([]);

  // System powiadomień
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

  // 1. Monitorowanie sesji
  useEffect(() => {
    async function checkInitialSession() {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      else {
        setUser(null);
        router.push("/"); // Jeśli niezalogowany, powrót na stronę główną
      }
      setAuthLoading(false);
    }
    
    checkInitialSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser(session.user);
      else {
        setUser(null);
        setHasAccess(false);
        router.push("/");
      }
      setAuthLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, [router]);

  // 2. Pobieranie profilu
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
          
          const userHasAccess = isStatusActive && !isExpired;
          setHasAccess(userHasAccess);

          // Route Guard: Jeśli profil pobrany, ale brak dostępu premium - powrót na stronę główną
          if (!userHasAccess) {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      }
    }
    fetchUserProfile();
  }, [user, router]);

  // 3. Obsługa nawigacji z nagłówka
  const handlePremiumNavigation = (path: string) => {
    if (path === "/ocenianie-rozprawek" || path === "/matura-ustna" || path === "/notes" || path === "/mapa-mysli") {
      router.push(path);
    } else if (!hasAccess) {
      triggerNotification("🔒 Ta funkcja wymaga konta Premium.", "error");
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
          Wczytywanie mapy myśli...
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

      {/* OBSZAR GŁÓWNY MAPY */}
      <main className="max-w-6xl mx-auto w-full p-6 flex flex-col gap-6 flex-1 animate-slide-in">
        
        {/* Przycisk powrotu na stronę główną */}
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            onClick={() => playSound("click")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-amber-500 transition-colors bg-stone-900/40 border border-stone-800/60 px-4 py-2 rounded-xl"
          >
            ← Wróć do Panelu Głównego
          </Link>
          <span className="text-xs text-stone-500 font-medium font-serif">Kącik nauki i skupienia</span>
        </div>

        {/* Dynamiczny komponent mapy myśli */}
        <ConceptMindMap 
          currentTheme={currentTheme} 
          triggerNotification={triggerNotification} 
        />

      </main>

      {/* STOPKA */}
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