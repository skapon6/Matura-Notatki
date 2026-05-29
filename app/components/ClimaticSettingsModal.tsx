"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { playSound } from "../lib/sounds";
import { CozyTheme } from "../lib/theme";

interface ClimaticSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cozyTheme: CozyTheme;
  setCozyTheme: (theme: CozyTheme) => void;
  user: any;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

type TabType = "climate" | "account" | "goal";

export const ClimaticSettingsModal: React.FC<ClimaticSettingsModalProps> = ({
  isOpen,
  onClose,
  cozyTheme,
  setCozyTheme,
  user,
  triggerNotification,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("climate");
  const [loading, setLoading] = useState(false);

  // Stany dla zmiany hasła
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Stany dla usuwania konta
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Stany dla dziennego celu nauki (Cozy Goal)
  const [studyGoal, setStudyGoal] = useState<number>(25);

  // Wczytywanie zapisanego celu nauki z localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGoal = localStorage.getItem("cozy_study_goal");
      if (savedGoal) {
        setStudyGoal(parseInt(savedGoal));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTheme = getThemeClasses(cozyTheme);

  // 1. BEZPIECZNA ZMIANA HASŁA (Wymaga weryfikacji starego hasła)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      triggerNotification("Nowe hasła nie są identyczne!", "error");
      return;
    }
    if (newPassword.length < 6) {
      triggerNotification("Nowe hasło musi mieć co najmniej 6 znaków!", "error");
      return;
    }

    setLoading(true);
    try {
      // Weryfikacja starego hasła przez tymczasowe ponowne zalogowanie
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        triggerNotification("Podane stare hasło jest niepoprawne!", "error");
        setLoading(false);
        return;
      }

      // Aktualizacja hasła na nowe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        triggerNotification(updateError.message, "error");
      } else {
        triggerNotification("Hasło zostało pomyślnie zmienione! 🎉", "success");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Wystąpił błąd serwera podczas zmiany hasła.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. USUWANIE KONTA (Przez bezpieczne API serwera)
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== "USUŃ") {
      triggerNotification("Wpisz słowo USUŃ, aby potwierdzić decyzję.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/delete", { method: "POST" });
      const data = await response.json();

      if (response.ok && data.success) {
        triggerNotification("Twoje konto zostało pomyślnie usunięte. Żegnaj! 👋", "success");
        // Wylogowujemy klienta lokalnie i przeładowujemy stronę
        await supabase.auth.signOut();
        window.location.href = "/";
      } else {
        triggerNotification(data.error || "Nie udało się usunąć konta.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Błąd połączenia z serwerem usuwania konta.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. ZAPISYWANIE DZIENNEGO CELU NAUKI
  const handleSaveGoal = (minutes: number) => {
    playSound("success");
    setStudyGoal(minutes);
    localStorage.setItem("cozy_study_goal", minutes.toString());
    triggerNotification(`Dzienny cel nauki ustawiony na ${minutes} minut! 🎯`, "success");
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-in select-none">
      <div className={`w-full max-w-xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col max-h-[85vh] shadow-2xl`}>
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">Centrum Ustawień</h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5">
                Dostosuj klimat, konto i cele nauki
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

        {/* Zakładki (Taby) */}
        <div className="flex border-b border-stone-800/40 bg-stone-950/20 px-4 py-2 gap-2">
          {[
            { id: "climate", label: "🌿 Klimat" },
            { id: "account", label: "🔒 Konto" },
            { id: "goal", label: "🎯 Cel Nauki" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { playSound("click"); setActiveTab(tab.id as TabType); }}
              className={`text-xs px-3.5 py-2 rounded-xl font-semibold border transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-transparent text-stone-500 border-transparent hover:text-stone-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Zawartość zakładek */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: KLIMAT */}
          {activeTab === "climate" && (
            <div className="flex flex-col gap-5 animate-slide-in">
              <p className="text-xs text-stone-400 leading-relaxed">
                Wybierz otoczenie dźwiękowo-wizualne, które najbardziej ułatwia Ci skupienie. Kolorystyka i tło całej aplikacji dostosują się natychmiast:
              </p>
              
              <div className="flex flex-col gap-3">
                {[
                  { id: "library", title: "☕ Biblioteka", desc: "Ciepłe odcienie brązu, zapach kawy i papieru. Klasyczna strefa nauki.", emoji: "📚" },
                  { id: "rainy", title: "🌧️ Deszczowy Dzień", desc: "Głęboki grafit, chłodny błękit i relaksujący szum deszczu za szybą.", emoji: "⛈️" },
                  { id: "fireplace", title: "🔥 Ciepły Kominek", desc: "Burgundowe tło, przytulny blask ognia i kojące trzaski płonącego drewna.", emoji: "🪵" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { playSound("click"); setCozyTheme(item.id as CozyTheme);localStorage.setItem("app_theme", item.id); }}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                      cozyTheme === item.id
                        ? "border-amber-500/40 bg-amber-500/5 shadow-md"
                        : "border-stone-850 bg-stone-900/10 hover:bg-stone-900/30 hover:border-stone-800"
                    }`}
                  >
                    <span className="text-2xl pt-1">{item.emoji}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-stone-100 font-serif">{item.title}</span>
                      <span className="text-xs text-stone-400 leading-normal">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: USTAWIENIA KONTA (Hasło i usuwanie) */}
          {activeTab === "account" && (
            <div className="flex flex-col gap-6 animate-slide-in">
              {/* Formularz zmiany hasła */}
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-3.5 pb-6 border-b border-stone-800/40">
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                  Zmień Hasło Dostępu
                </h3>
                <div className="flex flex-col gap-3">
                  <input
                    type="password"
                    placeholder="Wpisz stare hasło"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full bg-stone-950/80 border border-stone-800/80 rounded-xl py-2 px-4 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                  />
                  <input
                    type="password"
                    placeholder="Wpisz nowe hasło (min. 6 znaków)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-stone-950/80 border border-stone-800/80 rounded-xl py-2 px-4 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                  />
                  <input
                    type="password"
                    placeholder="Powtórz nowe hasło"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-stone-950/80 border border-stone-800/80 rounded-xl py-2 px-4 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                  >
                    {loading ? "Przetwarzanie..." : "Zatwierdź zmianę hasła"}
                  </button>
                </div>
              </form>

              {/* Sekcja usuwania konta */}
              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
                <h3 className="text-xs uppercase tracking-widest text-red-500 font-bold">
                  Strefa Zagrożenia: Usuń Konto
                </h3>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Usunięcie konta jest **trwałe i nieodwracalne**. Spowoduje natychmiastowe skasowanie Twoich postępów, tokenów oraz zapamiętanych cytatów.
                </p>
                <div className="flex flex-col gap-3 mt-1">
                  <input
                    type="text"
                    placeholder="Wpisz słowo 'USUŃ', aby potwierdzić"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    required
                    className="w-full bg-stone-950/80 border border-red-900/30 rounded-xl py-2 px-4 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-red-900/60"
                  />
                  <button
                    type="submit"
                    disabled={loading || deleteConfirmText !== "USUŃ"}
                    className="w-full py-2 bg-red-950/20 border border-red-900/40 hover:bg-red-900 text-red-400 hover:text-white font-bold rounded-xl text-xs transition-all disabled:opacity-30"
                  >
                    {loading ? "Usuwanie..." : "Trwale usuń moje konto"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DZIENNY CEL NAUKI (Ciekawa, nowa funkcja) */}
          {activeTab === "goal" && (
            <div className="flex flex-col gap-5 animate-slide-in">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                  Ustaw Swój Dzienny Cel Nauki
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Ustalenie jasnego, dziennego celu to najlepsza metoda na utrzymanie motywacji. Wybierz, ile minut dziennie chcesz poświęcić na naukę w kąciku:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { time: 25, label: "25 minut (1 sesja Pomodoro)", desc: "Idealny na szybką, codzienną powtórkę lektury." },
                  { time: 50, label: "50 minut (2 sesje)", desc: "Optymalny czas dla systematycznej nauki." },
                  { time: 75, label: "75 minut (3 sesje)", desc: "Głębokie, intensywne przyswajanie wiedzy." },
                  { time: 100, label: "100 minut (4 sesje)", desc: "Prawdziwy maturalny maraton przed egzaminem!" },
                ].map((item) => (
                  <button
                    key={item.time}
                    onClick={() => handleSaveGoal(item.time)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      studyGoal === item.time
                        ? "border-amber-500/40 bg-amber-500/5 shadow-md"
                        : "border-stone-850 bg-stone-900/10 hover:bg-stone-900/30 hover:border-stone-800"
                    }`}
                  >
                    <span className="text-xs font-bold text-stone-100 font-serif flex items-center gap-1.5">
                      🎯 {item.label}
                    </span>
                    <span className="text-[11px] text-stone-400 leading-normal">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Pomocnicza funkcja do pobierania klas stylów (aby plik kompilował się bez błędów)
function getThemeClasses(theme: CozyTheme) {
  switch (theme) {
    case "rainy":
      return {
        cardBorder: "border-slate-800/60",
        cardBg: "bg-[#151c24]/90",
        glow: "shadow-sky-500/5",
        btnBorder: "border-sky-500/30",
        subText: "text-slate-400"
      };
    case "fireplace":
      return {
        cardBorder: "border-red-950/60",
        cardBg: "bg-[#251515]/90",
        glow: "shadow-amber-600/5",
        btnBorder: "border-amber-600/30",
        subText: "text-rose-300/70"
      };
    case "library":
    default:
      return {
        cardBorder: "border-amber-950/40",
        cardBg: "bg-[#1f1915]/90",
        glow: "shadow-amber-700/5",
        btnBorder: "border-[#c68a4c]/30",
        subText: "text-stone-400"
      };
  }
}