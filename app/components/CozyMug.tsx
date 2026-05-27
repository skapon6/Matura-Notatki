"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";

interface CozyMugProps {
  currentTheme: ThemeClasses;
}

export const CozyMug: React.FC<CozyMugProps> = ({ currentTheme }) => {
  const [mugClicks, setMugClicks] = useState(0);
  const [mugMessage, setMugMessage] = useState("Ciepły napar paruje... Kliknij kubek!");

  const handleMugClick = () => {
    const clicks = mugClicks + 1;
    setMugClicks(clicks);
    
    const messages = [
      "Mmm... pyszna, ciepła cynamonowa herbata! ☕",
      "Spokojnie, krok po kroku opanujesz cały materiał.",
      "Zrobiłeś sobie przerwę? Bardzo dobrze, mózg potrzebuje odpoczynku.",
      "Czy wiesz, że zapach herbaty obniża poziom stresu?",
      "Klikasz w kubek z determinacją! Matura na 100%! 🚀",
      "Masz ochotę na małą powtórkę? Spójrz na notatki obok.",
      "Czujesz ten zapach goździków i pomarańczy? Wyjątkowo przytulnie."
    ];
    setMugMessage(messages[clicks % messages.length]);
  };

  return (
    <div 
      onClick={handleMugClick}
      className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 text-center cursor-pointer select-none relative overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${currentTheme.glow} group`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-1">
        Przytulny Kącik
      </h3>
      
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center my-1 select-none">
        <svg className="absolute top-1 w-12 h-8 text-stone-400/50" viewBox="0 0 100 100" fill="none">
          <path className="steam-line" d="M30,80 Q40,60 30,40 T40,10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path className="steam-line-2" d="M50,80 Q60,65 50,45 T60,15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path className="steam-line-3" d="M70,85 Q80,70 70,50 T80,20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>

        <svg className="w-16 h-16 text-amber-800/80 drop-shadow-md transform group-hover:rotate-3 transition-transform" viewBox="0 0 100 100" fill="currentColor">
          <path d="M20,35 C20,35 20,80 30,85 C40,90 60,90 70,85 C80,80 80,35 80,35 Z" fill="#694d3f" />
          <ellipse cx="50" cy="35" rx="30" ry="8" fill="#8b6857" />
          <ellipse cx="50" cy="35" rx="27" ry="6" fill="#a75d33" />
          <path d="M80,45 C80,45 92,45 92,60 C92,75 80,75 80,75" stroke="#694d3f" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M50,50 L52,55 L58,56 L53,60 L55,66 L50,62 L45,66 L47,60 L42,56 L48,55 Z" fill="#e8d5c8" />
        </svg>
      </div>

      <p className="text-xs font-semibold text-stone-200 mt-2">
        Zrób łyk ciepłego naparu ☕
      </p>
      <p className="text-[11px] text-stone-400 mt-1 italic leading-relaxed min-h-[32px]">
        &quot;{mugMessage}&quot;
      </p>
    </div>
  );
};