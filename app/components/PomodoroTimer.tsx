"use client";

import React, { useState, useEffect } from "react";
import { ThemeClasses } from "../lib/theme";
import { playSound } from "../lib/sounds";

interface PomodoroTimerProps {
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ currentTheme, triggerNotification }) => {
  const [pomodoroMode, setPomodoroMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Stany dla Dziennego Celu Nauki
  const [dailyGoal, setDailyGoal] = useState<number>(25);
  const [minutesStudiedToday, setMinutesStudiedToday] = useState<number>(0);

  // 1. WCZYTYWANIE CELU, CZASU NAUKI ORAZ STANU TIMERA Z LOCALSTORAGE PRZY ROZRUCHU
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Dzienny cel nauki
      const savedGoal = localStorage.getItem("cozy_study_goal");
      if (savedGoal) {
        setDailyGoal(parseInt(savedGoal));
      }

      const todayStr = new Date().toLocaleDateString("pl-PL");
      const savedDate = localStorage.getItem("cozy_study_date");

      if (savedDate !== todayStr) {
        localStorage.setItem("cozy_study_date", todayStr);
        localStorage.setItem("cozy_study_minutes_today", "0");
        setMinutesStudiedToday(0);
      } else {
        const savedMinutes = localStorage.getItem("cozy_study_minutes_today");
        if (savedMinutes) {
          setMinutesStudiedToday(parseFloat(savedMinutes));
        }
      }

      // Stan Pomodoro Timer
      const savedMode = localStorage.getItem("cozy_pomodoro_mode") as "work" | "break" | null;
      const savedRunning = localStorage.getItem("cozy_pomodoro_running") === "true";
      
      const mode = savedMode || "work";
      setPomodoroMode(mode);
      setTimerRunning(savedRunning);

      if (savedRunning) {
        const savedEndTime = localStorage.getItem("cozy_pomodoro_endTime");
        if (savedEndTime) {
          const parsedEndTime = parseInt(savedEndTime);
          const remaining = Math.max(0, Math.round((parsedEndTime - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
      } else {
        const savedTimeLeft = localStorage.getItem("cozy_pomodoro_timeLeft");
        if (savedTimeLeft) {
          setTimeLeft(parseInt(savedTimeLeft));
        } else {
          setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
        }
      }
    }
  }, []);

  // 2. GŁÓWNA PĘTLA TIMERA (OPARTA O REZOLUCJĘ CZASU SYSTEMOWEGO)
  useEffect(() => {
    if (!timerRunning) return;

    const tick = () => {
      const savedEndTime = localStorage.getItem("cozy_pomodoro_endTime");
      if (!savedEndTime) {
        setTimerRunning(false);
        return;
      }

      const parsedEndTime = parseInt(savedEndTime);
      const remaining = Math.max(0, Math.round((parsedEndTime - Date.now()) / 1000));

      setTimeLeft(remaining);

      // Jeśli jesteśmy w trybie Nauki (work), dodajemy czas do celu dziennego oraz łącznego
      if (pomodoroMode === "work") {
        setMinutesStudiedToday((prev) => {
          const updated = prev + 1 / 60;
          localStorage.setItem("cozy_study_minutes_today", updated.toString());
          return updated;
        });

        // Zapis łącznego (all-time) czasu nauki
        const currentTotal = localStorage.getItem("cozy_total_study_minutes");
        const updatedTotal = parseFloat(currentTotal || "0") + 1 / 60;
        localStorage.setItem("cozy_total_study_minutes", updatedTotal.toString());
      }

      // Warunek zakończenia odliczania
      if (remaining <= 0) {
        setTimerRunning(false);
        playSound("success");

        if (pomodoroMode === "work") {
          setPomodoroMode("break");
          const breakTime = 5 * 60;
          setTimeLeft(breakTime);
          localStorage.setItem("cozy_pomodoro_mode", "break");
          localStorage.setItem("cozy_pomodoro_running", "false");
          localStorage.setItem("cozy_pomodoro_timeLeft", breakTime.toString());
          triggerNotification("Czas na przerwę! Napij się herbaty ☕", "success");
        } else {
          setPomodoroMode("work");
          const workTime = 25 * 60;
          setTimeLeft(workTime);
          localStorage.setItem("cozy_pomodoro_mode", "work");
          localStorage.setItem("cozy_pomodoro_running", "false");
          localStorage.setItem("cozy_pomodoro_timeLeft", workTime.toString());
          triggerNotification("Czas wracać do pracy! Skupienie 📚", "info");
        }
      }
    };

    // Uruchamiamy natychmiast przy starcie, aby uniknąć opóźnienia 1 sekundy
    tick();

    const interval = setInterval(tick, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [timerRunning, pomodoroMode, triggerNotification]);

  const toggleTimer = () => {
    playSound("click");
    const nextRunning = !timerRunning;
    setTimerRunning(nextRunning);
    
    if (nextRunning) {
      // Obliczamy i zapisujemy dokładny timestamp ukończenia pracy w przyszłości
      const endTime = Date.now() + timeLeft * 1000;
      localStorage.setItem("cozy_pomodoro_endTime", endTime.toString());
      localStorage.setItem("cozy_pomodoro_running", "true");
    } else {
      localStorage.setItem("cozy_pomodoro_running", "false");
      localStorage.setItem("cozy_pomodoro_timeLeft", timeLeft.toString());
    }
  };

  const resetTimer = () => {
    playSound("click");
    setTimerRunning(false);
    const defaultTime = pomodoroMode === "work" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultTime);
    
    localStorage.setItem("cozy_pomodoro_running", "false");
    localStorage.setItem("cozy_pomodoro_timeLeft", defaultTime.toString());
  };

  const switchPomodoroMode = (mode: "work" | "break") => {
    playSound("click");
    setTimerRunning(false);
    setPomodoroMode(mode);
    const defaultTime = mode === "work" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultTime);
    
    localStorage.setItem("cozy_pomodoro_running", "false");
    localStorage.setItem("cozy_pomodoro_mode", mode);
    localStorage.setItem("cozy_pomodoro_timeLeft", defaultTime.toString());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const goalPercentage = Math.min(100, Math.round((minutesStudiedToday / dailyGoal) * 100));

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

      {/* DYNAMICZNY PODGLĄD DZIENNEGO CELU NAUKI */}
      <div className="mt-4 pt-3.5 border-t border-stone-800/60 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-stone-400 font-semibold">
          <span>Dzienny cel nauki:</span>
          <span>{Math.floor(minutesStudiedToday)} / {dailyGoal} min ({goalPercentage}%)</span>
        </div>
        <div className="w-full h-1.5 bg-stone-950/60 rounded-full overflow-hidden border border-stone-900">
          <div 
            className={`h-full ${goalPercentage >= 100 ? "bg-emerald-500" : "bg-amber-500"} rounded-full transition-all duration-300`}
            style={{ width: `${goalPercentage}%` }}
          />
        </div>
        {goalPercentage >= 100 && (
          <span className="text-[9px] text-emerald-400 font-bold text-center mt-1 animate-pulse">
            🎉 Gratulacje! Twój dzisiejszy cel został osiągnięty!
          </span>
        )}
      </div>
    </div>
  );
};