"use client";

import React, { useState } from "react";
import { playSound } from "../lib/sounds";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: any;
}

type SectionType = "general" | "progress" | "essay" | "oral" | "flashcards" | "quotes" | "pricing";

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, currentTheme }) => {
  const [activeSection, setActiveSection] = useState<SectionType | null>("general");

  if (!isOpen) return null;

  const toggleSection = (section: SectionType) => {
    playSound("click");
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-in select-none">
      
      {/* GŁÓWNY KONTENER MODALU */}
      <div className={`w-full max-w-xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col h-[520px] max-h-[90vh] shadow-2xl overflow-hidden`}>
        
        {/* Header */}
        <div className="p-5 border-b border-stone-800/60 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">❓</span>
            <div className="min-w-0">
              <h2 className="text-base font-serif font-bold text-stone-100 truncate">Przewodnik Pomocy</h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5 truncate">
                Dowiedz się, jak krok po kroku korzystać z kącika nauki
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-all border border-stone-850 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Zawartość przewodnika (Przewijana środkowa część) */}
        <div className="pl-5 pr-3.5 pt-5 pb-8 overflow-y-auto flex-1 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-stone-800/60">
          
          {/* SEKCJA 1: O CO CHODZI */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("general")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span className="shrink-0">🏡</span> O co chodzi w Kąciku Wiedzy?
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "general" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "general" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-2 animate-slide-in">
                <p>
                  Witaj w swoim <strong className="text-stone-100 font-semibold">maturalnym kąciku spokoju</strong>! Ta platforma została zaprojektowana tak, abyś mógł uczyć się do matury z <strong className="text-stone-100 font-semibold">języka polskiego</strong> bez zbędnego stresu.
                </p>
                <p>
                  W panelu ustawień możesz dostosować klimat wizualny (Ciepła Biblioteka, Deszczowy Dzień lub Przytulny Kominek), a wbudowany odtwarzacz pozwoli Ci włączyć uspokajającą muzykę Lo-Fi ułatwiającą pełne skupienie.
                </p>
              </div>
            )}
          </div>

          {/* NOWA SEKCJA 2: POSTĘPY I ZAZNACZANIE NOTATEK */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("progress")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span className="shrink-0">📈</span> Śledzenie Postępów i Notatki
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "progress" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "progress" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-3.5 animate-slide-in">
                <p>
                  W zakładce <strong className="text-stone-100 font-semibold">Wszystkie Notatki</strong> przy każdej karcie znajdziesz przycisk <strong className="text-stone-100 font-semibold">„Oznacz jako przeczytane”</strong>. Pozwala to na łatwe odfiltrowanie materiałów, których jeszcze nie powtarzałeś (użyj zakładek: ✔️ Przeczytane / ⏳ Do nauki).
                </p>
                <p>
                  Swoje globalne statystyki znajdziesz wchodząc w <strong className="text-stone-100 font-semibold">Moje Postępy</strong>.
                </p>
                
                {/* Wyróżnione ostrzeżenie o pamięci podręcznej przeglądarki */}
                <div className="p-3 rounded-xl bg-stone-950/50 border border-stone-800 flex items-start gap-2.5 text-[11px] leading-relaxed font-sans text-stone-400">
                  <span className="shrink-0 text-base">ℹ️</span>
                  <span>
                    <strong className="text-stone-300">Ważne:</strong> Twój łączny czas nauki oraz status przeczytanych notatek są zapisywane <strong className="text-stone-300">lokalnie w pamięci Twojej przeglądarki</strong>. Jeśli wyczyścisz historię przeglądania (ciasteczka i dane witryn), te dwie statystyki znikną. Twoje konto, kredyty i zapisy w chmurze są jednak całkowicie bezpieczne!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SEKCJA 3: EDYTOR ROZPRAWKI AI */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("essay")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span className="shrink-0">✍️</span> Edytor Rozprawek AI (Koszt: 1 Token)
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "essay" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "essay" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-2 animate-slide-in">
                <p>
                  Wklej temat i treść swojej rozprawki, a wirtualny egzaminator sprawdzi ją i wystawi ocenę punktową. 
                </p>
                <p>
                  W zakładce z podglądem błędów zobaczysz swój tekst z kolorowymi podkreśleniami. Wystarczy, że <strong className="text-stone-100 font-semibold">najedziesz myszką na zaznaczony błąd</strong>, aby przeczytać proste wyjaśnienie, dlaczego jest to błąd i jak zapisać to poprawnie.
                </p>
                <p>
                  <strong>Inteligentne podpowiedzi:</strong> Nasz system pamięta wcześniejsze, zweryfikowane przez nauczycieli poprawki. Jeśli piszesz na podobny temat, asystent automatycznie dostosuje swoje uwagi do tych wskazówek, dbając o sprawiedliwą ocenę.
                </p>
              </div>
            )}
          </div>

          {/* SEKCJA 4: MATURA USTNA AI */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("oral")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span className="shrink-0">🎙️</span> Symulator Matury Ustnej (Koszt: 2-3 Kredyty)
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "oral" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "oral" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-2 animate-slide-in">
                <p>
                  Przećwicz stresujący egzamin ustny w bezpiecznym domu. Kliknij losowanie, aby otrzymać zestaw (pytanie jawne o lekturę oraz pytanie niejawne o dołączony obraz).
                </p>
                <p>
                  <strong>Zakres treningu:</strong> Możesz wybrać, czy chcesz ćwiczyć cały zestaw (oba zadania – koszt 3 tokeny), czy skupić się wyłącznie na jednym wybranym pytaniu (tylko jawne o lekturę lub tylko niejawne o plakat/obraz – koszt 2 tokeny).
                </p>
                <p>
                  Przygotuj notatki na brudnopisie, a następnie wygłoś swoją mowę do mikrofonu (system sam zamieni Twój głos na tekst). Po wysłaniu, wirtualna komisja oceni Twoją mowę, przeanalizuje motywy na obrazie i wystawi przejrzysty protokół punktowy.
                </p>
                <p>
                  <strong>Pytania od komisji:</strong> Na dole protokołu komisja zada Ci pytania dopytujące bezpośrednio nawiązujące do Twojej wygłoszonej wypowiedzi, pozwalając Ci przećwiczyć merytoryczną dyskusję.
                </p>
              </div>
            )}
          </div>

          {/* SEKCJA 5: SZYBKIE FISZKI */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("flashcards")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span className="shrink-0">⚡</span> Szybkie Fiszki i Wyszukiwanie Lektur
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "flashcards" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "flashcards" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-2 animate-slide-in">
                <p>
                  Szybka powtórka najważniejszych faktów, cech bohaterów i epok. Kliknij kartę, aby ją obrócić i poznać odpowiedź.
                </p>
                <p>
                  <strong className="text-stone-100 font-semibold">Szybkie wyszukiwanie:</strong> Nie musisz przewijać setek kafelków. Kliknij w pole wyszukiwania nad fiszką i wpisz np. „Lalka” lub „Antyk”, aby uczyć się wyłącznie zagadnień z wybranej lektury lub epoki.
                </p>
                <p>
                  <strong className="text-stone-100 font-semibold">Statusy nauki:</strong> Oznaczaj karty jako opanowane, aby odłożyć je do osobnej zakładki i powtarzać tylko ten materiał, który wciąż sprawia Ci trudność.
                </p>
              </div>
            )}
          </div>

          {/* SEKCJA 6: ZŁOTE CYTATY */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("quotes")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span className="shrink-0">⭐</span> Złote Cytaty (Funkcja Gwiazdki)
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "quotes" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "quotes" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-2 animate-slide-in">
                <p>
                  Znalazłeś w notatkach ważny cytat, definicję lub pojęcie, które chcesz zapamiętać na dłużej?
                </p>
                <p>
                  Zaznacz dany tekst myszką bezpośrednio w notatce, kliknij na złotą gwiazdkę (⭐), która się pojawi, a cytat natychmiast trafi do Twojego podręcznego notesu na stronie głównej, do którego masz dostęp w każdej chwili.
                </p>
              </div>
            )}
          </div>

          {/* SEKCJA 7: PREMIUM I TOKENY */}
          <div className="border border-stone-800/60 rounded-xl overflow-hidden bg-stone-950/20 shrink-0">
            <button
              onClick={() => toggleSection("pricing")}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-900/40 transition-all gap-2"
            >
              <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-2">
                <span>🪙</span> Kredyty, Pakiety i Opłaty
              </span>
              <span className="text-stone-500 text-xs shrink-0">{activeSection === "pricing" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "pricing" && (
              <div className="p-4 pt-1 border-t border-stone-800/40 text-xs text-stone-400 leading-relaxed space-y-3.5 animate-slide-in">
                <p>
                  Darmowe konto pozwala na czytanie części notatek. Kupując jeden z pakietów dostępowych (Mini, Medium lub roczny Premium), odblokowujesz całą bazę wiedzy, mapy myśli i otrzymujesz darmowe tokeny na start. <strong className="text-stone-100 font-semibold">W dowolnym momencie możesz również osobno dokupić dodatkowe pakiety kredytów (tokenów)</strong>, jeśli zabraknie Ci ich na analizy lub symulacje egzaminów ustnych.
                </p>
                
                {/* Wykaz zużycia kredytów - zaktualizowany o koszt 2 i 3 tokenów */}
                <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800 flex flex-col gap-1.5 text-stone-300 leading-relaxed font-sans">
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">
                    📉 Jak zużywane są Twoje kredyty:
                  </span>
                  <div className="flex justify-between items-center border-b border-stone-900/60 pb-1.5 text-[11px] gap-3">
                    <span className="text-stone-300">✍️ Ocena Twojego wypracowania przez AI:</span>
                    <span className="font-semibold text-stone-200 shrink-0 whitespace-nowrap bg-stone-900 px-2.5 py-0.5 rounded-md border border-stone-800/60">1 kredyt</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-900/60 pb-1.5 text-[11px] gap-3">
                    <span className="text-stone-300">📖 Napisanie przykładowej rozprawki przez AI:</span>
                    <span className="font-semibold text-stone-200 shrink-0 whitespace-nowrap bg-stone-900 px-2.5 py-0.5 rounded-md border border-stone-800/60">1 kredyt</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-900/60 pb-1.5 text-[11px] gap-3">
                    <span className="text-stone-300">🎙️ Próbny egzamin ustny (tylko 1 wybrane zadanie):</span>
                    <span className="font-semibold text-stone-200 shrink-0 whitespace-nowrap bg-stone-900 px-2.5 py-0.5 rounded-md border border-stone-800/60">2 kredyty</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] gap-3">
                    <span className="text-stone-300">👑 Pełny próbny egzamin ustny (oba zadania):</span>
                    <span className="font-semibold text-stone-200 shrink-0 whitespace-nowrap bg-stone-900 px-2.5 py-0.5 rounded-md border border-stone-800/60">3 kredyty</span>
                  </div>
                </div>

                <p>
                  <strong className="text-stone-100 font-semibold">Zasada ważności:</strong> Twoje zakupione kredyty nigdy nie wygasają i możesz korzystać z nich w dowolnym tempie – tak długo, jak posiadasz aktywne konto.
                </p>
              </div>
            )}
          </div>

          {/* FIZYCZNY SPACER BEZPIECZEŃSTWA (WYSPYCHACZ) */}
          <div className="h-14 shrink-0" />

        </div>

        {/* Footer modalu */}
        <div className="p-4 border-t border-stone-800/60 text-center text-[10px] text-stone-500 font-serif uppercase tracking-wider shrink-0 select-none">
          Wiedza Szyta na Miarę • Matura 2026/2027 • Życzymy owocnej i spokojnej nauki!
        </div>

      </div>
    </div>
  );
};