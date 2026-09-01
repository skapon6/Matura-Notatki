// app/components/QuoteCard.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "../lib/sounds";

interface QuoteCardProps {
  currentTheme: any;
}

interface Quote {
  text: string;
  author: string;
}

const MATURA_QUOTES: Quote[] = [
  // --- Zweryfikowane i poprawione z Twojej listy ---
  { text: "Nie ma skrótów do miejsc, do których dojść warto.", author: "Beverly Sills" },
  { text: "Granice mojego języka są granicami mojego świata.", author: "Ludwig Wittgenstein" },
  { text: "Kto czyta książki, żyje podwójnie.", author: "Umberto Eco" },
  { text: "Człowiek nie jest stworzony do klęski. Człowieka można zniszczyć, ale nie pokonać.", author: "Ernest Hemingway" },
  { text: "Wiem, że nic nie wiem.", author: "Sokrates" },
  { text: "Non omnis moriar.", author: "Horacy" },
  { text: "Żaden wiatr nie jest pomyślny temu, kto nie wie, do którego portu płynie.", author: "Seneka Młodszy" },
  { text: "Być albo nie być – oto jest pytanie.", author: "William Szekspir" },
  { text: "Miej serce i patrzaj w serce!", author: "Adam Mickiewicz" },
  { text: "Nie bój się iść powoli, obawiaj się jedynie stania w miejscu.", author: "Przysłowie chińskie" },
  { text: "Zacznij tam, gdzie jesteś. Użyj tego, co masz. Rób to, co możesz.", author: "Arthur Ashe" },
  { text: "Jedynym człowiekiem, który nigdy nie popełnia błędów, jest ten, który nigdy nic nie robi.", author: "Theodore Roosevelt" },
  { text: "Nie wiedzieć – to błąd, nie chcieć wiedzieć – to grzech.", author: "Przysłowie polskie" },

  // --- Dodatkowe autentyczne cytaty ---
  { text: "A to miej na pilnej pieczy, abyś czytał, kiedy tylko masz wolny czas.", author: "Mikołaj Rej" },
  { text: "Nic dwa razy się nie zdarza i nie zdarzy.", author: "Wisława Szymborska" },
  { text: "A niechaj narodowie wżdy postronni znają, iż Polacy nie gęsi, iż swój język mają.", author: "Mikołaj Rej" },
  { text: "Cudze chwalicie, swego nie znacie, sami nie wiecie, co posiadacie.", author: "Stanisław Jachowicz" },
  { text: "Człowiekiem jestem; nic, co ludzkie, nie jest mi obce.", author: "Terencjusz" },
  { text: "Sapere aude – odważ się być mądrym.", author: "Horacy" },
  { text: "Lepiej zaliczać się do niektórych, niż do wszystkich.", author: "Andrzej Sapkowski" },
  { text: "Poezja to wielka pani, której ani schlebiać, ani kłamać nie wolno.", author: "Zbigniew Herbert" },
  { text: "Wszystko wypływa z tej samej tęsknoty za sensem.", author: "Czesław Miłosz" },
  { text: "Los sprzyja umysłom przygotowanym.", author: "Ludwik Pasteur" },
  { text: "Wiedza to potęga.", author: "Francis Bacon" },
  { text: "Wyobraźnia bez wiedzy może stworzyć rzeczy piękne; wiedza bez wyobraźni najwyżej pożyteczne.", author: "Stanisław Lem" },
  { text: "Bądź wierny. Idź.", author: "Zbigniew Herbert" },
  { text: "Książki to są najlepsi twoi przyjaciele, nie wyśmieją, nie zdradzą, a nauczą wiele.", author: "Jan Rak" },
  { text: "Koniec i bomba, a kto czytał, ten trąba!", author: "Witold Gombrowicz" }
];

// Niezawodne wyliczanie indeksu dnia (zwiększa się równomiernie o 1 co 24h, bez przeskoków na przełomie miesięcy)
const getDailyQuoteIndex = (quotesCount: number): number => {
  if (quotesCount === 0) return 0;
  // Liczba pełnych dni, które upłynęły od 1 stycznia 1970 r.
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % quotesCount;
};

export function QuoteCard({ currentTheme }: QuoteCardProps) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // LOGIKA ŚLEDZENIA MYSZKI DLA POŚWIATY (ZINTEGROWANA Z COZYGLOWCARD)
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Wykrywanie motywu
  let glowColor = "rgba(245, 158, 11, 0.15)"; // 15% poświata dla Library
  let hoverBorderClass = "hover:border-amber-500/30";
  
  const cardBgClasses = (currentTheme?.cardBg || "").toLowerCase();
  
  if (cardBgClasses.includes("151c24") || cardBgClasses.includes("121820")) {
    glowColor = "rgba(14, 165, 233, 0.18)"; // 18% dla Deszczu
    hoverBorderClass = "hover:border-sky-500/35";
  } else if (cardBgClasses.includes("251515") || cardBgClasses.includes("211111")) {
    glowColor = "rgba(239, 68, 68, 0.18)"; // 18% dla Kominka
    hoverBorderClass = "hover:border-red-500/35";
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Bezpieczna inicjalizacja unikalnego cytatu dnia po zamontowaniu na kliencie
  useEffect(() => {
    const dailyIdx = getDailyQuoteIndex(MATURA_QUOTES.length);
    setIndex(dailyIdx);
  }, []);

  const handleNextQuote = (isAuto = false) => {
    if (!isAuto) {
      try {
        playSound("click");
      } catch (e) {}
    }

    setFade(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % MATURA_QUOTES.length);
      setFade(true);
    }, 250);
  };

  const currentQuote = MATURA_QUOTES[index];

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => handleNextQuote(false)}
      title="Kliknij w dowolnym miejscu, aby wylosować kolejny cytat"
      className={`relative overflow-hidden rounded-3xl p-5 border ${currentTheme.cardBorder} ${currentTheme.cardBg} hover:scale-[1.01] ${hoverBorderClass} active:scale-[0.99] transition-all duration-300 shadow-md flex flex-col justify-between min-h-[160px] cursor-pointer group select-none`}
    >
      
      {/* Treść merytoryczna (warstwa z-10 pod poświatą) */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between flex-1 pointer-events-none">
        {/* Nagłówek */}
        <div className="flex items-center justify-between border-b border-stone-850 pb-2.5 mb-2.5">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Mądrość na dziś 📜</span>
          <span className="text-[10px] text-stone-500 group-hover:text-amber-500 transition-colors font-bold uppercase tracking-wider flex items-center gap-1">
            Kliknij, by zmienić 🖋️
          </span>
        </div>

        {/* Blok z cytatem */}
        <div className={`flex flex-col justify-center flex-1 transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}>
          <p className="text-xs sm:text-sm text-stone-200 italic font-serif leading-relaxed text-center px-1">
            „{currentQuote?.text}”
          </p>
          <p className="text-[10px] text-stone-500 font-sans text-right mt-3 tracking-wider font-semibold uppercase pr-2 group-hover:text-stone-400 transition-colors">
            — {currentQuote?.author}
          </p>
        </div>
      </div>

      {/* Warstwa podświetlenia podążająca za myszką */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300 z-20"
          style={{
            background: `radial-gradient(220px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
            mixBlendMode: "screen"
          }}
        />
      )}

    </div>
  );
}