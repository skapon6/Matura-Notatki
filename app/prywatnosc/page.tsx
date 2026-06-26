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
            Ostatnia aktualizacja: 26 czerwca 2026 r. Dbamy o Twoją prywatność. Poniższy dokument wyjaśnia, jak zbieramy, przetwarzamy i chronimy Twoje dane osobowe w ramach naszej platformy edukacyjnej, zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO).
          </p>

          {/* 1 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">1. Administrator Danych Osobowych</h3>
            <p>
              Administratorem Twoich danych osobowych jest właściciel platformy edukacyjnej: <strong className="text-stone-100">Kacper Leś</strong>, zamieszkały pod adresem: <strong className="text-stone-100">39-206 Pustków-Osiedle</strong>, prowadzący działalność nierejestrowaną. W sprawach związanych z przetwarzaniem danych oraz realizacją Twoich praw możesz kontaktować się z nami pod adresem e-mail: <strong className="text-stone-100">wiedzaszytanamiare@kontakt.pl</strong>.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">2. Zakres Zbieranych Danych</h3>
            <p>Zbieramy i przetwarzamy wyłącznie dane niezbędne do prawidłowego świadczenia usług edukacyjnych:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dane rejestracyjne (Supabase Auth):</strong> adres e-mail oraz hasło (hasło jest szyfrowane i administrator nie ma do niego dostępu).</li>
              <li><strong>Dane profilu użytkownika:</strong> stan konta kredytów (essay_credits), rodzaj aktywnego pakietu oraz historia zapisanych notatek osobistych.</li>
              <li><strong>Dane płatności (Stripe):</strong> w przypadku zakupu kredytów lub pakietu, transakcję obsługuje zewnętrzny operator Stripe. Nie przechowujemy ani nie przetwarzamy danych Twoich kart płatniczych — trafiają one bezpośrednio do zabezpieczonego systemu Stripe.</li>
              <li><strong>Treści przesyłane do analizy AI:</strong> tematy rozprawek, teksty wypracowań oraz transkrypcje mowy (symulator matury ustnej) — przetwarzane wyłącznie w celu generowania oceny i niezwłocznie usuwane z pamięci operacyjnej modelu po zakończeniu sesji.</li>
              <li><strong>Dane techniczne:</strong> adres IP, typ przeglądarki, znaczniki czasu żądań — zbierane automatycznie na potrzeby bezpieczeństwa i diagnostyki technicznej.</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">3. Cel i Podstawa Prawna Przetwarzania Danych</h3>
            <p>Twoje dane przetwarzamy w następujących celach i na następujących podstawach prawnych:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Świadczenia usług drogą elektroniczną, obsługi konta i realizacji próbnych ocen CKE — <strong>art. 6 ust. 1 lit. b RODO</strong> (wykonanie umowy).</li>
              <li>Przetwarzania płatności za doładowania kredytów i zakup pakietów za pośrednictwem Stripe — <strong>art. 6 ust. 1 lit. b RODO</strong> (wykonanie umowy).</li>
              <li>Wypełnienia obowiązków prawnych, np. prowadzenia ewidencji sprzedaży i sprawozdawczości finansowej — <strong>art. 6 ust. 1 lit. c RODO</strong> (obowiązek prawny).</li>
              <li>Optymalizacji algorytmów wyszukiwania semantycznego (RAG) i poprawy stabilności oceniania — <strong>art. 6 ust. 1 lit. f RODO</strong> (prawnie uzasadniony interes administratora). W tym celu dane są poddawane agregacji i anonimizacji.</li>
              <li>Ochrony przed nadużyciami i zapewnienia bezpieczeństwa serwisu — <strong>art. 6 ust. 1 lit. f RODO</strong> (prawnie uzasadniony interes administratora).</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">4. Udostępnianie Danych i Integracje AI (Transfery poza EOG)</h3>
            <p>Dla prawidłowego działania platformy Twoje dane mogą być przekazywane zaufanym podmiotom zewnętrznym przetwarzającym je poza Europejskim Obszarem Gospodarczym (EOG):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase Inc. (USA):</strong> dostawca bezpiecznej bazy danych oraz modułu autoryzacji użytkowników. Przekazywanie danych odbywa się na podstawie decyzji Komisji Europejskiej o adekwatności (EU-US Data Privacy Framework) lub Standardowych Klauzul Umownych (SCC).</li>
              <li><strong>Stripe Inc. (USA):</strong> operator płatności realizujący transakcje zakupu pakietów i tokenów. Dane kart płatniczych nie trafiają na nasze serwery. Przetwarzanie odbywa się na podstawie programu certyfikacji EU-US Data Privacy Framework.</li>
              <li><strong>Google LLC (USA) — Gemini API:</strong> treści rozprawek oraz transkrypcje monologów są przesyłane do API Google wyłącznie w celu dokonania oceny merytorycznej. Dane są przetwarzane zgodnie z Google Cloud API Data Processing Addendum — <strong>nie są wykorzystywane przez Google do trenowania publicznych modeli AI</strong>. Przekazywanie danych odbywa się na podstawie programu certyfikacji EU-US Data Privacy Framework oraz SCC.</li>
            </ul>
            <p>
              Wszyscy powyżsi dostawcy działają jako podmioty przetwarzające dane w rozumieniu art. 28 RODO i są zobowiązani do przetwarzania Twoich danych wyłącznie zgodnie z naszymi instrukcjami oraz obowiązującymi przepisami prawa.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">5. Nagrania Głosowe i Symulator Matury Ustnej</h3>
            <p>
              Korzystanie z Symulatora Matury Ustnej i przetwarzanie Twoich nagrań mowy opiera się na Twojej <strong>wyraźnej i dobrowolnej zgodzie (Art. 9 ust. 2 lit. a RODO)</strong>, wyrażanej aktywnym działaniem poprzez udzielenie uprawnień do mikrofonu w przeglądarce przed rozpoczęciem testu.
            </p>
            <p>
              Nagranie jest automatycznie i natychmiastowo transkrybowane na tekst, a tekst transkrypcji (nie plik audio) jest przesyłany do Gemini API w celu dokonania oceny merytorycznej. Plik audio nie jest zapisywany ani przechowywany na żadnym z naszych serwerów. Tekst transkrypcji jest przechowywany wyłącznie przez czas trwania aktywnej sesji i usuwany po jej zakończeniu, chyba że zdecydujesz się zapisać wynik oceny w historii swojego profilu.
            </p>
            <p>
              Możesz wycofać zgodę na przetwarzanie nagrań w dowolnej chwili, odrzucając uprawnienia do mikrofonu w przeglądarce lub rezygnując z korzystania z modułu ustnego — nie wpłynie to na legalność wcześniejszego przetwarzania danych.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">6. Pliki Cookies (Ciasteczka) i Pamięć Lokalna</h3>
            <p>
              Nasza strona wykorzystuje technologię cookies oraz pamięć lokalną przeglądarki (Local Storage) wyłącznie w celach technicznych i funkcjonalnych:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cookies niezbędne (sesyjne):</strong> do bezpiecznego utrzymania sesji zalogowanego użytkownika (tokeny autoryzacyjne Supabase Auth). Bez nich bezpieczne zalogowanie i korzystanie z Serwisu nie jest możliwe.</li>
              <li><strong>Local Storage:</strong> zapamiętywanie Twoich osobistych preferencji interfejsu, takich jak odtwarzacz muzyki Lo-Fi, wybrany motyw graficzny platformy czy stan zwinięcia sekcji.</li>
            </ul>
            <p>
              Nie stosujemy cookies o charakterze reklamowym, śledzącym ani marketingowym. Możesz w każdej chwili zablokować lub usunąć pliki cookies w ustawieniach swojej przeglądarki internetowej, jednak może to uniemożliwić prawidłowe działanie kluczowych funkcji platformy.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">7. Profilowanie i Personalizacja</h3>
            <p>
              Serwis może automatycznie analizować Twoje postępy edukacyjne (np. otworzone notatki, wyniki quizów) w celu personalizacji wyświetlanych treści i rekomendacji. Takie działanie stanowi profilowanie w rozumieniu art. 4 pkt 4 RODO. Profilowanie to nie wywołuje wobec Ciebie żadnych skutków prawnych ani innych podobnie istotnych skutków — służy wyłącznie ułatwieniu nauki i poprawie Twojego doświadczenia w Serwisie. Masz prawo sprzeciwić się profilowaniu, kontaktując się z administratorem.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">8. Prawa Użytkownika</h3>
            <p>Zgodnie z przepisami RODO, przysługuje Ci prawo do:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dostępu</strong> do swoich danych oraz otrzymania ich kopii (art. 15 RODO).</li>
              <li><strong>Sprostowania</strong> nieprawidłowych danych (art. 16 RODO).</li>
              <li><strong>Usunięcia</strong> danych („prawo do bycia zapomnianym") — możesz usunąć konto samodzielnie w panelu ustawień lub pisząc do nas (art. 17 RODO).</li>
              <li><strong>Ograniczenia przetwarzania</strong> danych (art. 18 RODO).</li>
              <li><strong>Przenoszenia</strong> danych do innego administratora (art. 20 RODO).</li>
              <li><strong>Sprzeciwu</strong> wobec przetwarzania na podstawie prawnie uzasadnionego interesu (art. 21 RODO), w tym wobec profilowania.</li>
              <li><strong>Wycofania zgody</strong> w dowolnym momencie (dotyczy przetwarzania opartego na zgodzie, np. nagrań głosowych) — bez wpływu na legalność wcześniejszego przetwarzania.</li>
              <li><strong>Wniesienia skargi</strong> do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa, jeśli uznasz, że przetwarzamy Twoje dane niezgodnie z prawem.</li>
            </ul>
            <p>
              Aby skorzystać ze swoich praw, skontaktuj się z nami pod adresem: <strong className="text-stone-100">wiedzaszytanamiare@kontakt.pl</strong>. Odpowiemy na Twoje zgłoszenie bez zbędnej zwłoki, nie później niż w terminie 30 dni od jego otrzymania.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">9. Bezpieczeństwo i Okres Przechowywania Danych</h3>
            <p>Stosujemy następujące okresy przechowywania danych:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dane konta (e-mail, profil, historia ocen):</strong> przechowywane przez cały czas aktywności Twojego konta. Po usunięciu konta przez Użytkownika, dane są trwale usuwane z bazy produkcyjnej w ciągu 30 dni.</li>
              <li><strong>Treści rozprawek i monologów:</strong> przetwarzane w czasie rzeczywistym przez API AI i nietrwałe — nie są zapisywane jako oddzielne pliki. Wyniki ocen (punktacja, komentarz) są przechowywane w profilu użytkownika do czasu usunięcia konta lub manualnego usunięcia danej oceny z historii przez użytkownika.</li>
              <li><strong>Dane płatności (Stripe):</strong> dane transakcyjne są przechowywane przez Stripe przez okres wymagany polskimi przepisami prawa podatkowego (co do zasady 5 lat od końca roku podatkowego, w którym dokonano zakupu).</li>
              <li><strong>Dane techniczne (logi serwera):</strong> przechowywane przez maksymalnie 90 dni w celach diagnostycznych i bezpieczeństwa technicznego platformy.</li>
            </ul>
            <p>
              Wszystkie połączenia z naszą platformą oraz bazą danych są w pełni szyfrowane za pomocą bezpiecznego protokołu SSL/TLS. Regularnie tworzymy kopie zapasowe danych w celu zapewnienia ciągłości i stabilności usług.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">10. Zmiany Polityki Prywatności</h3>
            <p>
              Administrator zastrzega prawo do aktualizacji niniejszej polityki prywatności. O każdej istotnej zmianie Użytkownicy posiadający aktywne konto zostaną poinformowani drogą e-mailową z co najmniej <strong>14-dniowym wyprzedzeniem</strong>. Aktualna wersja polityki jest zawsze dostępna pod adresem <strong className="text-stone-100">wiedzaszytanamiare.pl/prywatnosc</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}