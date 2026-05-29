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
  let glowColor = "rgba(245, 158, 11, 0.05)"; // Domyślny bursztynowy dla Biblioteki (library)
  let hoverBorderClass = "hover:border-amber-500/20"; // Domyślna bursztynowa ramka dla Biblioteki
  
  const cardBgClasses = currentTheme?.cardBg || "";
  
  // Jeśli klasy tła karty wskazują na Deszczowy Dzień (grafit/błękit)
  if (cardBgClasses.includes("151c24") || cardBgClasses.includes("121820")) {
    glowColor = "rgba(14, 165, 233, 0.07)"; // Niebiesko-cyjanowy spotlight
    hoverBorderClass = "hover:border-sky-500/30"; // Chłodna ramka dla deszczu
  } 
  // Jeśli klasy tła karty wskazują na Ciepły Kominek (burgund/czerwień)
  else if (cardBgClasses.includes("251515") || cardBgClasses.includes("211111")) {
    glowColor = "rgba(239, 68, 68, 0.07)"; // Ciepły czerwono-burgundowy spotlight
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
      {/* Warstwa podświetlenia podążająca za myszką (z dynamicznym kolorem glowColor) */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};