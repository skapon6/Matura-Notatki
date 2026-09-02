// app/components/SessionGuard.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export function SessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    let isChecking = false;

    async function verifySingleSession() {
      if (isChecking) return;
      isChecking = true;

      try {
        // 1. Sprawdzamy czy w ogóle jest aktywna sesja użytkownika
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          isChecking = false;
          return;
        }

        // 2. Bezpiecznik: jeśli na tym urządzeniu trwa właśnie logowanie, wstrzymaj sprawdzanie
        if (typeof window !== "undefined") {
          const isLoggingIn = sessionStorage.getItem("is_logging_in");
          if (isLoggingIn) {
            isChecking = false;
            return;
          }
        }

        // 3. Pobieramy aktualny identyfikator aktywnej sesji z bazy
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("current_session_id")
          .eq("id", session.user.id)
          .single();

        if (profile?.current_session_id && !error) {
          const localSessionId = localStorage.getItem("user_session_id");

          // Jeśli na tym urządzeniu klucz jest INNY niż najnowszy w bazie -> NATYCHMIAST WYLOGUJ!
          if (localSessionId && profile.current_session_id !== localSessionId) {
            console.warn("Wykryto logowanie na innym urządzeniu. Globalne wylogowanie z podstrony...");
            await supabase.auth.signOut();
            localStorage.removeItem("user_session_id");
            // Przekierowujemy na stronę główną z parametrem pokazującym czerwony toast
            window.location.href = "/?session=expired";
          } 
          // Jeśli urządzenie nie miało jeszcze klucza lokalnie -> parujemy z bazą
          else if (!localSessionId && profile.current_session_id) {
            localStorage.setItem("user_session_id", profile.current_session_id);
          }
        }
      } catch (err) {
        console.error("Błąd weryfikacji SessionGuard:", err);
      } finally {
        isChecking = false;
      }
    }

    // A. Sprawdzaj natychmiast przy wejściu na jakąkolwiek podstronę (np. /notes/lalka)
    verifySingleSession();

    // B. Sprawdzaj gdy użytkownik wraca do karty przeglądarki
    const handleFocus = () => verifySingleSession();
    window.addEventListener("focus", handleFocus);

    // C. Sprawdzaj cicho w tle co 10 sekund
    const interval = setInterval(verifySingleSession, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [pathname]);

  return null; // Niewidoczny komponent
}