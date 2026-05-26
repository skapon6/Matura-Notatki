"use client";

import Link from "next/link";

export default function PrywatnoscPage() {
  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-8 shadow-xl mt-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/60 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <h1 className="text-2xl font-bold font-serif text-stone-100">Polityka Prywatności</h1>
          </div>
          <Link 
            href="/" 
            className="text-xs px-3.5 py-1.5 rounded-xl border border-[#c68a4c]/30 bg-stone-900/60 text-stone-400 hover:text-stone-100 hover:border-amber-700 transition-all"
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-stone-400 leading-relaxed">
          <p className="italic">Ostatnia aktualizacja: 26 maja 2026 r.</p>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">1. Informacje ogólne</h2>
            <p>
              Dbamy o bezpieczeństwo Twoich danych. Niniejszy dokument wyjaśnia, jakie informacje gromadzimy, w jakim celu oraz jak je zabezpieczamy. Korzystając z serwisu, akceptujesz poniższe zasady.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">2. Jakie dane przetwarzamy?</h2>
            <p>
              Przetwarzamy wyłącznie dane niezbędne do prawidłowego świadczenia usług: adres e-mail (do rejestracji i logowania przy użyciu Supabase) oraz dane związane z realizacją płatności (przekazywane bezpośrednio do Stripe).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">3. Pliki Cookies</h2>
            <p>
              Nasza strona korzysta z minimalnej ilości ciasteczek (cookies) potrzebnych do utrzymania sesji zalogowanego użytkownika oraz celów statystycznych.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">4. Prawa użytkownika</h2>
            <p>
              Masz pełne prawo do wglądu w swoje dane, ich modyfikacji, przeniesienia, a także żądania ich całkowitego usunięcia z naszej bazy danych w dowolnym momencie.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}