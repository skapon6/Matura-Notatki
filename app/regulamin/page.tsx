"use client";

import Link from "next/link";

export default function RegulaminPage() {
  return (
    <div className="min-h-screen bg-[#14100e] text-stone-200 font-sans p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-8 shadow-xl mt-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/60 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📜</span>
            <h1 className="text-2xl font-bold font-serif text-stone-100">Regulamin Serwisu</h1>
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
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">§ 1. Postanowienia ogólne</h2>
            <p>
              Niniejszy regulamin określa zasady korzystania z platformy edukacyjnej „Wiedza Szyta na Miarę”, stworzonej z myślą o bezstresowym przygotowaniu do egzaminu maturalnego z języka polskiego.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">§ 2. Dostęp do treści i Konto Użytkownika</h2>
            <p>
              Użytkownik może korzystać z darmowych materiałów (oznaczonych jako bezpłatne) lub wykupić jednorazowy dostęp Premium, który odblokowuje pełną bazę wiedzy, analizy lektur oraz dodatkowe moduły pomocnicze.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">§ 3. Płatności i Reklamacje</h2>
            <p>
              Wszystkie płatności realizowane są bezpiecznie za pośrednictwem operatora płatności Stripe. Dostęp do treści Premium aktywowany jest natychmiast po potwierdzeniu transakcji przez system płatniczy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold font-serif text-stone-100 mb-2">§ 4. Prawa autorskie</h2>
            <p>
              Wszystkie notatki, opracowania oraz struktury logiczne są chronione prawem autorskim. Kopiowanie i redystrybucja materiałów bez zgody serwisu są zabronione.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}