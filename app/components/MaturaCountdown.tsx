"use client";

import React, { useState, useEffect } from "react";
import { playSound } from "../lib/sounds";

interface MaturaCountdownProps {
  currentTheme: any;
}

export function MaturaCountdown({ currentTheme }: MaturaCountdownProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // 1. Odczytanie stanu z pamięci podręcznej
  useEffect(() => {
    const saved = localStorage.getItem("matura_countdown_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  // 2. Przełączanie widoczności
  const handleToggle = () => {
    try {
      playSound("click");
    } catch (e) {
      console.warn("playSound failed:", e);
    }
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("matura_countdown_collapsed", String(newValue));
  };

  // 3. Obliczanie czasu (przykład ustawiony na maj 2027)
  useEffect(() => {
    const targetDate = new Date("2027-05-04T09:00:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative rounded-3xl p-5 border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-300 shadow-md`}>
      
      {/* NAGŁÓWEK Z CZYTELNYM PRZYCISKIEM KONTROLNYM */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
            Czas do matury
          </h3>
        </div>
        
        {/* Wyraźny przycisk z tekstem i ikoną */}
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-800 bg-stone-950/60 hover:bg-stone-900 text-[10px] font-bold text-stone-400 hover:text-amber-500 transition-all"
        >
          <span>{isCollapsed ? "Pokaż" : "Ukryj"}</span>
          <span className="text-xs leading-none">{isCollapsed ? "👁️" : "🙈"}</span>
        </button>
      </div>

      {/* PANEL ZWIJANIA */}
      <div 
        className={`transition-all duration-300 overflow-hidden ${
          isCollapsed 
            ? "max-h-0 opacity-0 mt-0" 
            : "max-h-40 opacity-100 mt-4"
        }`}
      >
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-stone-950/40 p-2 rounded-xl border border-stone-850">
            <span className="block text-xl font-extrabold text-stone-100 font-mono">
              {timeLeft.days}
            </span>
            <span className="text-[9px] text-stone-500 uppercase tracking-wider">dni</span>
          </div>
          <div className="bg-stone-950/40 p-2 rounded-xl border border-stone-850">
            <span className="block text-xl font-extrabold text-stone-100 font-mono">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-stone-500 uppercase tracking-wider">godz</span>
          </div>
          <div className="bg-stone-950/40 p-2 rounded-xl border border-stone-850">
            <span className="block text-xl font-extrabold text-stone-100 font-mono">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-stone-500 uppercase tracking-wider">min</span>
          </div>
          <div className="bg-stone-950/40 p-2 rounded-xl border border-stone-850">
            <span className="block text-xl font-extrabold text-amber-500 font-mono">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-stone-500 uppercase tracking-wider">sek</span>
          </div>
        </div>
        
        <p className="text-[10px] text-stone-500 text-center mt-3 italic select-none">
          Każda sekunda przybliża Cię do celu. Spokojnie, dasz radę! ☕
        </p>
      </div>
    </div>
  );
}