"use client";

import React, { useState, useEffect } from "react";
import { ThemeClasses } from "../lib/theme";

interface MaturaCountdownProps {
  currentTheme: ThemeClasses;
}

export const MaturaCountdown: React.FC<MaturaCountdownProps> = ({ currentTheme }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false,
  });

  useEffect(() => {
    // Cel: Matura 4 maja 2027 roku, godzina 9:00 rano
    const targetDate = new Date("2027-05-04T09:00:00").getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isOver: false });
    };

    calculateTimeLeft(); // Uruchomienie od razu przy montowaniu
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-4 text-center shadow-lg transition-colors duration-500`}>
      <h3 className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-3 flex items-center justify-center gap-1.5">
        <span>⏰</span> Do Matury 2027 Pozostało
      </h3>

      {timeLeft.isOver ? (
        <span className="text-xs font-bold text-emerald-400">Powodzenia na egzaminach maturalnych! 🎓</span>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-stone-950/40 border border-stone-900 rounded-xl py-2 px-1">
            <span className="text-base font-bold font-mono text-stone-100 block">{timeLeft.days}</span>
            <span className="text-[8px] text-stone-500 uppercase tracking-wider font-semibold">dni</span>
          </div>
          <div className="bg-stone-950/40 border border-stone-900 rounded-xl py-2 px-1">
            <span className="text-base font-bold font-mono text-stone-100 block">{timeLeft.hours}</span>
            <span className="text-[8px] text-stone-500 uppercase tracking-wider font-semibold font-sans">godz</span>
          </div>
          <div className="bg-stone-950/40 border border-stone-900 rounded-xl py-2 px-1">
            <span className="text-base font-bold font-mono text-stone-100 block">{timeLeft.minutes}</span>
            <span className="text-[8px] text-stone-500 uppercase tracking-wider font-semibold font-sans">min</span>
          </div>
          <div className="bg-stone-950/40 border border-stone-900 rounded-xl py-2 px-1">
            <span className="text-base font-bold font-mono text-stone-100 block text-amber-500">{timeLeft.seconds}</span>
            <span className="text-[8px] text-stone-500 uppercase tracking-wider font-semibold font-sans">sek</span>
          </div>
        </div>
      )}
    </div>
  );
};