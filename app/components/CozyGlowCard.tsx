"use client";

import React, { useRef, useState } from "react";

interface CozyGlowCardProps {
  children: React.ReactNode;
  className?: string;
  currentTheme: any;
}

export const CozyGlowCard: React.FC<CozyGlowCardProps> = ({ children, className = "", currentTheme }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Bezimportowe wykrywanie motywu na podstawie klas CSS w currentTheme
  let glowColor = "rgba(245, 158, 11, 0.15)"; // Bursztynowy dla Biblioteki (library) - podbita jasność do 15%
  let hoverBorderClass = "hover:border-amber-500/20"; // Domyślna bursztynowa ramka dla Biblioteki
  
  const cardBgClasses = (currentTheme?.cardBg || "").toLowerCase();
  
  // Jeśli klasy tła karty wskazują na Deszczowy Dzień (grafit/błękit)
  if (cardBgClasses.includes("151c24") || cardBgClasses.includes("121820")) {
    glowColor = "rgba(14, 165, 233, 0.18)"; // Niebiesko-cyjanowy spotlight - podbita jasność do 18%
    hoverBorderClass = "hover:border-sky-500/30"; // Chłodna ramka dla deszczu
  } 
  // Jeśli klasy tła karty wskazują na Ciepły Kominek (burgund/czerwień)
  else if (cardBgClasses.includes("251515") || cardBgClasses.includes("211111")) {
    glowColor = "rgba(239, 68, 68, 0.18)"; // Ciepły czerwono-burgundowy spotlight - podbita jasność do 18%
    hoverBorderClass = "hover:border-red-500/30"; // Ciepła czerwona ramka dla kominka
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-300 ${hoverBorderClass} hover:shadow-lg ${className}`}
    >
      {/* Treść karty umieszczona stabilnie pod poświatą */}
      <div className="relative z-10">{children}</div>

      {/* 
        Warstwa podświetlenia podążająca za myszką. 
        Dzięki z-20 i mix-blend-screen poświata nakłada się na elementy od góry, 
        a pointer-events-none gwarantuje, że nie blokuje ona kliknięć ani zaznaczania tekstu.
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
};