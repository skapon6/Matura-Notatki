"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; // Upewnij się, że ścieżka jest poprawna względem folderu pliku

export default function FiszkiPage() {
  const router = useRouter();

  // Stany autoryzacji i dostępu
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Stany bazy danych i fiszek
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // 1. Sprawdzanie uprawnień Premium (Zgodnie z logiką z app/page.tsx)
  useEffect(() => {
    async function verifyPremiumAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push("/"); // Przekieruj na główną, jeśli nie jest zalogowany
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, expires_at")
          .eq("id", session.user.id)
          .single();

        const activeStatuses = ['mini', 'medium', 'premium', 'admin', 'paid'];
        const isStatusActive = profile ? activeStatuses.includes(profile.subscription_status) : false;

        // Sprawdzenie daty ważności konta
        let isExpired = false;
        if (profile?.expires_at) {
          const expirationTime = new Date(profile.expires_at).getTime();
          const currentTime = new Date().getTime();
          isExpired = currentTime > expirationTime;
        }

        if (isStatusActive && !isExpired) {
          setHasAccess(true);
          // Jeśli ma dostęp, wywołujemy pobieranie fiszek
          fetchFlashcards();
        } else {
          router.push("/"); // Przekieruj na główną, jeśli brak dostępu lub subskrypcja wygasła
        }
      } catch (err) {
        console.error("Błąd weryfikacji dostępu:", err);
        router.push("/");
      } finally {
        setCheckingAccess(false);
      }
    }

    verifyPremiumAccess();
  }, [router]);

  // 2. Pobieranie fiszek z tabeli Supabase
  async function fetchFlashcards() {
    setLoadingCards(true);
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      if (data) {
        setFlashcards(data);
      }
    } catch (err) {
      console.error("Błąd pobierania fiszek:", err);
    } finally {
      setLoadingCards(false);
    }
  }

  // 3. Nawigacja między fiszkami
  const handleNext = () => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 200);
  };

  const handlePrev = () => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 200);
  };

  // Ekran ładowania autoryzacji
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">☕</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Weryfikacja dostępu do strefy Premium...
        </p>
      </div>
    );
  }

  // Zabezpieczenie przed wyrenderowaniem strony bez uprawnień
  if (!hasAccess) return null;

  const currentCard = flashcards[currentIndex];

  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      <div className="max-w-xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-8 shadow-xl mt-8 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/60 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-serif text-stone-100">Szybkie Fiszki</h1>
              <p className="text-[10px] text-stone-500">Powtórka najważniejszych motywów</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="text-xs px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-amber-700 transition-all"
          >
            ← Wróć
          </Link>
        </div>

        {/* Dynamiczny widok fiszek */}
        {loadingCards ? (
          <div className="h-64 flex items-center justify-center text-stone-500 text-xs">
            ☕ Pobieranie najnowszych fiszek z bazy danych...
          </div>
        ) : flashcards.length > 0 && currentCard ? (
          <>
            {/* Karta Fiszki */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="h-64 rounded-2xl border border-stone-800 bg-stone-900/50 hover:bg-stone-900/70 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center shadow-inner select-none relative"
            >
              {/* Epoka literacka u góry */}
              {currentCard?.era && (
                <span className="absolute top-4 left-4 text-[10px] text-amber-500 uppercase tracking-widest font-bold">
                  {currentCard.era}
                </span>
              )}
              
              <span className="absolute top-4 right-4 text-[10px] text-stone-500 uppercase tracking-widest">
                Fiszka {currentIndex + 1} z {flashcards.length}
              </span>
              
              <span className="absolute bottom-4 text-[10px] text-stone-500">
                {isFlipped ? "Kliknij, aby odwrócić 🔄" : "Kliknij, aby poznać odpowiedź 🔄"}
              </span>

              {/* Przód i tył z bezpiecznym łańcuchowaniem */}
              {isFlipped ? (
                <p className="text-sm sm:text-base text-stone-200 font-serif leading-relaxed animate-fade-in px-2">
                  {currentCard?.back}
                </p>
              ) : (
                <p className="text-base sm:text-lg text-stone-100 font-bold font-serif leading-tight px-2">
                  {currentCard?.front}
                </p>
              )}
            </div>

            {/* Przyciski kontrolne */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <button
                onClick={handlePrev}
                className="py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700 text-xs font-semibold transition-all"
              >
                ← Poprzednia
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700 text-xs font-semibold transition-all"
              >
                Odwróć
              </button>
              <button
                onClick={handleNext}
                className="py-2.5 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 text-xs font-bold transition-all shadow-md"
              >
                Następna →
              </button>
            </div>
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-stone-800 rounded-2xl">
            <span className="text-3xl mb-2">🦉</span>
            <p className="text-xs text-stone-500">Brak dostępnych fiszek w bazie danych.</p>
          </div>
        )}

      </div>
    </div>
  );
}