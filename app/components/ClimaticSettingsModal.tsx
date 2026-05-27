"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { CozyTheme } from "../lib/theme";
import { translateAuthError } from "../lib/auth-utils";

interface ClimaticSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cozyTheme: CozyTheme;
  setCozyTheme: (theme: CozyTheme) => void;
  user: any;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export const ClimaticSettingsModal: React.FC<ClimaticSettingsModalProps> = ({
  isOpen,
  onClose,
  cozyTheme,
  setCozyTheme,
  user,
  triggerNotification,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  if (!isOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      triggerNotification("Hasło musi mieć co najmniej 6 znaków!", "error");
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        triggerNotification(translateAuthError(error.message), "error");
      } else {
        triggerNotification("Hasło zostało pomyślnie zmienione! 🔑", "success");
        setNewPassword("");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Wystąpił błąd podczas zmiany hasła.", "error");
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#1f1915] border border-amber-950/40 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-100 text-lg transition-colors"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold font-serif text-stone-100 flex items-center gap-2 mb-2">
          ☕ Ustawienia Twojej Kawiarni Nauki
        </h3>
        <p className="text-xs text-stone-400 mb-5">
          Dostosuj otoczenie do własnego tempa. Zmiana klimatu wpływa na tło strony oraz rodzaj odtwarzanego szumu.
        </p>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
            Wybierz Motyw Wizualny i Dźwiękowy
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => setCozyTheme("library")}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                cozyTheme === "library"
                  ? "border-amber-500 bg-[#c68a4c]/10 text-stone-200"
                  : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🍂</span>
                <div>
                  <p className="text-xs font-bold">Ciepła Biblioteka (Domyślny)</p>
                  <p className="text-[10px] text-stone-500">Cynamonowe barwy, delikatny szum papieru</p>
                </div>
              </div>
              {cozyTheme === "library" && <span className="text-amber-500 text-xs">●</span>}
            </button>

            <button
              onClick={() => setCozyTheme("rainy")}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                cozyTheme === "rainy"
                  ? "border-sky-500 bg-sky-950/15 text-stone-200"
                  : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🌧️</span>
                <div>
                  <p className="text-xs font-bold">Deszczowy Wieczór</p>
                  <p className="text-[10px] text-stone-500">Głębokie chłodne szarości, szum deszczu za oknem</p>
                </div>
              </div>
              {cozyTheme === "rainy" && <span className="text-sky-500 text-xs">●</span>}
            </button>

            <button
              onClick={() => setCozyTheme("fireplace")}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                cozyTheme === "fireplace"
                  ? "border-red-600 bg-red-950/15 text-stone-200"
                  : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-xs font-bold">Kominek w Schronisku</p>
                  <p className="text-[10px] text-stone-500">Ciepła powłoka węglowa, trzaski płonącego drewna</p>
                </div>
              </div>
              {cozyTheme === "fireplace" && <span className="text-red-500 text-xs">●</span>}
            </button>
          </div>
        </div>

        {user && (
          <div className="mt-6 pt-5 border-t border-stone-800 flex flex-col gap-3">
            <label className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
              Konto i Bezpieczeństwo
            </label>
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-2">
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Wpisz nowe, bezpieczne hasło (minimum 6 znaków):
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Nowe hasło"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
                />
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-bold rounded-xl transition-all disabled:bg-gray-500"
                >
                  {passwordChangeLoading ? "Zmienianie..." : "Zmień"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-all active:scale-95"
          >
            Zamknij i Zastosuj
          </button>
        </div>
      </div>
    </div>
  );
};