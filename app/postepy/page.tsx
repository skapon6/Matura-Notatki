"use client";

import Link from "next/link";

export default function PostepyPage() {
  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-8 shadow-xl mt-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/60 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h1 className="text-xl font-bold font-serif text-stone-100">Moje Postępy</h1>
              <p className="text-xs text-stone-400 mt-1">Śledź swój proces maturalny krok po kroku</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="text-xs px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-amber-700 transition-all"
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Statystyki ogólne (Karty) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-stone-900/50 border border-stone-800 p-4 rounded-xl text-center">
            <span className="text-2xl">📚</span>
            <p className="text-lg font-bold text-stone-100 mt-2">12 / 24</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Opanowane Lektury</p>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 p-4 rounded-xl text-center">
            <span className="text-2xl">⏱️</span>
            <p className="text-lg font-bold text-stone-100 mt-2">14.5 godz.</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Czas z Pomodoro</p>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 p-4 rounded-xl text-center">
            <span className="text-2xl">✍️</span>
            <p className="text-lg font-bold text-stone-100 mt-2">4</p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Ocenione Rozprawki</p>
          </div>
        </div>

        {/* Sekcja postępu epok */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-2">Postęp Opanowania Epok</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-300">Starożytność i Średniowiecze</span>
                <span className="text-stone-400">100%</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: "100%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-300">Renesans, Barok i Oświecenie</span>
                <span className="text-stone-400">75%</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full" style={{ width: "75%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-300">Romantyzm i Pozytywizm (Lektury kluczowe)</span>
                <span className="text-stone-400">40%</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full" style={{ width: "40%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-300">Współczesność</span>
                <span className="text-stone-400">0%</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                <div className="bg-stone-800 h-full rounded-full" style={{ width: "0%" }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}