"use client";

import React, { useState } from "react";
import Link from "next/link";

const MOCK_FLASHCARDS = [
  { id: 1, front: "Kim był Stanisław Wokulski?", back: "Główny bohater 'Lalki' Bolesława Prusa. Kupiec, pozytywista o duszy romantyka." },
  { id: 2, front: "Co symbolizuje złoty róg w 'Weselu'?", back: "Utraconą szansę na odzyskanie niepodległości oraz narodowe zjednoczenie." },
  { id: 3, front: "Zasada trzech jedności w dramacie antycznym to:", back: "Jedność czasu (24h), miejsca (jeden teatr działań) i akcji (jeden wątek główny)." }
];

export default function FiszkiPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = MOCK_FLASHCARDS[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % MOCK_FLASHCARDS.length);
    }, 200);
  };

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

        {/* Fiszka Card (Click to flip) */}
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="h-64 rounded-2xl border border-stone-800 bg-stone-900/50 hover:bg-stone-900/70 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center shadow-inner select-none relative"
        >
          <span className="absolute top-4 left-4 text-[10px] text-stone-500 uppercase tracking-widest">
            Fiszka {currentIndex + 1} z {MOCK_FLASHCARDS.length}
          </span>
          <span className="absolute bottom-4 text-[10px] text-amber-500/70">
            {isFlipped ? "Kliknij, aby zobaczyć pytanie 🔄" : "Kliknij, aby zobaczyć odpowiedź 🔄"}
          </span>

          {isFlipped ? (
            <p className="text-sm sm:text-base text-stone-200 font-serif leading-relaxed animate-fade-in">
              {currentCard.back}
            </p>
          ) : (
            <p className="text-base sm:text-lg text-stone-100 font-bold font-serif leading-tight">
              {currentCard.front}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700 text-xs font-semibold transition-all"
          >
            Odwróć
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 text-xs font-bold transition-all shadow-md"
          >
            Następna →
          </button>
        </div>

      </div>
    </div>
  );
}