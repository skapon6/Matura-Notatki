// app/regulamin/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { getThemeClasses } from "../lib/theme";

export default function RegulaminPage() {
  const currentTheme = getThemeClasses("library");

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.bg} text-stone-200 font-sans p-6 sm:p-8 items-center`}>
      <div className="max-w-3xl w-full bg-[#1f1915]/90 border border-amber-950/40 rounded-3xl p-6 sm:p-10 shadow-xl mt-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800/60 pb-5 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-100">Regulamin Serwisu</h1>
            <p className="text-xs text-stone-400 mt-1">Zasady korzystania z platformy edukacyjnej</p>
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
            Ostatnia aktualizacja: 31 sierpnia 2026 r. Niniejszy regulamin określa zasady korzystania z platformy internetowej oferującej asystenta pisania rozprawek oraz symulator matury ustnej z języka polskiego.
          </p>

          {/* 1 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">1. Postanowienia Ogólne</h3>
            <p>
              Właścicielem i administratorem platformy dostępnej pod adresem <strong className="text-stone-100">wiedzaszytanamiare.pl</strong> jest <strong className="text-stone-100">Kacper Leś</strong>, prowadzący działalność pod adresem: <strong className="text-stone-100">39-206 Pustków-Osiedle</strong>, kontakt e-mail: <strong className="text-stone-100">kontakt@wiedzaszytanamiare.pl</strong>. 
              Działalność prowadzona jest w formie działalności nierejestrowanej w rozumieniu art. 5 ustawy z dnia 6 marca 2018 r. — Prawo przedsiębiorców.
            </p>
            <p>
              Serwis świadczy usługi drogą elektroniczną w postaci dostępu do interaktywnych notatek maturalnych, automatycznego sprawdzania rozprawek oraz symulacji egzaminu ustnego przy użyciu algorytmów sztucznej inteligencji.
            </p>
            <p>
              Korzystanie z serwisu jest równoznaczne z akceptacją niniejszego regulaminu w całości przez Użytkownika. Osoby niepełnoletnie (poniżej 18. roku życia) mogą korzystać z serwisu wyłącznie za zgodą rodziców lub opiekunów prawnych.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">2. Definicje</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Serwis</strong> – platforma internetowa dostępna pod adresem wiedzaszytanamiare.pl.</li>
              <li><strong>Użytkownik</strong> – osoba fizyczna posiadająca zarejestrowane konto w serwisie, w tym Konsument lub Przedsiębiorca na prawach konsumenta.</li>
              <li><strong>Kredyty / Tokeny</strong> – wewnętrzna jednostka rozliczeniowa serwisu umożliwiająca wywoływanie funkcji AI.</li>
              <li><strong>Pakiet</strong> – jeden z planów dostępu (Mini, Medium lub Premium) umożliwiający jednorazowy zakup określonego czasu dostępu do bazy wiedzy oraz pakietu tokenów na start.</li>
              <li><strong>Usługa cyfrowa / Treść cyfrowa</strong> – kredyty, dostęp do bazy wiedzy, map myśli, fiszek, wyniki ocen AI oraz inne materiały dostarczane w formie elektronicznej za pośrednictwem Serwisu.</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">3. Rejestracja i Warunki Techniczne</h3>
            <p>
              Korzystanie z funkcji Serwisu wymaga bezpłatnej rejestracji konta za pośrednictwem systemu Supabase Auth. Użytkownik zobowiązuje się do podania prawdziwych danych podczas rejestracji oraz do nieudostępniania danych logowania osobom trzecim. Jedno konto może być użytkowane wyłącznie przez jedną osobę — zakaz udostępniania konta osobom trzecim jest kluczowym warunkiem korzystania z platformy.
            </p>
            <p>
              Do prawidłowego działania platformy wymagane jest urządzenie z dostępem do sieci Internet, aktualna przeglądarka internetowa (np. Google Chrome, Firefox, Edge, Safari) oraz włączona obsługa plików cookie i skryptów JavaScript. Dla modułu symulatora matury ustnej wymagane jest posiadanie sprawnego mikrofonu.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">4. Pakiety i Dostęp do Funkcji</h3>
            <p>
              Serwis oferuje trzy plany dostępu. Wszystkie pakiety stanowią <strong>zakup jednorazowy</strong> (nie odnawiają się automatycznie w formie subskrypcji):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-stone-100">Mini (29 zł):</strong> Pełny dostęp do bazy wiedzy, map myśli i fiszek na okres dokładnie <strong>30 dni</strong> od dnia zakupu. Zawiera pakiet <strong>5 uniwersalnych tokenów</strong> na start. Po 30 dniach dostęp wygasa i wymaga ręcznego odnowienia.</li>
              <li><strong className="text-stone-100">Medium (59 zł):</strong> Pełny dostęp do bazy wiedzy, map myśli i fiszek na okres dokładnie <strong>90 dni</strong> od dnia zakupu. Zawiera pakiet <strong>10 uniwersalnych tokenów</strong> na start. Po 90 dniach dostęp wygasa i wymaga ręcznego odnowienia.</li>
              <li><strong className="text-stone-100">Premium (89 zł):</strong> Pełny dostęp do wszystkich treści edukacyjnych i modułów AI na okres dokładnie <strong>365 dni (1 rok)</strong> od dnia zakupu. Zawiera pakiet <strong>15 uniwersalnych tokenów</strong> na start. Po roku dostęp wygasa i wymaga ręcznego odnowienia.</li>
            </ul>
            <p>
              Szczegółowy zakres każdego pakietu oraz aktualne ceny są prezentowane na stronie cennika w chwili zakupu. Administrator zastrzega sobie prawo do modyfikacji zawartości pakietów z zachowaniem 14-dniowego okresu powiadomienia zarejestrowanych użytkowników posiadających aktywny pakiet.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">5. System Kredytów (Tokenów) i Płatności</h3>
            <p>
              Serwis korzysta z wewnętrznego systemu rozliczeń opartego o kredyty (tokeny) przypisywane do profilu użytkownika:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Ocenianie rozprawki AI:</strong> pobiera dokładnie <strong>1 kredyt</strong> z konta użytkownika.</li>
              <li><strong>Generowanie przykładowej rozprawki AI:</strong> pobiera dokładnie <strong>1 kredyt</strong> z konta użytkownika.</li>
              <li><strong>Symulacja pełnego egzaminu ustnego AI (oba zadania):</strong> pobiera dokładnie <strong>3 kredyty</strong> z konta użytkownika.</li>
              <li><strong>Symulacja pojedynczego zadania ustnego AI (tylko jawne lub tylko niejawne):</strong> pobiera dokładnie <strong>2 kredyty</strong> z konta użytkownika.</li>
            </ul>
            <p>
              Użytkownik może w każdej chwili doładować stan swoich kredytów, kupując dodatkowe pakiety tokenów za pośrednictwem operatora płatności <strong>Stripe</strong>. Ceny pakietów są widoczne w panelu użytkownika. Kredyty są przypisane wyłącznie do jednego konta, nie podlegają wymianie na gotówkę, nie są transferowalne i nie posiadają daty ważności — są aktywne tak długo, jak aktywne jest konto użytkownika w Serwisie.
            </p>
            <p>
              Pobranie kredytów następuje automatycznie w momencie zatwierdzenia i wysłania żądania analizy do systemu AI. W przypadku błędu technicznego leżącego po stronie infrastruktury Serwisu (np. brak odpowiedzi z modelu AI), system automatycznie dokonuje zwrotu pobranego kredytu na konto użytkownika (rollback).
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">6. Prawo do Odstąpienia od Umowy</h3>
            <p>
              Zgodnie z art. 38 pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, prawo do odstąpienia od umowy zawartej na odległość <strong>nie przysługuje konsumentowi</strong> w przypadku umów o dostarczanie treści cyfrowych lub usług cyfrowych, za które konsument jest zobowiązany do zapłaty ceny, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną i uprzednią zgodą konsumenta, który został poinformowany przed rozpoczęciem świadczenia, że po spełnieniu świadczenia przez przedsiębiorcę utraci prawo odstąpienia od umowy, i przyjął to do wiadomości, a przedsiębiorca dostarczył konsumentowi potwierdzenie zawarcia umowy na trwałym nośniku (e-mail).
            </p>
            <p>
              Dokonując zakupu pakietu lub doładowania kredytów za pośrednictwem systemu Stripe, Użytkownik:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>potwierdza zapoznanie się z niniejszym regulaminem i akceptuje go,</li>
              <li>wyraża wyraźną zgodę na natychmiastowe dostarczenie usługi/treści cyfrowej (aktywację tokenów lub pakietu dostępu) przed upływem terminu do odstąpienia od umowy,</li>
              <li>przyjmuje do wiadomości, że z momentem aktywacji traci prawo do odstąpienia od umowy i żądania zwrotu środków.</li>
            </ul>
            <p>
              Powyższa zgoda jest udzielana poprzez zaznaczenie odpowiedniego pola wyboru (checkbox) na etapie finalizacji zamówienia. W przypadku braku zgody, usługa nie może zostać dostarczona natychmiastowo.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">7. Wyłączenie Odpowiedzialności (Zastrzeżenie AI)</h3>
            <p>
              Wszystkie analizy, oceny, punktacja, uwagi, komentarze oraz pytania dopytujące są generowane przy użyciu algorytmów sztucznej inteligencji (Google Gemini). Serwis dokłada wszelkich starań, aby system opierał się na oficjalnych wytycznych CKE Formuły 2023, jednak <strong className="text-stone-100">usługa ma charakter wyłącznie pomocniczy i edukacyjny</strong>.
            </p>
            <p>
              Serwis nie gwarantuje, że oficjalny egzaminator CKE podczas państwowego egzaminu oceni pracę użytkownika w identyczny sposób. Administrator nie ponosi odpowiedzialności za ostateczny wynik egzaminacyjny uzyskany przez użytkownika przed Państwową Komisją Egzaminacyjną, ani za decyzje edukacyjne podjęte na podstawie analiz Serwisu.
            </p>
            <p>
              W najszerszym zakresie dopuszczalnym przez obowiązujące prawo, administrator nie ponosi odpowiedzialności za przerwy w działaniu platformy wynikające z awarii dostawców zewnętrznych (Stripe, Supabase, Google Gemini API), siły wyższej czy niezbędnych prac konserwacyjnych.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">8. Zakaz Nadużyć i Niedozwolone Działania</h3>
            <p>
              Użytkownikowi zabrania się w szczególności:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>automatycznego odpytywania API Serwisu za pomocą skryptów, botów, narzędzi RPA lub innych metod automatyzacji,</li>
              <li>udostępniania, wypożyczania lub odsprzedaży konta oraz kredytów osobom trzecim,</li>
              <li>podejmowania prób obchodzenia systemu płatności, zabezpieczeń kredytowych lub uzyskania nieuprawnionego dostępu do strefy Premium,</li>
              <li>kopiowania, dystrybucji lub wtórnego wykorzystania bazy wiedzy, pytań CKE, notatek i grafik Serwisu bez pisemnej zgody właściciela,</li>
              <li>wprowadzania do Serwisu treści o charakterze bezprawnym, obraźliwym lub naruszającym prawa osób trzecich.</li>
            </ul>
            <p>
              Naruszenie powyższych zasad uprawnia administratora do natychmiastowego zablokowania lub usunięcia konta Użytkownika bez obowiązku zwrotu niewykorzystanych środków lub pakietów.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">9. Zawieszenie i Usunięcie Konta</h3>
            <p>
              Administrator zastrzega sobie prawo do zawieszenia dostępu do konta lub jego trwałego usunięcia w przypadku naruszenia postanowień regulaminu, podejrzenia oszustwa płatniczego, działań na szkodę infrastruktury technicznej platformy lub uzasadnionego podejrzenia przejęcia konta przez osoby trzecie.
            </p>
            <p>
              O zablokowaniu konta Użytkownik zostanie poinformowany drogą e-mailową. W przypadku usunięcia konta z winy Użytkownika, niewykorzystane kredyty oraz aktywne pakiety nie podlegają zwrotowi.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">10. Prawa Autorskie i Ograniczenia Techniczne</h3>
            <p>
              Wszystkie materiały dydaktyczne, notatki, mapy myśli, baza pytań, kod źródłowy oraz elementy graficzne platformy stanowią wyłączną własność intelektualną Kacpra Lesia i są chronione prawem autorskim.
            </p>
            <p>
              Użytkownik zachowuje pełne prawa autorskie do wprowadzanych przez siebie rozprawek i monologów. Kopiowanie zawartości bazy dydaktycznej Serwisu w celach komercyjnych bez pisemnej zgody jest zabronione. W celu ochrony unikalnej bazy dydaktycznej Serwis stosuje techniczne środki ograniczające masowe kopiowanie, zaznaczanie i wycinanie tekstu notatek.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">11. Dane Osobowe i Polityka Prywatności</h3>
            <p>
              Zasady przetwarzania danych osobowych Użytkowników (w tym rejestracji przez Supabase oraz płatności Stripe) reguluje odrębny dokument – <strong>Polityka Prywatności</strong>, dostępny na stronie głównej Serwisu. Rejestrując konto, Użytkownik potwierdza zapoznanie się z Polityką Prywatności, co jest niezbędne do realizacji świadczenia usług drogą elektroniczną (zgodnie z RODO).
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">12. Zmiany Regulaminu</h3>
            <p>
              Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszym regulaminie z ważnych przyczyn (np. zmiany przepisów prawa, rozwój techniczny platformy). O każdej istotnej zmianie zarejestrowani Użytkownicy zostaną powiadomieni z co najmniej <strong>14-dniowym wyprzedzeniem</strong> w formie komunikatu elektronicznego (np. wyraźnego powiadomienia wyświetlanego po zalogowaniu do panelu Użytkownika w Serwisie lub wiadomości e-mail).
            </p>
            <p>
              Brak akceptacji nowych warunków uprawnia Użytkownika do żądania usunięcia konta przed wejściem zmian w życie. Dalsze korzystanie z Serwisu po wejściu w życie zmian równoznaczne jest z ich akceptacją.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">13. Reklamacje i Zgodność Usługi z Umową (Konsumenci)</h3>
            <p>
              Wszelkie reklamacje (w tym dotyczące braku zgodności usług/treści cyfrowych z umową) należy zgłaszać drogą elektroniczną na adres: <strong className="text-stone-100">kontakt@wiedzaszytanamiare.pl</strong>.
            </p>
            <p>
              Do reklamacji konsumenckich dotyczących dostarczania treści lub usług cyfrowych po 1 stycznia 2023 r. zastosowanie mają przepisy <strong>Rozdziału 5b ustawy o prawach konsumenta</strong>. Jeżeli dostarczona usługa/treść cyfrowa jest niezgodna z umową, Konsument może żądać doprowadzenia jej do zgodności z umową lub – w określonych ustawą przypadkach (np. gdy niezgodność jest istotna) – złożyć oświadczenie o obniżeniu ceny lub odstąpieniu od umowy.
            </p>
            <p>
              Administrator rozpatruje zgłoszenie reklamacyjne w terminie do <strong>14 dni</strong> od dnia jego otrzymania i przesyła odpowiedź na adres e-mail Użytkownika.
            </p>
            <p>
              Konsument ma prawo skorzystać z pozasądowych metod rozwiązywania sporów, w tym ze złożenia skargi za pośrednictwem unijnej platformy ODR dostępnej pod adresem: <strong className="text-stone-100">https://consumer-redress.ec.europa.eu</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}