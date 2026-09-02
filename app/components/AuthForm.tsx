// app/components/AuthForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { translateAuthError } from "../lib/auth-utils";
import { ThemeClasses } from "../lib/theme";
import Link from "next/link";

interface AuthFormProps {
  currentTheme: ThemeClasses;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

// Czarna lista domen z tymczasowymi mailami
const BLOCKED_DOMAINS = [
  "temp-mail.org", "10minutemail.com", "yopmail.com", "guerrillamail.com",
  "mailinator.com", "trashmail.com", "dispostable.com", "getairmail.com",
  "throwawaymail.com", "maildrop.cc", "tempmail.com", "sharklasers.com", "necub.com",
  "mtupu.com", "laoia.com", "jbsze.com", "04.tml.waw.pl", "ozsaip.com",
  "guerillamailblock.com", "guerillamail.net", "guerillamail.org",
  "yopmail.fr", "yopmail.net", "cool.fr.to", "jetable.org", "temp-mail.ru",
  "temp-mail.co", "temporary-mail.net", "generator.email", "emaildeck.com",
  "moakt.com", "10minutemail.net", "tempmailaddress.com", "spambox.us",
  "crazymailing.com", "armyspy.com", "cuvox.de", "dayrep.com",
  "fleckens.hu", "gustr.com", "teleworm.us", "spydeer.me", "10minutemail.co.za", 
  "lidugw.com", "laoia.com", "dyleris.com", "gonrr.net", 
];

const isDisposableEmail = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return BLOCKED_DOMAINS.includes(domain);
};

