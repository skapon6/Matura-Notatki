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
      // 1. Jeśli karta jest uśpiona w tle lub trwa już zapytanie -> nie pytaj bazy
      if (typeof document !== "undefined" && document.hidden) return;
      if (isChecking) return;
      isChecking = true;

      try {
        // 2. Sprawdzamy czy użytkownik jest w ogóle zalogowany
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          isChecking = false;
          return;
        }

        // 3. Bezpiecznik: jeśli na tym urządzeniu trwa właśnie proces logowania, odczekaj
        if (typeof window !== "undefined" && sessionStorage.getItem("is_logging_in")) {
          isChecking = false;
          return;
        }

        // 4. Pobieramy aktualny identyfikator sesji z bazy danych
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("current_session_id")
          .eq("id", session.user.id)
          .single();

        if (profile?.current_session_id && !error) {
          const localSessionId = localStorage.getItem("user_session_id");

          // Jeśli klucz tego urządzenia jest INNY niż najnowszy w bazie -> WYLOGUJ!
          if (localSessionId && profile.current_session_id !== localSessionId) {
            console.warn("Wykryto logowanie na innym urządzeniu. Następuje wylogowanie...");
            await supabase.auth.signOut();
            localStorage.removeItem("user_session_id");
            // Przekierowanie na stronę główną z parametrem wywołującym czerwony toast
            window.location.href = "/?session=expired";
          } 
          // Jeśli na tym urządzeniu brak klucza lokalnie -> parujemy z bazą
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

    // 1. Sprawdź natychmiast przy zmianie podstrony (np. przejście z /notes do /mapa-mysli)
    verifySingleSession();

    // 2. Sprawdź natychmiast gdy użytkownik wraca do karty / klika w okno
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        verifySingleSession();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 3. W tle sprawdzaj co 60 sekund (1 minuta)
    const interval = setInterval(verifySingleSession, 60000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [pathname]);

  return null; // Niewidoczny komponent globalny
}