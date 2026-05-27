"use client";

import React, { useState, useEffect } from "react";
import { ThemeClasses } from "../lib/theme";

interface PomodoroTimerProps {
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ currentTheme, triggerNotification }) => {
  const [pomodoroMode, setPomodoroMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerRunning(false);
      if (pomodoroMode === "work") {
        setPomodoroMode("break");
        setTimeLeft(5 * 60);
        triggerNotification("Czas na przerwę! Napij się herbaty ☕", "success");
      } else {
        setPomodoroMode("work");
        setTimeLeft(25 * 60);
        triggerNotification("Czas wracać do pracy! Skupienie 📚", "info");
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timeLeft, pomodoroMode, triggerNotification]);

  const toggleTimer = () => setTimerRunning(!timerRunning);
  const resetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(pomodoroMode === "work" ? 25 * 60 : 5 * 60);
  };
  const switchPomodoroMode = (mode: "work" | "break") => {
    setTimerRunning(false);
    setPomodoroMode(mode);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 transition-colors duration-500`}>
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold flex items-center gap-1.5">
          <span>⏱️</span> Pomodoro
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => switchPomodoroMode("work")}
            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
              pomodoroMode === "work"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            Nauka
          </button>
          <button
            onClick={() => switchPomodoroMode("break")}
            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
              pomodoroMode === "break"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            Relaks
          </button>
        </div>
      </div>

      <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 text-center">
        <span className="text-3xl font-extrabold tracking-widest text-stone-100 font-mono drop-shadow-sm select-none">
          {formatTime(timeLeft)}
        </span>
        <p className="text-[10px] text-stone-500 mt-1">
          {pomodoroMode === "work" ? "Czas na głębokie skupienie 📚" : "Czas na chwilę wytchnienia ☕"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3.5">
        <button
          onClick={toggleTimer}
          className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            timerRunning
              ? "bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700"
              : `${currentTheme.accentBg} text-stone-950 ${currentTheme.accentHover} shadow-md`
          }`}
        >
          {timerRunning ? (
            <>
              <span>⏸️</span> Pauza
            </>
          ) : (
            <>
              <span>▶️</span> Start
            </>
          )}
        </button>

        <button
          onClick={resetTimer}
          className="py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-850 border border-stone-800/60 text-stone-400 hover:text-stone-200 transition-all flex items-center justify-center gap-1"
        >
          <span>🔄</span> Reset
        </button>
      </div>
    </div>
  );
};