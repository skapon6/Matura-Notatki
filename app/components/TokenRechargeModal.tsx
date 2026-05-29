"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";

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
    setLoadingPack(packSize);
    try {
      // Wywołujemy to samo API checkout, ale z parametrem typu 'tokens'
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tokens", pack: packSize }),
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        triggerNotification(
          "Wystąpił błąd podczas generowania płatności: " + (data.error || "Brak linku"),
          "error"
        );
      }
    } catch (err) {
      console.error(err);
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
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-in">
      <div className={`w-full max-w-xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col p-6 sm:p-8 shadow-2xl ${currentTheme.glow}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800/60 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪙</span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">Doładuj Tokeny AI</h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5">
                Wybierz pakiet i odblokuj natychmiastową ocenę rozprawek
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

        {/* Pakiety */}
        <div className="flex flex-col gap-4">
          {packages.map((pack) => (
            <div
              key={pack.size}
              className={`p-5 rounded-2xl border ${
                pack.popular 
                  ? "border-amber-500/40 bg-amber-500/5 shadow-md relative" 
                  : "border-stone-800/40 bg-stone-900/10 hover:bg-stone-900/30"
              } transition-all flex items-center justify-between gap-4`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 right-6 text-[8px] uppercase tracking-widest text-stone-950 font-extrabold bg-amber-500 px-2 py-0.5 rounded-md border border-amber-400">
                  Polecany
                </span>
              )}

              <div className="flex flex-col gap-1 max-w-[70%]">
                <h3 className="text-sm font-bold text-stone-100 font-serif flex items-center gap-1.5">
                  <span className="text-amber-500">🪙</span> Pakiet {pack.size} Tokenów
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed font-sans">{pack.desc}</p>
              </div>

              <button
                onClick={() => handleRechargeInit(pack.size)}
                disabled={loadingPack !== null}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  pack.popular 
                    ? "bg-amber-500 text-stone-950 hover:bg-amber-400" 
                    : "bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
                } disabled:opacity-50`}
              >
                {loadingPack === pack.size ? "Ładowanie..." : `Kup za ${pack.price}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[9px] text-stone-500 mt-6 uppercase tracking-wider">
          Bezpieczna płatność obsługiwana przez Stripe. Kredyty nie wygasają.
        </p>
      </div>
    </div>
  );
};