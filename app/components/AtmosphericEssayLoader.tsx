// app/components/AtmosphericEssayLoader.tsx
"use client";

import React, { useState, useEffect } from "react";

export function AtmosphericEssayLoader() {
  const [step, setStep] = useState(0);

  // Klimatyczne teksty, które zmieniają się podczas analizy
  const loadingSteps = [
    "Zaparzanie świeżej herbaty i rozgrzewanie maszyn AI...",
    "Egzaminator CKE zakłada okulary i otwiera Twoje wypracowanie...",
    "Analizowanie bogactwa leksykalnego i struktur składniowych...",
    "Weryfikacja tekstu pod kątem błędów rzeczowych i kardynalnych...",
    "Konstruowanie sprawiedliwej i pomocnej informacji zwrotnej..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingSteps.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px] relative select-none">
      
      {/* WSTRZYKNIĘCIE NIEZBĘDNYCH ANIMACJI CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.15); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse-slow {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes particle-rise {
          0% { transform: translateY(30px) scale(0.8); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-100px) scale(0.4); opacity: 0; }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse-slow { animation: spin-reverse-slow 25s linear infinite; }
      `}} />

      {/* CENTRALNY ELEMENT ANIMACJI */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        
        {/* Ciepła, pulsująca poświata w tle */}
        <div className="absolute inset-4 bg-amber-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute inset-8 bg-orange-600/5 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

        {/* Powolne, kręcące się pierścienie */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/10 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full border border-dotted border-orange-500/20 animate-spin-reverse-slow" />

        {/* Pływająca, świecąca księga (SVG) */}
        <div className="absolute z-10 animate-float flex items-center justify-center text-amber-500/80 hover:text-amber-400 transition-colors">
          <svg className="w-20 h-24 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            {/* Kontury otwartej księgi */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.967 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            {/* Delikatne linie tekstu na stronach */}
            <path strokeLinecap="round" d="M5 8h4M5 11h3M5 14h4M15 8h4M16 11h3M15 14h3" strokeWidth="1" strokeOpacity="0.5" />
          </svg>
        </div>

        {/* Unoszące się magiczne cząsteczki kurzu/iskier */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'particle-rise 4s ease-in-out infinite', left: '25%', bottom: '20px', animationDelay: '0.2s' }} />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animation: 'particle-rise 5s ease-in-out infinite', left: '45%', bottom: '20px', animationDelay: '1.8s' }} />
          <span className="absolute w-1 h-1 rounded-full bg-amber-500" style={{ animation: 'particle-rise 3.5s ease-in-out infinite', left: '65%', bottom: '20px', animationDelay: '0.9s' }} />
          <span className="absolute w-2 h-2 rounded-full bg-amber-300" style={{ animation: 'particle-rise 6s ease-in-out infinite', left: '35%', bottom: '20px', animationDelay: '2.5s' }} />
          <span className="absolute w-1 h-1 rounded-full bg-orange-500" style={{ animation: 'particle-rise 4.2s ease-in-out infinite', left: '55%', bottom: '20px', animationDelay: '1.1s' }} />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/60" style={{ animation: 'particle-rise 4.8s ease-in-out infinite', left: '75%', bottom: '20px', animationDelay: '3.2s' }} />
        </div>

      </div>

      {/* PASEK PROGRESU I TEKST */}
      <div className="text-center max-w-sm z-10">
        <p className="text-sm font-serif font-bold text-stone-100 tracking-wide mb-2 animate-pulse">
          Trwa analiza wypracowania...
        </p>
        <p className="text-xs text-stone-400 min-h-[32px] leading-relaxed transition-all duration-500">
          {loadingSteps[step]}
        </p>
      </div>

    </div>
  );
}