export const AuthForm: React.FC<AuthFormProps> = ({ currentTheme, triggerNotification }) => {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Stany formularza
  const [isRegisterForm, setIsRegisterForm] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [authFormLoading, setAuthFormLoading] = useState(false);

  // PANCERNE WYKRYWANIE LINKU RESETUJĄCEGO HASŁO
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("type=recovery") || search.includes("type=recovery")) {
        setIsRecoveryMode(true);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const resetPasswordFields = () => {
    setAuthPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormLoading(true);
    
    try {
      if (isRecoveryMode) {
        // 1. Walidacja zgodności nowych haseł
        if (newPassword !== confirmNewPassword) {
          triggerNotification("Nowe hasła nie są identyczne. Wpisz je poprawnie w obu polach.", "error");
          setAuthFormLoading(false);
          return;
        }

        // 2. Pobieranie tokenów z paska adresu
        if (typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }

        // 3. Bezpieczna zmiana hasła w Supabase
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          triggerNotification("Twoje hasło zostało pomyślnie zaktualizowane! Możesz się zalogować.", "success");
          setIsRecoveryMode(false);
          setIsForgotPassword(false);
          setIsRegisterForm(false);
          resetPasswordFields();

          if (typeof window !== "undefined") {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } else if (isForgotPassword) {
        // 4. Wysłanie maila z linkiem resetującym
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
          redirectTo: `${window.location.origin}/reset-hasla`,
        });

        if (error) {
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          triggerNotification("Link do zresetowania hasła został wysłany na Twój adres e-mail!", "success");
          setIsForgotPassword(false);
        }
      } else if (isRegisterForm) {
        // 5. Blokada tymczasowych maili
        if (isDisposableEmail(authEmail)) {
          triggerNotification(
            "Rejestracja za pomocą tymczasowych adresów e-mail jest zablokowana. Użyj prawdziwej skrzynki pocztowej (np. Gmail, Onet, WP).", 
            "error"
          );
          setAuthFormLoading(false);
          return;
        }

        // 6. Zgoda na regulamin
        if (!acceptTerms) {
          triggerNotification("Musisz zaakceptować regulamin i politykę prywatności, aby założyć konto.", "error");
          setAuthFormLoading(false);
          return;
        }

        // 7. Sprawdzenie powtórzonego hasła przy rejestracji
        if (authPassword !== confirmPassword) {
          triggerNotification(
            "Podane hasła nie są identyczne. Upewnij się, że wpisałeś je poprawnie w obu polach.", 
            "error"
          );
          setAuthFormLoading(false);
          return;
        }

        // 8. Rejestracja użytkownika
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });

        if (error) {
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          triggerNotification("Konto zostało utworzone pomyślnie! Sprawdź e-mail, aby je aktywować.", "success");
          setIsRegisterForm(false);
          resetPasswordFields();
        }
      } else {
        // 9. KLASYCZNE LOGOWANIE + OBSŁUGA POJEDYNCZEJ SESJI (Z BEZPIECZNIKIEM)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("is_logging_in", "true"); // Włączamy bezpiecznik
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("is_logging_in");
          }
          triggerNotification(translateAuthError(error.message), "error");
        } else {
          // --- BLOKADA WSPÓŁDZIELENIA KONTA ---
          if (data?.user && typeof window !== "undefined") {
            const newSessionId = crypto.randomUUID();
            localStorage.setItem("user_session_id", newSessionId);

            // Zapisujemy nowy klucz sesji w bazie Supabase
            await supabase
              .from("profiles")
              .update({ current_session_id: newSessionId })
              .eq("id", data.user.id);

            // Zdejmujemy bezpiecznik po udanym zapisie w bazie
            sessionStorage.removeItem("is_logging_in");
          }

          triggerNotification("Zalogowano pomyślnie!", "success");
          resetPasswordFields();
        }
      }
    } 
    catch (err) {
      triggerNotification("Wystąpił nieoczekiwany błąd serwera.", "error");
    } finally {
      setAuthFormLoading(false);
    }
  };

  const getFormTitle = () => {
    if (isRecoveryMode) return "Ustaw nowe hasło";
    if (isForgotPassword) return "Przywracanie hasła";
    if (isRegisterForm) return "Załóż darmowe konto";
    return "Zaloguj się";
  };

  return (
    <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} shadow-2xl backdrop-blur-md transition-all duration-500`}>
      <h2 className="text-2xl font-bold text-stone-100 font-serif mb-2 text-center sm:text-left">
        {getFormTitle()}
      </h2>
      <p className="text-xs text-stone-400 mb-6 leading-relaxed text-center sm:text-left">
        {isRecoveryMode && "Wpisz nowe, bezpieczne hasło do swojego konta."}
        {isForgotPassword && "Podaj swój adres e-mail, a wyślemy Ci link do zresetowania hasła."}
        {isRegisterForm && "Utwórz konto, aby otrzymać darmowy token AI i dostęp do kącika nauki."}
        {!isRegisterForm && !isForgotPassword && !isRecoveryMode && "Wpisz swoje dane, aby uzyskać dostęp do swoich materiałów i postępów."}
      </p>

      <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
        {/* POLA DLA TRYBU ODZYSKIWANIA HASŁA */}
        {isRecoveryMode ? (
          <>
            <div>
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-1.5">
                Nowe Hasło
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-stone-900/80 border border-stone-800 rounded-xl py-2.5 px-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all font-sans"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-1.5">
                Powtórz Nowe Hasło
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full bg-stone-900/80 border border-stone-800 rounded-xl py-2.5 px-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all font-sans"
              />
            </div>
          </>
        ) : (
          <>
            {/* STANDARDOWE POLE E-MAIL */}
            <div>
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-1.5">
                Adres e-mail
              </label>
              <input
                type="email"
                required
                placeholder="twoj@email.pl"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-stone-900/80 border border-stone-800 rounded-xl py-2.5 px-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all font-sans"
              />
            </div>

            {/* POLE HASŁA (UKRYWANE W TRYBIE PRZYWRACANIA HASŁA) */}
            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    Hasło
                  </label>
                  {!isRegisterForm && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-amber-500 hover:text-amber-400 font-medium transition-colors"
                    >
                      Zapomniałeś hasła?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-stone-900/80 border border-stone-800 rounded-xl py-2.5 px-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all font-sans"
                />
              </div>
            )}

            {/* DODATKOWE POLA DLA REJESTRACJI */}
            {isRegisterForm && (
              <>
                <div>
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-1.5">
                    Powtórz hasło
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-stone-900/80 border border-stone-800 rounded-xl py-2.5 px-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all font-sans"
                  />
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-800 text-amber-500 focus:ring-amber-500 bg-stone-950 cursor-pointer accent-[#c68a4c] mt-0.5"
                  />
                  <label htmlFor="acceptTerms" className="text-xs text-stone-400 leading-relaxed cursor-pointer select-none">
                    Akceptuję <Link href="/regulamin" target="_blank" className="text-amber-500 hover:underline">Regulamin</Link> oraz <Link href="/prywatnosc" target="_blank" className="text-amber-500 hover:underline">Politykę Prywatności</Link>.
                  </label>
                </div>
              </>
            )}
          </>
        )}

        {/* PRZYCISK SUBMIT */}
        <button
          type="submit"
          disabled={authFormLoading}
          className="w-full py-3 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold transition-all text-xs sm:text-sm shadow-md mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
        >
          {authFormLoading ? (
            <span className="animate-pulse">Przetwarzanie... ☕</span>
          ) : isRecoveryMode ? (
            "Zapisz nowe hasło"
          ) : isForgotPassword ? (
            "Wyślij link resetujący"
          ) : isRegisterForm ? (
            "Załóż bezpłatne konto"
          ) : (
            "Zaloguj się do Kącika"
          )}
        </button>

        {/* PRZEŁĄCZNIKI WIDOKÓW */}
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-stone-800/60 mt-2 text-xs text-stone-400">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
            >
              ← Wróć do logowania
            </button>
          ) : isRegisterForm ? (
            <p>
              Masz już konto?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterForm(false);
                  resetPasswordFields();
                }}
                className="text-amber-500 hover:text-amber-400 font-semibold transition-colors ml-1"
              >
                Zaloguj się
              </button>
            </p>
          ) : !isRecoveryMode ? (
            <p>
              Nie masz jeszcze konta?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterForm(true);
                  resetPasswordFields();
                }}
                className="text-amber-500 hover:text-amber-400 font-semibold transition-colors ml-1"
              >
                Zarejestruj się za darmo
              </button>
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
};