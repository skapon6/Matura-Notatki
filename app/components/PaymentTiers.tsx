"use client";

import React from "react";

interface PaymentTiersProps {
  paymentLoading: boolean;
  activePaymentTier: string | null;
  handlePaymentInit: (tier: "mini" | "medium" | "premium") => void;
}

export const PaymentTiers: React.FC<PaymentTiersProps> = ({
  paymentLoading,
  activePaymentTier,
  handlePaymentInit,
}) => {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
      {/* Pakiet MINI */}
      <div className="bg-stone-900/60 border border-stone-800/80 p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">MINI</span>
            <span className="text-stone-400 text-xs">1 miesiąc</span>
          </div>
          <p className="text-lg font-bold text-stone-100 mt-2">29 zł</p>
          <ul className="text-[11px] text-stone-400 mt-3 space-y-1.5">
            <li>📚 Pełna baza wiedzy i notatek</li>
            <li>✍️ <strong>5 tokenów</strong> do rozprawki</li>
            <li>⚡ Dostęp na 30 dni</li>
          </ul>
        </div>
        <button
          onClick={() => handlePaymentInit('mini')}
          disabled={paymentLoading}
          className="w-full mt-4 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-750 text-stone-200 transition-all active:scale-98 disabled:opacity-50"
        >
          {activePaymentTier === 'mini' ? "Ładowanie..." : "Wybierz Mini"}
        </button>
      </div>

      {/* Pakiet MEDIUM */}
      <div className="bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-amber-500 text-stone-950 text-[9px] font-bold px-2 py-0.5 rounded-bl">POLECANY</div>
        <div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">MEDIUM</span>
            <span className="text-stone-400 text-xs">3 miesiące</span>
          </div>
          <p className="text-lg font-bold text-stone-100 mt-2">59 zł</p>
          <ul className="text-[11px] text-stone-400 mt-3 space-y-1.5">
            <li>📚 Pełna baza wiedzy i notatek</li>
            <li>✍️ <strong>10 tokenów</strong> do rozprawki</li>
            <li>⚡ Dostęp na 90 dni</li>
          </ul>
        </div>
        <button
          onClick={() => handlePaymentInit('medium')}
          disabled={paymentLoading}
          className="w-full mt-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 transition-all active:scale-98 disabled:opacity-50"
        >
          {activePaymentTier === 'medium' ? "Ładowanie..." : "Wybierz Medium"}
        </button>
      </div>

      {/* Pakiet PREMIUM */}
      <div className="bg-purple-950/20 border border-purple-900/40 p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">PREMIUM</span>
            <span className="text-stone-400 text-xs">Na zawsze</span>
          </div>
          <p className="text-lg font-bold text-stone-100 mt-2">89 zł</p>
          <ul className="text-[11px] text-stone-400 mt-3 space-y-1.5">
            <li>📚 Pełna baza wiedzy i notatek</li>
            <li>✍️ <strong>10 tokenów</strong> do rozprawki</li>
            <li>♾️ Dostęp <strong>dożywotni</strong></li>
          </ul>
        </div>
        <button
          onClick={() => handlePaymentInit('premium')}
          disabled={paymentLoading}
          className="w-full mt-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-98 disabled:opacity-50"
        >
          {activePaymentTier === 'premium' ? "Ładowanie..." : "Wybierz Premium"}
        </button>
      </div>
    </div>
  );
};