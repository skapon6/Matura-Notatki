// app/maintenance/page.tsx
"use client";

import React from "react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-6 text-center select-none">
      
      {/* Animacje poświaty i pary */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes steam-rise {
          0% { transform: translateY(5px) scaleX(1); opacity: 0; }
          15% { opacity: 0.5; }
          50% { transform: translateY(-15px) scaleX(1.2); opacity: 0.25; }
          100% { transform: translateY(-30px) scaleX(0.8); opacity: 0; }
        }
        @keyframes float-mug {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.1); }
        }
        .animate-steam-1 { animation: steam-rise 3s ease-in-out infinite; }
        .animate-steam-2 { animation: steam-rise 4s ease-in-out infinite; animation-delay: 1.2s; }
        .animate-steam-3 { animation: steam-rise 3.5s ease-in-out infinite; animation-delay: 0.6s; }
        .animate-float-mug { animation: float-mug 5s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3.5s ease-in-out infinite; }
      `}} />

      {/* Ciepłe pulsujące światło w tle */}
      <div className="absolute w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />

      {/* Ilustracja kubka z unoszącą się parą */}
      <div className="relative w-32 h-32 flex flex-col items-center justify-end mb-8">
        
        {/* Wektory pary */}
        <div className="absolute top-0 inset-x-0 h-12 flex justify-center gap-2">
          <svg className="w-2.5 h-10 text-stone-400/30 animate-steam-1" fill="none" viewBox="0 0 10 30">
            <path d="M5 30 C 1 20, 9 10, 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <svg className="w-2.5 h-10 text-stone-400/40 animate-steam-2" fill="none" viewBox="0 0 10 30">
            <path d="M5 30 C 9 20, 1 10, 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <svg className="w-2.5 h-10 text-stone-400/25 animate-steam-3" fill="none" viewBox="0 0 10 30">
            <path d="M5 30 C 2 22, 8 8, 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Kubek */}
        <div className="animate-float-mug relative z-10">
          <svg className="w-24 h-20 text-[#c68a4c] drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]" viewBox="0 0 24 16" fill="currentColor">
            <path d="M18 4 C 21 4, 21 10, 18 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 2 L 17 2 L 15 13 C 14 15, 6 15, 5 13 Z" />
            <path d="M10 6 C 9 5, 8 6, 10 8 C 12 6, 11 5, 10 6" fill="rgba(21, 28, 44, 0.4)" />
          </svg>
        </div>

        {/* Spodeczek */}
        <div className="w-20 h-1.5 bg-stone-850 rounded-full border border-stone-800 shadow-xl mt-1.5" />
      </div>

      {/* Napisy informacyjne */}
      <div className="max-w-md space-y-3 z-10">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-100 tracking-tight">
          Parzymy świeżą herbatę... ☕
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 leading-relaxed font-sans">
          Trwa krótka przerwa techniczna. Wgrywamy właśnie nowe notatki maturalne i ulepszamy algorytmy sztucznej inteligencji, aby ułatwić Ci naukę.
        </p>
        <p className="text-[11px] text-stone-500 font-semibold uppercase tracking-wider pt-3">
          Wrócimy za kilkanaście minut. Dziękujemy za cierpliwość! 🍂
        </p>
      </div>

    </div>
  );
}