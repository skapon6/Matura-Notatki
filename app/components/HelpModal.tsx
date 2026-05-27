"use client";

import React, { useState } from "react";
import { ThemeClasses, CozyTheme } from "../lib/theme"; // <-- DODAJ COZYTHEME TUTAJ
import { playSound } from "../lib/sounds";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeClasses;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, currentTheme }) => {
  // Stan kontrolujący, która sekcja instrukcji jest aktualnie rozwinięta
  const [activeSection, setActiveSection] = useState<string | null>("intro");

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const sections = [
    {
      id: "intro",
      title: "🏡 O co chodzi w Kąciku Wiedzy Szytej na Miarę?",
      content: (
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans">
          Witaj w swoim **maturalnym kąciku spokoju**! To miejsce zostało zaprojektowane tak, abyś mógł przygotować się do matury z języka polskiego bez zbędnego stresu. Połączyliśmy kompleksową bazę notatek z lektur, zaawansowane moduły sztucznej inteligencji, aktywne fiszki oraz przytulną oprawę dźwiękową (muzyka Lo-Fi), która ułatwia głębokie skupienie.
        </p>
      ),
    },
    {
      id: "essay",
      title: "✍️ Edytor Rozprawek AI (Sztuczna Inteligencja CKE)",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Nasz moduł sztucznej inteligencji potrafi przeanalizować Twoje pisemne wypracowanie zgodnie z najnowszymi wytycznymi CKE w zaledwie kilka sekund!</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Jak to działa?</strong> Kliknij przycisk „Uruchom Edytor AI”, wklej temat oraz treść rozprawki i zatwierdź. AI oceni merytorykę, kompozycję, błędy językowe, ortografię i wskaże punkty do poprawy.</li>
            <li><strong className="text-stone-300">Koszt (Tokeny):</strong> Każda ocena rozprawki kosztuje dokładnie **1 token**.</li>
            <li><strong className="text-stone-300">Doładowanie:</strong> Jeśli skończą Ci się darmowe tokeny, kliknij przycisk <span className="text-amber-500 font-bold">Doładuj 🪙</span> obok ich licznika. Bezpieczna płatność Stripe Checkout pozwoli Ci natychmiast zakupić pakiety: 5, 10 lub 20 tokenów.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "oral",
      title: "🎙️ NOWOŚĆ: Symulator Matury Ustnej AI",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>To nasz najbardziej zaawansowany moduł, który symuluje prawdziwy państwowy egzamin ustny!</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Losowanie Zestawu:</strong> Zgodnie z wymogami CKE losujesz pełny zestaw: **Zadanie 1** (pytanie jawne z lektury) oraz **Zadanie 2** (pytanie niejawne, oparte na wyświetlanym obrazie lub plakacie) [1].</li>
            <li><strong className="text-stone-300">Przygotowanie:</strong> Masz 15 minut (odliczane stoperem) na sporządzenie notatek w dwóch osobnych brudnopisach.</li>
            <li><strong className="text-stone-300">Monolog i Ocena:</strong> Wygłaszasz mowę na oba pytania po kolei i przesyłasz ją do weryfikacji. AI (jako komisja CKE) oceni meritum, język, strukturę, wyliczy punkty (max 30 pkt) oraz zada Ci 2 trudne pytania dopytujące [1]!</li>
            <li><strong className="text-stone-300">Koszt (Tokeny):</strong> Ze względu na wysoki stopień skomplikowania (analiza tekstu i obrazu jednocześnie) egzamin ustny kosztuje **3 tokeny** [1].</li>
            <li><strong className="text-stone-300">🎙️ Ważne – Dyktowanie głosowe:</strong> Klikając przycisk *Mów (Dyktuj)*, możesz nagrać swoją mowę zamiast jej pisać [1]. <strong className="text-red-400">Uwaga: ta funkcja działa wyłącznie w przeglądarkach Google Chrome oraz Microsoft Edge</strong> [1.1, 1.2]. W przeglądarce Firefox (oraz niektórych innych) dyktowanie nie jest domyślnie wspierane i pokaże komunikat o błędzie – w takim wypadku po prostu wpisz tekst klawiaturą [1.1, 1.2].</li>
          </ul>
        </div>
      ),
    },
    {
      id: "fiszki",
      title: "⚡ Szybkie Fiszki Maturalne i System Leitnera",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Fiszki pomagają w błyskawicznej powtórce kluczowych motywów lektur przed samym egzaminem:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Tryb Gry (Zakładka Wszystkie):</strong> Klikaj kartę, aby odwrócić ją i poznać odpowiedź. Oznaczaj fiszki jako <span className="text-emerald-400">„Opanowane! ✅”</span> (przesuną się błyskawicznie w prawo) lub <span className="text-red-400">„Nie znam ❌”</span> (przesuną się w lewo).</li>
            <li><strong className="text-stone-300">Tryb Szybkiej Listy (Do nauki / Opanowane):</strong> Te zakładki automatycznie zamieniają się w pionową, przejrzystą listę wszystkich pytań i odpowiedzi [2]. Możesz tam szybko wszystko przejrzeć bez odwracania kart i zmieniać ich statusy jednym kliknięciem [2].</li>
          </ul>
        </div>
      ),
    },
    {
      id: "selection",
      title: "⭐ Funkcja: Zaznacz i Zapamiętaj (Złote Cytaty)",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Podczas czytania dowolnej notatki możesz tworzyć swój osobisty, spersonalizowany zeszyt ściągawki:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Jak dodać?</strong> Przeciągnij kursorem myszy i zaznacz dowolne zdanie w notatce (maksymalnie 400 znaków). Nad zaznaczeniem pojawi się gwiazdka <span className="text-amber-500">⭐</span>. Kliknij ją, a cytat zostanie zapisany w bazie!</li>
            <li><strong className="text-stone-300">Blokada Kopiowania:</strong> Aby chronić unikalne materiały naukowe, tradycyjne kopiowanie (Ctrl+C, Cmd+C) oraz prawy przycisk myszy są zablokowane. Tekst możesz jednak skopiować bezpośrednio ze swojego Zeszytu Cytatów na stronie głównej!</li>
            <li><strong className="text-stone-300">Limit 50 cytatów:</strong> Aby chronić darmową bazę Supabase, każde konto może zapisać maksymalnie 50 cytatów. Jeśli osiągniesz limit, usuń starsze cytaty (czerwonym koszem), aby zwolnić miejsce na nowe.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "cozy",
      title: "🎵 Przytulny Klimat i Dźwięki (Tipy na 100% skupienia)",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Zadbaliśmy o idealną atmosferę skupienia podczas nauki:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Muzyka nie przerywa (Persistent Audio):</strong> Dzięki globalnemu odtwarzaczowi w chmurze, gdy włączysz Lo-Fi na stronie głównej, muzyka będzie grać nieprzerwanie, kiedy wchodzisz na Fiszki czy przeglądasz listę notatek [1]!</li>
            <li><strong className="text-stone-300">Dźwięki interfejsu (SFX):</strong> Klikanie przycisków, oznaczanie fiszek czy powiadomienia generują ciche, satysfakcjonujące dźwięki (np. odgłos sukcesu przy poprawnej fiszce) [2].</li>
            <li><strong className="text-stone-300">💡 Tip na idealną sesję nauki:</strong> Kliknij przycisk <span className="text-amber-500">Ustawienia</span> i ustaw swój **Dzienny Cel Nauki** (np. 50 minut) [1]. Następnie na stronie głównej zaparz wirtualną herbatę klikając kubek, włącz muzykę lo-fi i uruchom stoper **Pomodoro**! Stoper będzie odliczał czas i sekunda po sekundzie uzupełniał Twój dzienny i łączny licznik czasu nauki [1, 2]!</li>
          </ul>
        </div>
      ),
    }
  ];

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-in select-none">
      <div className={`w-full max-w-2xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col max-h-[85vh] shadow-2xl ${currentTheme.glow}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">❓</span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">
                Dziennik i Przewodnik Pomocy
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5">
                Dowiedz się, jak wyciągnąć 100% z Wiedzy Szytej na Miarę
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-all border border-stone-850"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Accordions */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-3.5 scrollbar-thin scrollbar-thumb-stone-800">
          {sections.map((section) => {
            const isOpen = activeSection === section.id;
            return (
              <div 
                key={section.id}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen 
                    ? "border-amber-500/30 bg-stone-900/30 shadow-md" 
                    : "border-stone-800/40 bg-stone-900/10 hover:border-stone-800"
                }`}
              >
                {/* Accordion Trigger */}
                <button
                  onClick={() => { playSound("click"); toggleSection(section.id); }}
                  className="w-full text-left p-4 flex items-center justify-between text-xs sm:text-sm font-bold text-stone-200 font-serif focus:outline-none"
                >
                  <span>{section.title}</span>
                  <span className={`text-stone-500 transform transition-transform duration-300 ${isOpen ? "rotate-180 text-amber-500" : ""}`}>
                    ▼
                  </span>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-stone-800/40 pt-3 animate-slide-in">
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950/40 border-t border-stone-800/40 text-center text-[9px] uppercase tracking-widest text-stone-500 rounded-b-3xl">
          Wiedza Szyta na Miarę • Matura 2026/2027 • Życzymy owocnej i spokojnej nauki!
        </div>

      </div>
    </div>
  );
};

// Pomocnicza funkcja motywowa na wypadek renderowania bez bazy
function getThemeClasses(theme: CozyTheme) {
  switch (theme) {
    case "rainy":
      return {
        cardBorder: "border-slate-800/60",
        cardBg: "bg-[#151c24]/90",
        glow: "shadow-sky-500/5",
        btnBorder: "border-sky-500/30",
        subText: "text-slate-400"
      };
    case "fireplace":
      return {
        cardBorder: "border-red-950/60",
        cardBg: "bg-[#251515]/90",
        glow: "shadow-amber-600/5",
        btnBorder: "border-amber-600/30",
        subText: "text-rose-300/70"
      };
    case "library":
    default:
      return {
        cardBorder: "border-amber-950/40",
        cardBg: "bg-[#1f1915]/90",
        glow: "shadow-amber-700/5",
        btnBorder: "border-[#c68a4c]/30",
        subText: "text-stone-400"
      };
  }
}