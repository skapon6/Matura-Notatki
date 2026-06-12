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
  { text: "Cierpliwość i praca tworzą wielkie dzieła.", author: "Konfucjusz" },
  { text: "Nie ma skrótów do miejsc, do których dojść warto.", author: "Beverly Sills" },
  { text: "Mądrość musisz sam wypracować, nikt jej za ciebie nie zdobędzie.", author: "Sokrates" },
  { text: "Granice mojego języka są granicami mojego świata.", author: "Ludwig Wittgenstein" },
  { text: "Kto czyta książki, żyje podwójnie.", author: "Umberto Eco" },
  { text: "Najważniejszym produktem wiedzy jest mądrość, a nie sama informacja.", author: "Albert Einstein" },
  { text: "Człowiek nie jest stworzony do klęski. Człowieka można zniszczyć, ale nie pokonać.", author: "Ernest Hemingway" },
  { text: "Prawdziwa mądrość polega na tym, by wiedzieć, czego się nie wie.", author: "Sokrates" },
  { text: "Non omnis moriar – nie wszystek umrę.", author: "Horacy" },
  { text: "Żaden wiatr nie jest pomyślny temu, kto nie wie, do którego portu płynie.", author: "Seneka" },
  { text: "Być albo nie być – oto jest pytanie.", author: "William Szekspir" },
  { text: "Miej serce i patrzaj w serce!", author: "Adam Mickiewicz" },
  { text: "Ludzie bezdomni, niespokojni, szukający swojego miejsca...", author: "Stefan Żeromski" },
  { text: "Słowa mają moc zmieniania rzeczywistości, ale to czyny nadają im wartość.", author: "Władysław Bartoszewski" },
  { text: "Nic tak nie niszczy człowieka, jak bierna bezczynność.", author: "Arystoteles" },
  { text: "Wszystko, co w życiu wartościowe, rodzi się z trudu i cierpliwości.", author: "Henryk Sienkiewicz" },
  { text: "Nie bój się iść powoli, obawiaj się jedynie stania w miejscu.", author: "Przysłowie chińskie" },
  { text: "Zacznij tam, gdzie jesteś. Użyj tego, co masz. Rób to, co możesz.", author: "Arthur Ashe" },
  { text: "Tylko ten nie popełnia błędów, kto nic nie robi.", author: "Teodor Roosevelt" },
  { text: "Nauka to pokarm dla rozumu.", author: "Lew Tołstoj" },
  { text: "Książka jest najlepszym przyjacielem człowieka, a biblioteka świątynią jego myśli.", author: "Cyceron" },
  { text: "Wiedza jest jedyną rzeczą, którą możemy powiększyć, dzieląc się nią.", author: "Cezary Cezar" },
  { text: "Nie wiedzieć – to błąd, nie chcieć wiedzieć – to grzech.", author: "Przysłowie polskie" }
];

// Funkcja deterministycznie wyliczająca unikalny indeks cytatu dla dzisiejszego dnia
const getDailyQuoteIndex = (quotesCount: number): number => {
  const today = new Date();
  const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
  const seed = parseInt(dateString, 10);
  return seed % quotesCount;
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

      {/* 
        Warstwa podświetlenia podążająca za myszką (Zintegrowana z CozyGlowCard).
        Renderowana na samej górze (z-20) dla gwarancji widoczności, nie blokując klikania dzięki pointer-events-none.
      */}
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