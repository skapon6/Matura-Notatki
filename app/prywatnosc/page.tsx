// app/prywatnosc/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { getThemeClasses } from "../lib/theme";

export default function PolitykaPrywatnosciPage() {
  const currentTheme = getThemeClasses("library");

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.bg} text-stone-200 font-sans p-6 sm:p-8 items-center`}>
      <div className="max-w-3xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-10 shadow-xl mt-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Polityka Prywatności</h1>
            <p className="text-xs text-stone-400 mt-1">Zasady przetwarzania danych osobowych (RODO)</p>
          </div>
          <Link 
            href="/" 
            className={`self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border ${currentTheme.btnBorder} ${currentTheme.cardBg} ${currentTheme.subText} hover:text-stone-100 transition-all`}
          >
            ← Wróć do kącika
          </Link>
        </div>

        {/* Content */}
        <div className="text-xs sm:text-sm text-stone-300 space-y-6 leading-relaxed text-left font-sans">
          <p className="italic text-stone-400">
            Ostatnia aktualizacja: 29 maja 2026 r. Dbamy o Twoją prywatność. Poniższy dokument wyjaśnia, jak zbieramy, przetwarzamy i chronimy Twoje dane osobowe w ramach naszej platformy edukacyjnej.
          </p>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">1. Administrator Danych Osobowych</h3>
            <p>
              Administratorem Twoich danych osobowych jest właściciel platformy edukacyjnej: <strong className="text-stone-100">[Nazwa Twojej Firmy / Imię i Nazwisko]</strong> z siedzibą w: <strong className="text-stone-100">[Nazwa Miejscowości, Kraj]</strong>. W sprawach związanych z przetwarzaniem danych oraz realizacją Twoich praw możesz skontaktować się z nami pod adresem e-mail: <strong className="text-stone-100">[Twój Adres E-mail]</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">2. Zakres zbieranych danych</h3>
            <p>Zbieramy i przetwarzamy wyłącznie dane niezbędne do prawidłowego świadczenia usług edukacyjnych:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dane rejestracyjne (Supabase Auth):</strong> Twój adres e-mail oraz hasło (hasło jest szyfrowane i administrator nie ma do niego dostępu).</li>
              <li><strong>Dane profilu użytkownika:</strong> stan konta tokenów (essay_credits) oraz historia zapisanych notatek osobistych.</li>
              <li><strong>Dane płatności (Stripe):</strong> w przypadku zakupu tokenów, transakcję obsługuje zewnętrzny operator Stripe. Nie przechowujemy ani nie przetwarzamy danych Twoich kart płatniczych – trafiają one bezpośrednio do zabezpieczonego systemu Stripe.</li>
              <li><strong>Treści przesyłane do analizy (AI):</strong> wprowadzane tematy rozprawek, teksty wypracowań oraz nagrania/transkrypcje mowy w symulatorze matury ustnej.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">3. Cel i podstawa prawna przetwarzania danych</h3>
            <p>Twoje dane przetwarzamy w celu:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Świadczenia usług drogą elektroniczną, w tym obsługi konta i realizacji próbnych ocen CKE (Art. 6 ust. 1 lit. b RODO).</li>
              <li>Przetwarzania płatności za doładowania kredytów za pośrednictwem Stripe (Art. 6 ust. 1 lit. b RODO).</li>
              <li>Wypełnienia obowiązków prawnych, np. wystawiania faktur lub rachunków i prowadzenia sprawozdawczości finansowej (Art. 6 ust. 1 lit. c RODO).</li>
              <li>Prawie uzasadnionego interesu, jakim jest optymalizacja algorytmów wyszukiwania semantycznego (RAG) i poprawa stabilności oceniania (Art. 6 ust. 1 lit. f RODO).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">4. Udostępnianie danych i integracje AI</h3>
            <p>Dla prawidłowego działania platformy, Twoje dane mogą być przekazywane zaufanym podmiotom zewnętrznym:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase:</strong> dostawca bezpiecznej bazy danych oraz modułu autoryzacji użytkowników.</li>
              <li><strong>Stripe:</strong> operator płatności realizujący transakcje zakupu pakietów tokenów.</li>
              <li><strong>Google Generative AI (Gemini API):</strong> wysyłane przez Ciebie rozprawki oraz transkrypcje monologów są przesyłane do API Google w celu dokonania oceny merytorycznej. Dane te są przetwarzane zgodnie z polityką prywatności Google API Cloud – nie są wykorzystywane do trenowania publicznych modeli AI.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">5. Pliki Cookies (Ciasteczka)</h3>
            <p>
              Nasza strona wykorzystuje technologię Cookies oraz pamięć lokalną przeglądarki (Local Storage) głównie w celach technicznych – do bezpiecznego utrzymania sesji zalogowanego użytkownika (Supabase Session tokens) oraz zapamiętywania preferencji odtwarzacza muzyki Lo-Fi. Możesz w każdej chwili zablokować lub usunąć pliki cookies w ustawieniach swojej przeglądarki internetowej.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">6. Prawa użytkownika</h3>
            <p>Zgodnie z przepisami RODO, przysługuje Ci prawo do:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dostępu do swoich danych oraz otrzymania ich kopii.</li>
              <li>Sprostowania (poprawienia) swoich danych.</li>
              <li>Usunięcia danych („prawo do bycia zapomnianym”) – możesz usunąć konto w panelu lub napisać do nas.</li>
              <li>Ograniczenia przetwarzania danych.</li>
              <li>Wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO), jeśli uznasz, że przetwarzamy Twoje dane niezgodnie z prawem.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">7. Bezpieczeństwo i okres przechowywania</h3>
            <p>
              Dane rejestracyjne oraz historia Twoich ocen są przechowywane tak długo, jak długo posiadasz aktywne konto w serwisie. Po usunięciu konta, Twoje dane osobowe są trwale kasowane z bazy produkcyjnej. Wszystkie połączenia z naszą platformą oraz bazą danych są w pełni szyfrowane za pomocą protokołu SSL/TLS.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}