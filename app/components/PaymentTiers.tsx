// app/components/PaymentTiers.tsx
"use client";

import React, { useState } from "react";

interface PaymentTiersProps {
  paymentLoading: boolean;
  activePaymentTier: string | null;
  handlePaymentInit: (tier: 'mini' | 'medium' | 'premium') => void;
}

export const PaymentTiers: React.FC<PaymentTiersProps> = ({
  paymentLoading,
  activePaymentTier,
  handlePaymentInit,
}) => {
  // Stan obowiązkowej zgody konsumenckiej (UOKiK)
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  const plans = [
    {
      id: "mini" as const,
      name: "MINI",
      period: "1 miesiąc",
      price: "29 zł",
      tokens: "5 tokenów do rozprawek i ustnej",
      days: "Dostęp na 30 dni",
      desc: "Podstawowy pakiet do szybkiej powtórki.",
    },
    {
      id: "medium" as const,
      name: "MEDIUM",
      period: "3 miesiące",
      price: "59 zł",
      tokens: "10 tokenów do rozprawek i ustnej",
      days: "Dostęp na 90 dni",
      desc: "Złoty środek dla systematycznych uczniów. Najpopularniejszy!",
      popular: true,
    },
    {
      id: "premium" as const,
      name: "PREMIUM",
      period: "Na rok",
      price: "89 zł",
      tokens: "20 tokenów do rozprawek i ustnej",
      days: "Dostęp na 365 dni",
      desc: "Kompleksowy zestaw roczny do nauki przed egzaminem.",
    },
  ];

  return (
    <div className="flex flex-col w-full mt-6">
      
      {/* Obowiązkowa zgoda na natychmiastowe dostarczenie treści cyfrowych (Wymóg UOKiK) */}
      <div className="flex items-start gap-3 bg-stone-950/40 border border-stone-800/80 p-4 rounded-2xl w-full max-w-xl mx-auto mb-4 text-left animate-slide-in select-none">
        <input
          type="checkbox"
          id="uokikConsent"
          checked={isConsentChecked}
          onChange={(e) => setIsConsentChecked(e.target.checked)}
          className="w-4 h-4 rounded border-stone-800 text-amber-500 focus:ring-amber-500 bg-stone-950 cursor-pointer accent-[#c68a4c] mt-0.5 shrink-0"
        />
        <label htmlFor="uokikConsent" className="text-[10px] sm:text-[11px] text-stone-400 cursor-pointer select-none leading-relaxed">
          Wyrażam zgodę na natychmiastowe rozpoczęcie świadczenia usługi cyfrowej (dostarczenie tokenów i aktywacja konta) i przyjmuję do wiadomości, że z chwilą ich aktywacji tracę prawo do odstąpienia od umowy zgodnie z art. 38 pkt 13 ustawy o prawach konsumenta.
        </label>
      </div>

      {/* Siatka pakietów płatności */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left relative z-10">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${
              plan.popular
                ? "border-amber-500 bg-amber-500/5 shadow-md"
                : "border-stone-850 bg-stone-900/40 hover:bg-stone-900/60"
            }`}
          >
            {plan.popular && (
              <span className="absolute top-2.5 right-2.5 text-[8px] uppercase tracking-widest bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded-full select-none">
                POLECANY
              </span>
            )}
            
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold tracking-wider text-stone-200">{plan.name}</span>
                <span className="text-[10px] text-stone-500">{plan.period}</span>
              </div>
              <div className="text-xl font-bold font-serif text-stone-100 mt-1 mb-2">{plan.price}</div>
              <p className="text-[11px] text-stone-400 mb-4 leading-relaxed">{plan.desc}</p>
              
              <ul className="text-[11px] text-stone-400 space-y-2.5 mb-6 border-t border-stone-800/40 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-amber-500">✔</span> Pełna baza wiedzy i notatek
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-500">✔</span> {plan.tokens}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-500">✔</span> {plan.days}
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePaymentInit(plan.id)}
              disabled={paymentLoading || !isConsentChecked} // Blokada przycisku dopóki brak zgody
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                plan.popular
                  ? "bg-amber-500 hover:bg-amber-400 text-stone-950"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-200"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {paymentLoading && activePaymentTier === plan.id 
                ? "Przetwarzanie..." 
                : !isConsentChecked 
                  ? "Zaznacz zgodę u góry" // Komunikat zachęcający do zaznaczenia
                  : `Wybierz ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};