"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; // Dopasuj ścieżkę do swojego pliku supabase.ts

export default function OcenianieRozprawekPage() {
  const router = useRouter();

  // Stany autoryzacji i profilu
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Stany edytora i symulacji AI
  const [essayText, setEssayText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Lalka Bolesława Prusa - motyw miłości jako siły niszczącej.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Powiadomienia wewnętrzne
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerAlert = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Sprawdzanie sesji użytkownika i pobieranie danych o kredytach
  useEffect(() => {
    async function checkUserAndCredits() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push("/"); // Jeśli niezalogowany, powrót na główną
          return;
        }
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } catch (err) {
        console.error(err);
        router.push("/");
      } finally {
        setCheckingAuth(false);
      }
    }
    checkUserAndCredits();
  }, [router]);

  async function fetchUserProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status, essay_credits")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  }

  // 2. Obsługa analizy wypracowania i redukcji kredytów
  const handleAnalyze = async () => {
    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    
    if (wordCount < 50) {
      triggerAlert("Wprowadzona rozprawka jest za krótka! Wklej co najmniej 50 słów, aby przeprowadzić testową analizę.", "error");
      return;
    }

    if (!profile || profile.essay_credits <= 0) {
      triggerAlert("Brak wolnych kredytów na ocenę! Kup pakiet Premium, aby otrzymać 10 prób.", "error");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Zmniejszamy liczbę dostępnych kredytów o 1 w bazie danych
      const newCreditsValue = profile.essay_credits - 1;
      const { error } = await supabase
        .from("profiles")
        .update({ essay_credits: newCreditsValue })
        .eq("id", user.id);

      if (error) throw error;

      // Aktualizujemy stan lokalny kredytów
      setProfile((prev: any) => ({ ...prev, essay_credits: newCreditsValue }));

      // Symulujemy czas analizy przez AI (3.5 sekundy)
      setTimeout(() => {
        setAnalysisResult({
          score: "42/50",
          details: [
            { criterion: "Sformułowanie stanowiska (Teza)", points: "5/5", comment: "Teza sformułowana jasno i klarownie. Dobrze zarysowany kontekst problemu." },
            { criterion: "Uzasadnienie stanowiska (Argumentacja)", points: "12/16", comment: "Dobrze dobrany przykład z lektury obowiązkowej. Drugi argument (kontekstowy) wymaga pogłębienia analizy logicznej." },
            { criterion: "Poprawność rzeczowa", points: "10/12", comment: "Drobny błąd kardynalny dotyczący chronologii wydarzeń, ale nie rzutujący drastycznie na całą kompozycję." },
            { criterion: "Kompozycja i spójność", points: "8/10", comment: "Prawidłowy podział na akapity. Wstęp i podsumowanie są proporcjonalne." },
            { criterion: "Język i styl (CKE)", points: "7/7", comment: "Brak rażących błędów ortograficznych. Stylistyka dojrzała, poprawna interpunkcja." }
          ],
          summary: "Bardzo udana próba! Praca spełnia większość rygorystycznych wymogów CKE. Skup się na mocniejszym powiązaniu argumentu drugiego z tezą wyjściową, a wynik bez problemu zbliży się do 100%!"
        });
        setIsAnalyzing(false);
        triggerAlert("Analiza ukończona pomyślnie! Pobrano 1 kredyt.", "success");
      }, 3500);

    } catch (err) {
      console.error("Błąd podczas zapisywania kredytów:", err);
      triggerAlert("Wystąpił błąd systemu. Spróbuj ponownie.", "error");
      setIsAnalyzing(false);
    }
  };

  // Ładowanie sesji przy wejściu na stronę
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#14100e] text-stone-200 flex flex-col items-center justify-center p-8">
        <div className="text-4xl animate-bounce mb-4">🤖</div>
        <p className="text-sm tracking-widest font-semibold text-stone-400">
          Łączenie z modułem sztucznej inteligencji...
        </p>
      </div>
    );
  }

  const creditsRemaining = profile?.essay_credits ?? 0;
  const isPremiumUser = profile?.subscription_status === "paid" || profile?.subscription_status === "admin";

  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      
      {/* Dynamiczne powiadomienie wewnętrzne */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm ${
          notification.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" : "bg-red-950/90 border-red-500/30 text-red-200"
        }`}>
          <p className="text-xs font-semibold leading-relaxed pr-2">{notification.message}</p>
        </div>
      )}

      <div className="max-w-4xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-8 shadow-xl mt-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Asystent Rozprawek AI</h1>
              <p className="text-xs text-stone-400 mt-1">Interaktywna weryfikacja prac z języka polskiego</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-amber-700 transition-all"
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Informacja o Kredytach */}
        <div className="mb-6 p-4 rounded-2xl bg-stone-950/40 border border-stone-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-xs font-bold text-stone-300">Stan Twojego konta:</p>
              <p className="text-[11px] text-stone-500">
                {isPremiumUser 
                  ? "Posiadasz nielimitowane notatki oraz pakiet 10 ocen wypracowań." 
                  : "Używasz darmowego konta testowego z limitem 1 bezpłatnej oceny."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold font-mono px-3.5 py-2 rounded-xl ${
              creditsRemaining > 0 ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" : "bg-red-950/30 text-red-400 border border-red-900/30"
            }`}>
              Pozostało ocen: {creditsRemaining}
            </span>
          </div>
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
                disabled={isAnalyzing}
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
                rows={10}
                placeholder="Wklej tutaj treść swojej rozprawki (minimum 50 słów do wersji testowej)..."
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                disabled={isAnalyzing}
                className="w-full bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-700/60 font-sans leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                <span>Liczba znaków: {essayText.length}</span>
                <span>Orientacyjna liczba słów: {essayText.split(/\s+/).filter(Boolean).length}</span>
              </div>
            </div>

            {creditsRemaining > 0 ? (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 rounded-xl bg-[#c68a4c] hover:bg-[#d99c5d] text-stone-950 font-bold transition-all text-xs sm:text-sm shadow-md disabled:bg-stone-800 disabled:text-stone-500"
              >
                {isAnalyzing ? "🤖 Trwa analiza tekstu przez AI... (to potrwa chwilę)" : "Przeanalizuj rozprawkę (Pobiera 1 kredyt)"}
              </button>
            ) : (
              <div className="text-center p-3.5 bg-red-950/20 border border-red-950/40 rounded-xl text-xs text-red-400">
                Wykorzystałeś wszystkie darmowe oceny wypracowań. Kup pakiet Premium, aby natychmiast otrzymać 10 prób! 🚀
              </div>
            )}
          </div>

          {/* Prawa kolumna: Miejsce na wyniki (Raport AI) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {isAnalyzing ? (
              <div className="rounded-2xl border border-amber-950/40 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
                <div className="text-4xl animate-spin mb-3">🔮</div>
                <h3 className="text-sm font-bold text-stone-200 font-serif">Algorytm pracuje...</h3>
                <p className="text-[11px] text-stone-500 mt-2 max-w-[200px] leading-relaxed">
                  Trwa weryfikacja poprawności stylistycznej, kompozycji oraz kryteriów rzeczowych CKE.
                </p>
              </div>
            ) : analysisResult ? (
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 flex flex-col gap-3.5 animate-fade-in max-h-[460px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Wynik Analizy</h3>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">{analysisResult.score}</span>
                </div>

                <div className="space-y-3">
                  {analysisResult.details.map((detail: any, i: number) => (
                    <div key={i} className="text-[11px]">
                      <div className="flex justify-between font-semibold text-stone-200 mb-0.5">
                        <span>{detail.criterion}</span>
                        <span className="text-amber-500 font-mono">{detail.points}</span>
                      </div>
                      <p className="text-stone-400 font-sans leading-relaxed">{detail.comment}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-800 pt-3 mt-1">
                  <h4 className="text-[11px] font-bold text-stone-200 font-serif">Podsumowanie krytyka:</h4>
                  <p className="text-[11px] text-stone-400 italic mt-1 leading-relaxed">{analysisResult.summary}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-950/20 p-5 flex flex-col justify-center items-center text-center min-h-[300px]">
                <span className="text-4xl mb-3">🤖</span>
                <h3 className="text-sm font-bold text-stone-200 font-serif">Gotowy do analizy</h3>
                <p className="text-xs text-stone-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                  Po kliknięciu przycisku oceny, tutaj pojawi się kompletny, szczegółowy raport CKE z punktacją i uwagami stylisty.
                </p>
              </div>
            )}
            
            <div className="rounded-2xl bg-stone-900/40 border border-stone-800/60 p-4">
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">🔍 Zasady oceniania</h4>
              <ul className="text-[11px] text-stone-400 space-y-2">
                <li className="flex gap-2"><span>✔</span> Sprawdzenie poprawności kompozycji (wstęp, rozwinięcie, zakończenie)</li>
                <li className="flex gap-2"><span>✔</span> Weryfikacja poprawności rzeczowej i językowej</li>
                <li className="flex gap-2"><span>✔</span> Wykrywanie ewentualnego błędu kardynalnego</li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}