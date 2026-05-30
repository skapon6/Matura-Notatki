// app/components/AuthForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { translateAuthError } from "../lib/auth-utils";
import { ThemeClasses } from "../lib/theme";
import Link from "next/link"; // Import Link dla poprawnych i szybkich odnośników prawnych [4]

interface AuthFormProps {
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

// Czarna lista najpopularniejszych domen z tymczasowymi, 10-minutowymi mailami [11.3]
const BLOCKED_DOMAINS = [
  "temp-mail.org", "10minutemail.com", "yopmail.com", "guerrillamail.com",
  "mailinator.com", "trashmail.com", "dispostable.com", "getairmail.com",
  "throwawaymail.com", "maildrop.cc", "tempmail.com", "sharklasers.com","necub.com",
  "mtupu.com","laoia.com","jbsze.com","04.tml.waw.pl","ozsaip.com",
  "guerillamailblock.com", "guerillamail.net", "guerillamail.org",
  "yopmail.fr", "yopmail.net", "cool.fr.to", "jetable.org", "temp-mail.ru",
  "temp-mail.co", "temporary-mail.net", "generator.email", "emaildeck.com",
  "moakt.com", "10minutemail.net", "tempmailaddress.com", "spambox.us",
  "crazymailing.com", "armyspy.com", "cuvox.de", "dayrep.com",
  "fleckens.hu", "gustr.com", "teleworm.us", "spydeer.me", "10minutemail.co.za"
];

// Funkcja weryfikująca czy domena maila nie należy do czarnej listy [11.3]
const isDisposableEmail = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return BLOCKED_DOMAINS.includes(domain);
};

export const AuthForm: React.FC<AuthFormProps> = ({ currentTheme, triggerNotification }) => {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Stany formularza
  const [isRegisterForm, setIsRegisterForm] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [authFormLoading, setAuthFormLoading] = useState(false);

  // Nasłuchiwanie na link resetujący z maila
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormLoading(true);
    
    try {
      if (isRecoveryMode) {
        // 1. Zmiana hasła po przejściu z linku e-mail
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          triggerNotification("Hasło zostało pomyślnie zaktualizowane!", "success");
          setIsRecoveryMode(false);
          setIsForgotPassword(false);
          setIsRegisterForm(false);
          setNewPassword("");
        }
      } else if (isForgotPassword) {
        // 2. Wysyłanie prośby o reset hasła na e-mail
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
          redirectTo: window.location.origin,
        });
        if (error) {
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          triggerNotification("Link do resetowania hasła został wysłany na Twój e-mail!", "success");
          setIsForgotPassword(false);
        }
      } else if (isRegisterForm) {
        
        // --- BLOKADA REJESTRACJI TYMCZASOWYCH MAILI (WYMÓG BEZPIECZEŃSTWA) --- [11.3]
        if (isDisposableEmail(authEmail)) {
          triggerNotification(
            "Rejestracja za pomocą tymczasowych adresów e-mail jest zablokowana. Użyj prawdziwej skrzynki pocztowej (np. Gmail, Onet, WP).", 
            "error"
          );
          setAuthFormLoading(false);
          return;
        }

        // 3. Rejestracja użytkownika
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) {
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          triggerNotification("Konto zostało utworzone! Potwierdź rejestrację klikając link w wysłanym e-mailu.", "success");
          setIsRegisterForm(false);
        }
      } else {
        // 4. Klasyczne logowanie
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
    } catch (err) {
      triggerNotification("Wystąpił nieoczekiwany błąd.", "error");
    } finally {
      setAuthFormLoading(false);
    }
  };

  // Funkcja określająca nagłówek formularza
  const getFormTitle = () => {
    if (isRecoveryMode) return "Ustaw nowe hasło";
    if (isForgotPassword) return "Przywracanie hasła";
    if (isRegisterForm) return "Załóż darmowe konto";
    return "Zaloguj się";
  };

  return (
    <div className={`w-full max-w-sm rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} p-6 sm:p-8 shadow-xl ${currentTheme.glow}`}>
      <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-stone-100 font-serif text-center">
          {getFormTitle()}
        </h3>
        
        <div className="flex flex-col gap-3 mt-2">
          {isRecoveryMode ? (
            /* Tryb zmiany hasła */
            <input
              type="password"
              placeholder="Nowe bezpieczne hasło"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
            />
          ) : isForgotPassword ? (
            /* Tryb prośby o reset (tylko e-mail) */
            <input
              type="email"
              placeholder="Wpisz swój adres e-mail"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-700/60"
            />
          ) : (
            /* Standardowy tryb logowania/rejestracji */
            <>
              <input
                type="email"
                placeholder="Twój adres e-mail"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                minLength={8}
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
            </>
          )}

          {/* Obowiązkowy checkbox zgody RODO/UOKiK wyłącznie podczas rejestracji */}
          {isRegisterForm && !isForgotPassword && !isRecoveryMode && (
            <div className="flex items-start gap-2 px-1 text-left select-none my-1">
              <input
                type="checkbox"
                id="uokikRegisterConsent"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
                className="w-4 h-4 rounded border-stone-800 text-amber-500 focus:ring-amber-500 bg-stone-950 cursor-pointer accent-[#c68a4c] mt-0.5 shrink-0"
              />
              <label htmlFor="uokikRegisterConsent" className="text-[10px] sm:text-[11px] text-stone-400 cursor-pointer select-none leading-relaxed">
                Oświadczam, że akceptuję{" "}
                <Link href="/regulamin" target="_blank" className="text-amber-500 hover:underline">Regulamin Serwisu</Link>{" "}
                oraz wyrażam zgodę na przetwarzanie danych osobowych zgodnie z{" "}
                <Link href="/prywatnosc" target="_blank" className="text-amber-500 hover:underline">Polityką Prywatności</Link>.
              </label>
            </div>
          )}
          
          <button
            type="submit"
            // Przyciski zablokowane i ze zmniejszoną przezroczystością, jeśli podczas rejestracji nie wybrano zgody
            disabled={authFormLoading || (isRegisterForm && !acceptTerms)}
            className={`w-full mt-2 py-2.5 rounded-xl ${currentTheme.accentBg} text-stone-950 font-bold ${currentTheme.accentHover} transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {authFormLoading 
              ? "Przetwarzanie..." 
              : isRecoveryMode 
                ? "Zaktualizuj hasło" 
                : isForgotPassword 
                  ? "Wyślij link resetujący" 
                  : isRegisterForm 
                    ? "Zarejestruj się" 
                    : "Zaloguj się"
            }
          </button>
        </div>

        {/* Dolna nawigacja między stanami formularza */}
        <div className="flex flex-col gap-2 mt-2 text-center">
          {isRecoveryMode ? (
            <button
              type="button"
              onClick={() => {
                setIsRecoveryMode(false);
                setIsForgotPassword(false);
              }}
              className="text-xs text-stone-500 hover:underline focus:outline-none"
            >
              Anuluj i wróć do logowania
            </button>
          ) : isForgotPassword ? (
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-xs text-amber-500 hover:underline focus:outline-none"
            >
              Wróć do logowania
            </button>
          ) : isRegisterForm ? (
            <button
              type="button"
              onClick={() => setIsRegisterForm(false)}
              className="text-xs text-amber-500 hover:underline focus:outline-none"
            >
              Masz już konto? Zaloguj się
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-stone-500 hover:text-stone-300 hover:underline focus:outline-none"
              >
                Nie pamiętasz hasła?
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterForm(true)}
                className="text-xs text-amber-500 hover:underline focus:outline-none"
              >
                Nie masz konta? Zarejestruj się
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};