// components/PomodoroTimer.tsx
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
  
  // Wybrane długości sesji w minutach
  const [workDuration, setWorkDuration] = useState<number>(25);
  const [breakDuration, setBreakDuration] = useState<number>(5);
  
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false); // Stan mrugania po zakończeniu

  // Dzienny cel nauki
  const [dailyGoal, setDailyGoal] = useState<number>(25);
  const [minutesStudiedToday, setMinutesStudiedToday] = useState<number>(0);

  // 1. INICJALIZACJA STANU Z PAMIĘCI PRZEGLĄDARKI (ODPORNOŚĆ NA PRZEŁADOWANIA I NAWIGACJĘ)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Dzienny cel i czas dzisiejszy
    const savedGoal = localStorage.getItem("cozy_study_goal");
    if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));

    const todayStr = new Date().toLocaleDateString("pl-PL");
    const savedDate = localStorage.getItem("cozy_study_date");

    if (savedDate !== todayStr) {
      localStorage.setItem("cozy_study_date", todayStr);
      localStorage.setItem("cozy_study_minutes_today", "0");
      setMinutesStudiedToday(0);
    } else {
      const savedMinutes = localStorage.getItem("cozy_study_minutes_today");
      if (savedMinutes) setMinutesStudiedToday(parseFloat(savedMinutes));
    }

    // B. Długości sesji
    const savedWorkDur = localStorage.getItem("cozy_pomodoro_work_dur");
    if (savedWorkDur) setWorkDuration(parseInt(savedWorkDur, 10));

    const savedBreakDur = localStorage.getItem("cozy_pomodoro_break_dur");
    if (savedBreakDur) setBreakDuration(parseInt(savedBreakDur, 10));

    // C. Stan timera
    const savedMode = (localStorage.getItem("cozy_pomodoro_mode") as "work" | "break") || "work";
    setPomodoroMode(savedMode);

    const savedRunning = localStorage.getItem("cozy_pomodoro_running") === "true";
    const currentDurMin = savedMode === "work" ? (savedWorkDur ? parseInt(savedWorkDur, 10) : 25) : (savedBreakDur ? parseInt(savedBreakDur, 10) : 5);

    if (savedRunning) {
      const savedEndTime = localStorage.getItem("cozy_pomodoro_endTime");
      if (savedEndTime) {
        const remaining = Math.round((parseInt(savedEndTime, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setTimeLeft(remaining);
          setTimerRunning(true);
          setIsFinished(false);
        } else {
          // Czas minął w trakcie gdy user był na innej podstronie
          setTimeLeft(0);
          setTimerRunning(false);
          setIsFinished(true);
          localStorage.setItem("cozy_pomodoro_running", "false");
        }
      }
    } else {
      const savedTimeLeft = localStorage.getItem("cozy_pomodoro_timeLeft");
      if (savedTimeLeft) {
        const parsed = parseInt(savedTimeLeft, 10);
        setTimeLeft(parsed);
        setIsFinished(parsed <= 0);
      } else {
        setTimeLeft(currentDurMin * 60);
      }
    }
  }, []);

  // 2. GŁÓWNY SILNIK ODLICZANIA (ZAPISUJĄCY CZAS NAUKI DO STATYSTYK)
  useEffect(() => {
    if (!timerRunning) return;

    const tick = () => {
      const savedEndTime = localStorage.getItem("cozy_pomodoro_endTime");
      if (!savedEndTime) {
        setTimerRunning(false);
        return;
      }

      const now = Date.now();
      const endTime = parseInt(savedEndTime, 10);
      const remaining = Math.max(0, Math.round((endTime - now) / 1000));

      setTimeLeft(remaining);

      // NALICZANIE CZASU NAUKI (Tylko w trybie 'work')
      if (pomodoroMode === "work") {
        const lastTickStr = localStorage.getItem("cozy_pomodoro_last_tick");
        const lastTick = lastTickStr ? parseInt(lastTickStr, 10) : now;
        const deltaSeconds = Math.min(60, Math.max(0, (now - lastTick) / 1000)); // Bezpieczna delta

        if (deltaSeconds > 0) {
          // 1. Zapis do dziennego celu
          const currentToday = parseFloat(localStorage.getItem("cozy_study_minutes_today") || "0");
          const updatedToday = currentToday + deltaSeconds / 60;
          localStorage.setItem("cozy_study_minutes_today", updatedToday.toString());
          setMinutesStudiedToday(updatedToday);

          // 2. Zapis do statystyk ogólnych (dla strony Moje Postępy: w sekundach)
          const currentTotalSec = parseInt(localStorage.getItem("cozy_study_time_total") || "0", 10);
          const updatedTotalSec = currentTotalSec + Math.round(deltaSeconds);
          localStorage.setItem("cozy_study_time_total", updatedTotalSec.toString());
        }

        localStorage.setItem("cozy_pomodoro_last_tick", now.toString());
      }

      // KONIEC CZASU SESJI
      if (remaining <= 0) {
        setTimerRunning(false);
        setIsFinished(true);
        playSound("success");

        localStorage.setItem("cozy_pomodoro_running", "false");
        localStorage.setItem("cozy_pomodoro_timeLeft", "0");

        if (pomodoroMode === "work") {
          triggerNotification("🔔 Koniec sesji nauki! Czas na zasłużony relaks ☕", "success");
        } else {
          triggerNotification("🔔 Przerwa dobiegła końca! Gotowy na kolejną powtórkę? 📚", "info");
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, pomodoroMode, triggerNotification]);

  // START / PAUZA
  const toggleTimer = () => {
    playSound("click");
    const nextRunning = !timerRunning;
    setTimerRunning(nextRunning);
    setIsFinished(false);

    if (nextRunning) {
      // Jeśli zaczynamy od zera, resetujemy do wybranej długości
      const currentSeconds = timeLeft <= 0 ? (pomodoroMode === "work" ? workDuration * 60 : breakDuration * 60) : timeLeft;
      const now = Date.now();
      const endTime = now + currentSeconds * 1000;

      setTimeLeft(currentSeconds);
      localStorage.setItem("cozy_pomodoro_endTime", endTime.toString());
      localStorage.setItem("cozy_pomodoro_last_tick", now.toString());
      localStorage.setItem("cozy_pomodoro_running", "true");
    } else {
      localStorage.setItem("cozy_pomodoro_running", "false");
      localStorage.setItem("cozy_pomodoro_timeLeft", timeLeft.toString());
    }
  };

  // RESET
  const resetTimer = () => {
    playSound("click");
    setTimerRunning(false);
    setIsFinished(false);
    const defaultTime = pomodoroMode === "work" ? workDuration * 60 : breakDuration * 60;
    setTimeLeft(defaultTime);

    localStorage.setItem("cozy_pomodoro_running", "false");
    localStorage.setItem("cozy_pomodoro_timeLeft", defaultTime.toString());
  };

  // ZMIANA TRYBU (NAUKA / RELAKS)
  const switchPomodoroMode = (newMode: "work" | "break") => {
    playSound("click");
    setTimerRunning(false);
    setIsFinished(false);
    setPomodoroMode(newMode);

    const defaultSeconds = newMode === "work" ? workDuration * 60 : breakDuration * 60;
    setTimeLeft(defaultSeconds);

    localStorage.setItem("cozy_pomodoro_running", "false");
    localStorage.setItem("cozy_pomodoro_mode", newMode);
    localStorage.setItem("cozy_pomodoro_timeLeft", defaultSeconds.toString());
  };

  // ZMIANA DŁUGOŚCI SESJI (PRESETY 15 / 20 / 25 LUB 5 / 10 / 15)
  const setPresetDuration = (minutes: number) => {
    playSound("click");
    setTimerRunning(false);
    setIsFinished(false);

    if (pomodoroMode === "work") {
      setWorkDuration(minutes);
      localStorage.setItem("cozy_pomodoro_work_dur", minutes.toString());
    } else {
      setBreakDuration(minutes);
      localStorage.setItem("cozy_pomodoro_break_dur", minutes.toString());
    }

    const newSeconds = minutes * 60;
    setTimeLeft(newSeconds);
    localStorage.setItem("cozy_pomodoro_running", "false");
    localStorage.setItem("cozy_pomodoro_timeLeft", newSeconds.toString());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const goalPercentage = Math.min(100, Math.round((minutesStudiedToday / dailyGoal) * 100));

  return (
    <div className={`rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-5 transition-colors duration-500 shadow-md`}>
      
      {/* Nagłówek i przełącznik trybów */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-widest text-amber-500 font-semibold flex items-center gap-1.5">
          <span>⏱️</span> Pomodoro
        </h3>
        <div className="flex gap-1 bg-stone-950/60 p-1 rounded-xl border border-stone-850">
          <button
            onClick={() => switchPomodoroMode("work")}
            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
              pomodoroMode === "work"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Nauka
          </button>
          <button
            onClick={() => switchPomodoroMode("break")}
            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
              pomodoroMode === "break"
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Relaks
          </button>
        </div>
      </div>

      {/* WYBÓR DŁUGOŚCI SESJI (PRESETY 15/20/25 DLA NAUKI, 5/10/15 DLA PRZERWY) */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Długość:</span>
        {(pomodoroMode === "work" ? [15, 20, 25] : [5, 10, 15]).map((mins) => {
          const isSelected = (pomodoroMode === "work" ? workDuration : breakDuration) === mins;
          return (
            <button
              key={mins}
              onClick={() => setPresetDuration(mins)}
              disabled={timerRunning}
              className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono font-bold transition-all ${
                isSelected
                  ? "bg-stone-800 text-stone-100 border border-stone-700 shadow-inner"
                  : "bg-stone-950/40 text-stone-500 hover:text-stone-300 border border-stone-900"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {mins}m
            </button>
          );
        })}
      </div>

      {/* GŁÓWNY WYŚWIETLACZ CZASU (Z EFEKTEM MRUGANIA PO ZAKOŃCZENIU) */}
      <div className={`border rounded-2xl p-4 text-center transition-all duration-500 ${
        isFinished 
          ? "bg-red-950/30 border-red-500/80 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          : "bg-stone-900/60 border-stone-800/80"
      }`}>
        <span className={`text-4xl font-black tracking-widest font-mono select-none drop-shadow-sm transition-colors ${
          isFinished ? "text-red-400" : "text-stone-100"
        }`}>
          {formatTime(timeLeft)}
        </span>
        <p className="text-[10px] text-stone-400 mt-1 font-sans">
          {isFinished ? (
            <strong className="text-red-400 font-bold uppercase tracking-wider">
              {pomodoroMode === "work" ? "🎉 Sesja ukończona! Czas na przerwę" : "✨ Przerwa minęła! Wracamy do nauki"}
            </strong>
          ) : (
            pomodoroMode === "work" ? "Czas na głębokie skupienie 📚" : "Czas na chwilę wytchnienia ☕"
          )}
        </p>
      </div>

      {/* PRZYCISKI STEROWANIA */}
      <div className="grid grid-cols-2 gap-2 mt-3.5">
        {isFinished ? (
          <button
            onClick={() => switchPomodoroMode(pomodoroMode === "work" ? "break" : "work")}
            className="col-span-2 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-lg active:scale-95 cursor-pointer"
          >
            {pomodoroMode === "work" ? "Rozpocznij przerwę ☕" : "Rozpocznij naukę 📚"}
          </button>
        ) : (
          <>
            <button
              onClick={toggleTimer}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                timerRunning
                  ? "bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700"
                  : `${currentTheme.accentBg || "bg-amber-500"} text-stone-950 ${currentTheme.accentHover || "hover:bg-amber-400"} shadow-md active:scale-95`
              }`}
            >
              {timerRunning ? (
                <><span>⏸️</span> Pauza</>
              ) : (
                <><span>▶️</span> Start</>
              )}
            </button>

            <button
              onClick={resetTimer}
              className="py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-850 border border-stone-800/60 text-stone-400 hover:text-stone-200 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <span>🔄</span> Reset
            </button>
          </>
        )}
      </div>

      {/* DZIENNY CEL NAUKI */}
      <div className="mt-4 pt-3.5 border-t border-stone-800/60 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-stone-400 font-semibold">
          <span>Dzienny cel nauki:</span>
          <span className="font-mono">{Math.floor(minutesStudiedToday)} / {dailyGoal} min ({goalPercentage}%)</span>
        </div>
        <div className="w-full h-1.5 bg-stone-950/60 rounded-full overflow-hidden border border-stone-900">
          <div 
            className={`h-full ${goalPercentage >= 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500"} rounded-full transition-all duration-300`}
            style={{ width: `${goalPercentage}%` }}
          />
        </div>
        {goalPercentage >= 100 && (
          <span className="text-[9px] text-emerald-400 font-bold text-center mt-0.5 animate-pulse">
            🎉 Gratulacje! Twój dzisiejszy cel został osiągnięty!
          </span>
        )}
      </div>

    </div>
  );
};