// app/reset-hasla/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getThemeClasses, CozyTheme } from "../lib/theme";
import Link from "next/link";

export default function ResetHaslaPage() {
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState<any>(getThemeClasses("library"));

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCurrentTheme(getThemeClasses(savedTheme));
    }
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  // Upewniamy się, że token z adresu URL został poprawnie załadowany do sesji
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Wpisane hasła nie są identyczne.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg("Wystąpił błąd podczas aktualizacji hasła: " + error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
        }, 2500);
      }
    } catch {
      setErrorMsg("Nieoczekiwany błąd połączenia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-6 ${currentTheme.bg} text-stone-200 transition-colors duration-500`}>
      <div className={`w-full max-w-md ${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl p-8 shadow-2xl flex flex-col gap-6`}>
        
        <div className="text-center">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-xl font-bold font-serif text-stone-100">Ustal nowe hasło</h1>
          <p className="text-xs text-stone-400 mt-1">Wpisz nowe, bezpieczne hasło do swojego konta</p>
        </div>

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs text-center leading-relaxed animate-fade-in">
            🎉 <strong>Hasło zostało pomyślnie zmienione!</strong><br />
            Za chwilę zostaniesz przekierowany do kącika maturalnego...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/40 text-red-300 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-stone-400 font-bold uppercase tracking-wider px-1">Nowe hasło:</label>
              <input
                type="password"
                placeholder="Minimum 6 znaków"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full bg-stone-950/80 border border-stone-800 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/60 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-stone-400 font-bold uppercase tracking-wider px-1">Powtórz nowe hasło:</label>
              <input
                type="password"
                placeholder="Wpisz ponownie nowe hasło"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full bg-stone-950/80 border border-stone-800 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/60 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? "Zapisywanie nowego hasła..." : "Zapisz nowe hasło 🔑"}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-stone-800/60">
          <Link href="/" className="text-xs text-stone-500 hover:text-stone-300 transition-colors">
            ← Wróć do strony głównej
          </Link>
        </div>

      </div>
    </div>
  );
}