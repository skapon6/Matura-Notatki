// app/kontakt/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getThemeClasses, CozyTheme } from "../lib/theme"; // 2 poziomy w górę do lib
import { playSound } from "../lib/sounds"; // 2 poziomy w górę do lib

export default function KontaktPage() {
  // 1. Lokalne zarządzanie motywem (bezinwazyjne, wczytywane na starcie)
  const [cozyTheme, setCozyTheme] = useState<CozyTheme>("library");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as CozyTheme;
    if (savedTheme) {
      setCozyTheme(savedTheme);
    }
  }, []);

  const currentTheme = getThemeClasses(cozyTheme);

  // 2. Stany formularza kontaktowego
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    playSound("click");

    // Symulacja wysyłania wiadomości (trwa 1.5 sekundy dla realizmu i świetnego UX)
    setTimeout(() => {
      setSending(false);
      setSuccess(true);
      playSound("success");

      // Resetowanie pól formularza
      setEmail("");
      setSubject("");
      setMessage("");

      // Ukrycie komunikatu sukcesu po 5 sekundach
      setTimeout(() => setSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.bg} text-stone-200 font-sans p-6 sm:p-8 items-center transition-colors duration-500`}>
      <div className={`max-w-4xl w-full ${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl p-6 sm:p-10 shadow-xl mt-8 flex flex-col gap-8 transition-colors duration-500`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Kontakt z Nami</h1>
            <p className="text-xs text-stone-400 mt-1">Masz pytania lub sugestie? Napisz bezpośrednio do kącika</p>
          </div>
          <Link 
            href="/" 
            onClick={() => playSound("click")}
            className={`self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:scale-105 active:scale-95 transition-all`}
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Dwukolumnowy układ (Formularz + Dane/Sociale) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Lewa kolumna: Formularz kontaktowy */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-widest text-[#c68a4c] font-bold px-1 font-serif">
              Napisz do nas wiadomość ✉️
            </h3>

            {success && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-xs leading-relaxed animate-slide-in">
                🎉 <strong>Wiadomość wysłana!</strong> Dziękujemy za kontakt. Odpowiemy na Twój e-mail najszybciej jak to możliwe (zazwyczaj w ciągu 24 godzin).
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-wider px-1">Twój adres e-mail:</label>
                <input
                  type="email"
                  placeholder="np. uczen@szkola.pl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={sending}
                  className="w-full bg-stone-950/80 border border-stone-800/80 rounded-xl py-2.5 px-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-wider px-1">Temat wiadomości:</label>
                <input
                  type="text"
                  placeholder="np. Pytanie o pakiet Premium / sugestia do notatki"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={sending}
                  className="w-full bg-stone-950/80 border border-stone-800/80 rounded-xl py-2.5 px-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-wider px-1">Treść Twojej wiadomości:</label>
                <textarea
                  placeholder="Wpisz tutaj treść swojej wiadomości..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={sending}
                  rows={6}
                  className="w-full bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 leading-relaxed font-sans disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "⏳ Wysyłanie wiadomości..." : "Wyślij wiadomość do kącika ✉️"}
              </button>
            </form>
          </div>

          {/* Prawa kolumna: Bezpośrednie dane + Sociale */}
          <div className="md:col-span-5 flex flex-col gap-6 justify-between border-t md:border-t-0 md:border-l border-stone-800/50 pt-6 md:pt-0 md:pl-8">
            
            {/* Bezpośredni mail */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-bold px-1">
                Bezpośredni Kontakt
              </h3>
              <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 flex flex-col gap-1">
                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Adres e-mail:</span>
                <a 
                  href="mailto:wiedzaszytanamiare@gmail.com" 
                  onClick={() => playSound("click")}
                  className="text-xs sm:text-sm font-bold font-mono text-[#c68a4c] hover:text-[#d99c5d] transition-colors"
                >
                  wiedzaszytanamiare@gmail.com
                </a>
              </div>
            </div>

            {/* Social media */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-bold px-1">
                Nasze Media Społecznościowe
              </h3>
              <div className="flex flex-col gap-3">
                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@wiedza_szyta_na_miare" 
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playSound("click")}
                  className={`p-4 rounded-2xl bg-stone-950/40 border ${currentTheme.cardBorder} hover:border-amber-500/20 hover:bg-[#1f1915]/40 transition-all flex items-center gap-4 group`}
                >
                  <span className="text-2xl">📱</span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-stone-200 group-hover:text-amber-400 transition-colors">TikTok</span>
                    <span className="text-[10px] text-stone-500">@wiedza_szyta_na_miare</span>
                  </div>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/wiedza_szyta_na_miare" 
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playSound("click")}
                  className={`p-4 rounded-2xl bg-stone-950/40 border ${currentTheme.cardBorder} hover:border-amber-500/20 hover:bg-[#1f1915]/40 transition-all flex items-center gap-4 group`}
                >
                  <span className="text-2xl">📸</span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-stone-200 group-hover:text-amber-400 transition-colors">Instagram</span>
                    <span className="text-[10px] text-stone-500">@wiedza_szyta_na_miare</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Informacja na dole */}
            <div className="p-4 rounded-2xl bg-stone-900/20 text-[10px] text-stone-500 italic leading-relaxed text-left border border-stone-900/60">
              „Masz pomysł na nową funkcję, zauważyłeś literówkę w notatce z Baroku lub potrzebujesz faktury za pakiet Premium? Napisz śmiało, odpisujemy każdemu!”
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}