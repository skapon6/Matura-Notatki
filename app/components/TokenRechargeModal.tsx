// components/TokenRechargeModal.tsx
"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";
import { playSound } from "../lib/sounds";

interface TokenRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export const TokenRechargeModal: React.FC<TokenRechargeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  triggerNotification,
}) => {
  const [loadingPack, setLoadingPack] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleRechargeInit = async (packSize: number) => {
    playSound("click");
    setLoadingPack(packSize);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tokens", pack: packSize }),
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        playSound("error");
        triggerNotification(
          "Wystąpił błąd podczas generowania płatności: " + (data.error || "Brak linku"),
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      playSound("error");
      triggerNotification("Błąd połączenia z serwerem płatności.", "error");
    } finally {
      setLoadingPack(null);
    }
  };

  const packages = [
    { 
      size: 5, 
      price: "10 zł", 
      desc: "Szybki rozruch. Wystarczy na 5 ocen rozprawek lub pełną symulację ustnej z dopytywaniem komisji." 
    },
    { 
      size: 10, 
      price: "15 zł", 
      desc: "Złoty środek dla systematycznych. Ćwicz pisanie i trenuj mowę na żywo przed wirtualną komisją bez stresu. Najpopularniejszy!", 
      popular: true 
    },
    { 
      size: 20, 
      price: "25 zł", 
      desc: "Maturalny pewniak. Generuj wzory, pisz rozprawki i symuluj egzaminy bez ograniczeń. Najlepszy stosunek ceny do wiedzy!" 
    },
  ];

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-slide-in select-none">
      
      {/* Tło klikalne do zamknięcia */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className={`relative w-full max-w-lg sm:max-w-xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col p-5 sm:p-7 shadow-2xl ${currentTheme.glow} max-h-[92vh] overflow-hidden`}>
        
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between pb-3.5 sm:pb-4 border-b border-stone-800/60 mb-4 sm:mb-5 gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl p-2 rounded-2xl bg-amber-950/40 border border-amber-900/40 shrink-0">🪙</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-serif font-bold text-stone-100 truncate">Doładuj Tokeny AI</h2>
              <p className="text-[9.5px] sm:text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5 line-clamp-1">
                Wybierz pakiet i odblokuj oceny CKE
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playSound("click");
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-all border border-stone-800 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pakiety – z przewijaniem w razie małego ekranu */}
        <div className="flex flex-col gap-3 sm:gap-3.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
          {packages.map((pack) => (
            <div
              key={pack.size}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative ${
                pack.popular 
                  ? "border-amber-500/50 bg-amber-950/20 shadow-lg shadow-amber-950/20" 
                  : "border-stone-800/70 bg-stone-900/30 hover:bg-stone-900/50 hover:border-stone-700/80"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 right-4 sm:right-6 text-[8px] uppercase tracking-widest text-stone-950 font-black bg-amber-500 px-2 py-0.5 rounded-full border border-amber-400 shadow-sm">
                  Polecany ⭐
                </span>
              )}

              {/* Informacje o pakiecie */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <h3 className="text-sm font-bold text-stone-100 font-serif flex items-center gap-1.5">
                    <span className="text-amber-500 text-base">🪙</span> Pakiet {pack.size} Tokenów
                  </h3>
                  {/* Cena widoczna na komórce obok tytułu dla przejrzystości */}
                  <span className="sm:hidden text-xs font-bold font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-900/40">
                    {pack.price}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed font-sans">{pack.desc}</p>
              </div>

              {/* Przycisk zakupu – na telefonie pełna szerokość dla wygody kciuka */}
              <button
                onClick={() => handleRechargeInit(pack.size)}
                disabled={loadingPack !== null}
                className={`w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl text-xs font-extrabold transition-all text-center whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                  pack.popular 
                    ? "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md" 
                    : "bg-stone-900 border border-stone-800 text-stone-200 hover:bg-stone-800 hover:text-white"
                } disabled:opacity-50`}
              >
                {loadingPack === pack.size ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="animate-spin text-xs">⏳</span> Przekierowanie...
                  </span>
                ) : (
                  `Kup za ${pack.price}`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <p className="text-center text-[9px] text-stone-500 mt-4 sm:mt-5 uppercase tracking-wider shrink-0">
          Bezpieczna płatność BLIK / Karta przez Stripe • Kredyty nie wygasają
        </p>

      </div>
    </div>
  );
};