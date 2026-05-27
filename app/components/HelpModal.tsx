"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";
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
      title: "🏡 O co chodzi w kąciku Wiedzy Szytej na Miarę?",
      content: (
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans">
          Witaj w swoim **maturalnym kąciku spokoju**! To miejsce zostało zaprojektowane tak, abyś mógł przygotować się do matury z języka polskiego bez zbędnego stresu. Połączyliśmy kompleksową bazę notatek z lektur, moduł oceniania wypracowań przez sztuczną inteligencję, fiszki zapamiętywania oraz przytulną oprawę dźwiękową (muzyka Lo-Fi), która ułatwia głębokie skupienie.
        </p>
      ),
    },
    {
      id: "selection",
      title: "⭐ Funkcja: Zaznacz i Zapamiętaj (Złote Cytaty)",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Podczas czytania dowolnej notatki (np. Barok) możesz ułatwić sobie naukę za pomocą naszego sprytnego notesu:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Jak dodać?</strong> Przeciągnij kursorem myszy i zaznacz dowolne zdanie w notatce (maksymalnie 400 znaków). Nad zaznaczeniem pojawi się gwiazdka <span className="text-amber-500">⭐</span>. Kliknij ją, a cytat zostanie zapisany w Twojej bazie!</li>
            <li><strong className="text-stone-300">Zabezpieczenie przed kopiowaniem:</strong> Aby chronić unikalne materiały naukowe, tradycyjne kopiowanie (Ctrl+C, Cmd+C lub prawy przycisk) jest zablokowane. Tekst możesz jednak bezpiecznie i wygodnie skopiować bezpośrednio ze swojego Zeszytu Cytatów na stronie głównej!</li>
            <li><strong className="text-stone-300">Limit 50 cytatów:</strong> Aby chronić darmową bazę Supabase, każde konto może zapisać maksymalnie 50 cytatów. Jeśli osiągniesz limit, usuń starsze cytaty (czerwonym koszem), aby zwolnić miejsce na nowe.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "ai",
      title: "🤖 Ocenianie Rozprawek AI i Doładowanie Tokenów",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Nasz moduł sztucznej inteligencji potrafi przeanalizować Twoje wypracowanie zgodnie z najnowszymi kryteriami CKE w zaledwie kilka sekund!</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Jak to działa?</strong> Kliknij przycisk „Uruchom Edytor AI”, wklej temat oraz treść rozprawki i zatwierdź. AI oceni merytorykę, kompozycję, błędy językowe i wskaże punkty do poprawy.</li>
            <li><strong className="text-stone-300">Koszt (Tokeny):</strong> Każda ocena rozprawki kosztuje dokładnie **1 token**.</li>
            <li><strong className="text-stone-300">Doładowanie:</strong> Jeśli skończą Ci się darmowe tokeny, kliknij przycisk <span className="text-amber-500 font-bold">Doładuj 🪙</span> obok ich licznika. Bezpieczna płatność Stripe Checkout pozwoli Ci natychmiast zakupić pakiety: 5, 10 lub 20 tokenów.</li>
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
            <li><strong className="text-stone-300">Tryb Gry (Wszystkie):</strong> Klikaj kartę, aby odwrócić ją i poznać odpowiedź. Oznaczaj fiszki jako <span className="text-emerald-400">„Opanowane! ✅”</span> (przesuną się w prawo) lub <span className="text-red-400">„Nie znam ❌”</span> (przesuną się w lewo).</li>
            <li><strong className="text-stone-300">Tryb Szybkiej Listy:</strong> Zakładki „Do nauki” oraz „Opanowane” automatycznie zamieniają się w przejrzystą, pionową listę wszystkich pytań i odpowiedzi. Możesz tam błyskawicznie wszystko przejrzeć i zmieniać statusy jednym kliknięciem.</li>
            <li><strong className="text-stone-300">Zapis w Supabase:</strong> Stan opanowania fiszek zapisuje się na Twoim profilu, więc nie stracisz postępów po wyjściu ze strony!</li>
          </ul>
        </div>
      ),
    },
    {
      id: "lofi",
      title: "🎵 Odtwarzacz Muzyki Lo-Fi i Dźwięki Interfejsu",
      content: (
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-stone-300 leading-relaxed">
          <p>Zadbaliśmy o idealną atmosferę skupienia podczas nauki:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-stone-400">
            <li><strong className="text-stone-300">Muzyka nie przerywa (Persistent Audio):</strong> Dzięki globalnemu odtwarzaczowi w chmurze, gdy włączysz Lo-Fi na stronie głównej, muzyka będzie grać nieprzerwanie, kiedy wchodzisz na Fiszki czy podglądasz notatki [1]!</li>
            <li><strong className="text-stone-300">Głośność i przełączanie:</strong> W nagłówku na każdej podstronie znajdziesz wygodny panel do regulacji głośności, pauzy oraz zmiany utworów [2].</li>
            <li><strong className="text-stone-300">Dźwięki interfejsu (SFX):</strong> Klikanie interaktywnych elementów, oznaczanie fiszek czy wyskakiwanie powiadomień generuje ciche, satysfakcjonujące dźwięki w tle [2].</li>
          </ul>
        </div>
      ),
    }
  ];

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-in">
      <div className={`w-full max-w-2xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col max-h-[85vh] shadow-2xl ${currentTheme.glow}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">❓</span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">
                Przewodnik po Kąciku Nauki
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
                    ? "border-amber-500/30 bg-stone-900/30" 
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
          Wiedza Szyta na Miarę • Matura 2026 • Życzymy owocnej i spokojnej nauki!
        </div>

      </div>
    </div>
  );
};