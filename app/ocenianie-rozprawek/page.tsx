"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function OcenianieRozprawekPage() {
  const [essayText, setEssayText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Lalka Bolesława Prusa - motyw miłości jako siły niszczącej.");

  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-8 shadow-xl mt-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Asystent Rozprawek AI</h1>
              <p className="text-xs text-stone-400 mt-1">Ocena pracy zgodnie z kryteriami CKE 2026</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-amber-700 transition-all"
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Lewa kolumna: Edytor */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-amber-500 font-semibold block mb-2">
                Wybierz lub wpisz temat rozprawki
              </label>
              <select 
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 px-3 text-xs sm:text-sm text-stone-300 focus:outline-none focus:border-amber-700/60"
              >
                <option>Lalka Bolesława Prusa - motyw miłości jako siły niszczącej.</option>
                <option>Praca jako pasja i przekleństwo w oparciu o wybrane lektury.</option>
                <option>Własny temat (wpisz poniżej)</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-amber-500 font-semibold block mb-2">
                Treść Twojego wypracowania
              </label>
              <textarea
                rows={12}
                placeholder="Wklej tutaj treść swojej rozprawki (minimum 300 słów)..."
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                className="w-full bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/60 font-sans leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                <span>Liczba znaków: {essayText.length}</span>
                <span>Orientacyjna liczba słów: {essayText.split(/\s+/).filter(Boolean).length}</span>
              </div>
            </div>

            <button
              onClick={() => alert("Trwają prace nad integracją modelu AI. Wkrótce Twoja rozprawka zostanie oceniona w kilkanaście sekund! ☕")}
              className="w-full py-3 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold transition-all text-xs sm:text-sm shadow-md"
            >
              Przeanalizuj rozprawkę (Kryteria CKE 2026)
            </button>
          </div>

          {/* Prawa kolumna: Miejsce na wyniki (Podgląd) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
              <span className="text-4xl mb-3">🤖</span>
              <h3 className="text-sm font-bold text-stone-200 font-serif">Oczekiwanie na tekst</h3>
              <p className="text-xs text-stone-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                Po kliknięciu przycisku oceny, tutaj pojawi się szczegółowy raport z punktacją za kompozycję, argumentację i język.
              </p>
            </div>
            
            <div className="rounded-2xl bg-stone-900/40 border border-stone-800/60 p-4">
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">🔍 Na co zwracamy uwagę?</h4>
              <ul className="text-[11px] text-stone-400 space-y-2">
                <li className="flex gap-2"><span>✔</span> Sformułowanie stanowiska / tezy</li>
                <li className="flex gap-2"><span>✔</span> Poprawność rzeczowa (tzw. kardynały)</li>
                <li className="flex gap-2"><span>✔</span> Spójność i podział na akapity</li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}