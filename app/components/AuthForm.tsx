"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { translateAuthError } from "../lib/auth-utils";
import { ThemeClasses } from "../lib/theme";

interface AuthFormProps {
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ currentTheme, triggerNotification }) => {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegisterForm, setIsRegisterForm] = useState(false);
  const [authFormLoading, setAuthFormLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormLoading(true);
    
    if (isRegisterForm) {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        triggerNotification(translateAuthError(error.message), "error");
      } else {
        triggerNotification("Konto zostało pomyślnie utworzone! Możesz się teraz zalogować.", "success");
        setIsRegisterForm(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        triggerNotification(translateAuthError(error.message), "error");
      } else {
        triggerNotification("Zalogowano pomyślnie!", "success");
      }
    }
    setAuthFormLoading(false);
  };

  return (
    <div className={`w-full max-w-sm rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-6 sm:p-8 shadow-xl ${currentTheme.glow}`}>
      <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-stone-100 font-serif text-center">
          {isRegisterForm ? "Załóż darmowe konto" : "Zaloguj się"}
        </h3>
        
        <div className="flex flex-col gap-3 mt-2">
          <input
            type="email"
            placeholder="Twój adres e-mail"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            required
            className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
          />
          <input
            type="password"
            placeholder="Hasło"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            required
            className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
          />
          
          <button
            type="submit"
            disabled={authFormLoading}
            className={`w-full mt-2 py-2.5 rounded-xl ${currentTheme.accentBg} text-stone-950 font-bold ${currentTheme.accentHover} transition-all disabled:bg-gray-500`}
          >
            {authFormLoading ? "Trwa logowanie..." : isRegisterForm ? "Zarejestruj się" : "Zaloguj się"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterForm(!isRegisterForm)}
          className="text-xs text-amber-500 hover:underline text-center mt-2 focus:outline-none"
        >
          {isRegisterForm ? "Masz już konto? Zaloguj się" : "Nie masz konta? Zarejestruj się"}
        </button>
      </form>
    </div>
  );
};