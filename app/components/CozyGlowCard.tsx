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
      className={`relative overflow-hidden rounded-2xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-300 hover:border-amber-500/20 hover:shadow-lg ${className}`}
    >
      {/* Warstwa podświetlenia podążająca za myszką */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${coords.x}px ${coords.y}px, rgba(245, 158, 11, 0.05), transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};