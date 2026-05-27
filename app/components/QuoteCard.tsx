"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";

const COZY_QUOTES = [
  { text: "Cierpliwość i praca tworzą wielkie dzieła.", author: "Konfucjusz" },
  { text: "Nauka to jedyna rzecz, której umysł nigdy nie wyczerpie, nie boi się ani nie żałuje.", author: "Leonardo da Vinci" },
  { text: "Zrób to, co możesz, tym, co masz, tam, gdzie jesteś.", author: "Theodore Roosevelt" },
  { text: "Nie bój się iść powoli, obawiaj się jedynie stania w miejscu.", author: "Przysłowie chińskie" },
  { text: "Krok po kroku i dojdziesz do celu. Matura to tylko kolejny przystanek.", author: "Wiedza Szyta na Miarę" }
];

interface QuoteCardProps {
  currentTheme: ThemeClasses;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ currentTheme }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const rotateQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % COZY_QUOTES.length);
  };

  return (
    <div 
      onClick={rotateQuote}
      className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 cursor-pointer relative overflow-hidden transition-all duration-300 hover:scale-[1.01]`}
    >
      <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
        <span>💡 Mądrość na dziś</span>
        <span className="text-[10px] text-amber-500/80">kliknij po kolejny →</span>
      </div>
      
      <p className="text-xs text-stone-300 font-serif leading-relaxed italic">
        &quot;{COZY_QUOTES[quoteIndex].text}&quot;
      </p>
      
      <p className="text-[10px] text-stone-500 mt-2 text-right">
        — {COZY_QUOTES[quoteIndex].author}
      </p>
    </div>
  );
};