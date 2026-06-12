// app/components/CozyMug.tsx
"use5 client";

import React, { useState } from "react";
import { playSound } from "../lib/sounds";

interface CozyMugProps {
  currentTheme: any;
}

export function CozyMug({ currentTheme }: CozyMugProps) {
  const [isSipping, setIsSipping] = useState(false);
  const [sipMessage, setSipMessage] = useState("");

  const sipMessages = [
    "Łyk ciepłej melisy... Spokój powraca 🌿",
    "Zrobiłeś łyk ciepłego naparu... Skupienie wzrasta ☕",
    "Dodano odrobinę miodu i cytryny 🍯",
    "Herbata zaparzona idealnie w temperaturze 80°C 🌡️",
    "Gorący kubek rozgrzewa Twoje dłonie... 🍂",
    "Lofi i herbata to idealne połączenie 🎧"
  ];

  const handleSip = () => {
    if (isSipping) return;
    
    try {
      playSound("click");
    } catch (e) {}

    // Losujemy miły komunikat nad kubkiem
    const randomMsg = sipMessages[Math.floor(Math.random() * sipMessages.length)];
    setSipMessage(randomMsg);
    setIsSipping(true);

    setTimeout(() => {
      setIsSipping(false);
    }, 2500);
  };

  return (
    <div className={`relative rounded-3xl p-5 border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-500 shadow-md select-none flex flex-col items-center justify-center text-center`}>
      
      {/* ANIMACJE SPECJALNE DLA KUBKA */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes steam-rise {
          0% { transform: translateY(5px) scaleX(1); opacity: 0; }
          15% { opacity: 0.5; }
          50% { transform: translateY(-15px) scaleX(1.2); opacity: 0.25; }
          100% { transform: translateY(-30px) scaleX(0.8); opacity: 0; }
        }
        @keyframes float-mug {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes sip-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        .animate-steam-1 { animation: steam-rise 3s ease-in-out infinite; }
        .animate-steam-2 { animation: steam-rise 4.2s ease-in-out infinite; animation-delay: 1.2s; }
        .animate-steam-3 { animation: steam-rise 3.5s ease-in-out infinite; animation-delay: 0.6s; }
        .animate-float-mug { animation: float-mug 5s ease-in-out infinite; }
        .animate-sip-pulse { animation: sip-pulse 0.3s ease-in-out; }
      `}} />

      {/* Tło poświatowe aktywowane po kliknięciu */}
      <div className={`absolute inset-0 bg-amber-500/5 rounded-3xl blur-2xl transition-opacity duration-1000 ${
        isSipping ? "opacity-100" : "opacity-0"
      }`} />

      <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-6">Przytulny Kącik</h3>

      {/* KLIKALNY KUBEK */}
      <div 
        onClick={handleSip}
        className={`relative w-28 h-28 flex flex-col items-center justify-end cursor-pointer group ${
          isSipping ? "animate-sip-pulse" : ""
        }`}
      >
        {/* Pływające wektory pary */}
        <div className="absolute top-0 inset-x-0 h-12 flex justify-center gap-2 pointer-events-none">
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

        {/* Kubek (Floating) */}
        <div className="animate-float-mug relative z-10 transition-transform group-hover:scale-105 duration-300">
          <svg className="w-20 h-16 text-[#c68a4c] drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" viewBox="0 0 24 16" fill="currentColor">
            {/* Ucho kubka */}
            <path d="M18 4 C 21 4, 21 10, 18 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Ciało kubka */}
            <path d="M3 2 L 17 2 L 15 13 C 14 15, 6 15, 5 13 Z" />
            {/* Małe serduszko lub ozdobna plamka na kubku */}
            <path d="M10 6 C 9 5, 8 6, 10 8 C 12 6, 11 5, 10 6" fill="rgba(21, 28, 44, 0.4)" />
          </svg>
        </div>

        {/* Talerzyk pod kubkiem (Stabilny na stole) */}
        <div className="w-18 h-1.5 bg-stone-850 rounded-full border border-stone-800 shadow-lg mt-1" />
      </div>

      {/* Opisy i komunikaty */}
      <div className="mt-5 min-h-[36px] flex items-center justify-center">
        {isSipping ? (
          <p className="text-xs text-amber-400 font-semibold animate-bounce">
            {sipMessage}
          </p>
        ) : (
          <div className="group-hover:text-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-200">Zrób łyk ciepłego naparu ☕</p>
            <p className="text-[10px] text-stone-500 mt-0.5">Kliknij swój ulubiony kubek, by się napić</p>
          </div>
        )}
      </div>

    </div>
  );
}