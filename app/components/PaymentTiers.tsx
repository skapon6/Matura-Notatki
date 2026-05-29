// app/components/PaymentTiers.tsx
"use client";

import React from "react";

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
      period: "Na rok", // Zmieniono z "Na zawsze" [1]
      price: "89 zł",
      tokens: "15 tokenów do rozprawek i ustnej", // Zmieniono z "10 tokenów" [1]
      days: "Dostęp na 365 dni", // Zmieniono z "Dostęp dożywotni" [1]
      desc: "Kompleksowy zestaw roczny do nauki przed egzaminem.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 w-full text-left relative z-10">
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
            disabled={paymentLoading}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              plan.popular
                ? "bg-amber-500 hover:bg-amber-400 text-stone-950"
                : "bg-stone-800 hover:bg-stone-700 text-stone-200"
            } disabled:opacity-50`}
          >
            {paymentLoading && activePaymentTier === plan.id 
              ? "Przetwarzanie..." 
              : `Wybierz ${plan.name}`}
          </button>
        </div>
      ))}
    </div>
  );
};