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
            Ostatnia aktualizacja: 11 czerwca 2026 r. Niniejszy regulamin określa zasady korzystania z platformy internetowej oferującej asystenta pisania rozprawek oraz symulator matury ustnej z języka polskiego.
          </p>

          {/* 1 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">1. Postanowienia Ogólne</h3>
            <p>
              Właścicielem i administratorem platformy dostępnej pod adresem <strong className="text-stone-100">wiedzaszytanamiare.pl</strong> jest <strong className="text-stone-100">Kacper Leś</strong>, zamieszkały pod adresem: <strong className="text-stone-100">Pustków-Osiedle (kod pocztowy: 39-206)</strong>, kontakt e-mail: <strong className="text-stone-100">wiedzaszytanamiare@kontakt.pl</strong>. Serwis świadczy usługi drogą elektroniczną w postaci interaktywnych notatek maturalnych, automatycznego sprawdzania rozprawek oraz symulacji egzaminu ustnego przy użyciu algorytmów sztucznej inteligencji.
            </p>
            <p>
              Korzystanie z serwisu jest równoznaczne z akceptacją niniejszego regulaminu w całości. Osoby niepełnoletnie (poniżej 18. roku życia) mogą korzystać z serwisu wyłącznie za zgodą rodziców lub opiekunów prawnych.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">2. Definicje</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Serwis</strong> – platforma internetowa dostępna pod adresem wiedzaszytanamiare.pl.</li>
              <li><strong>Użytkownik</strong> – osoba fizyczna posiadająca zarejestrowane konto w serwisie.</li>
              <li><strong>Kredyty / Tokeny</strong> – wewnętrzna waluta serwisu umożliwiająca korzystanie z funkcji AI.</li>
              <li><strong>Pakiet</strong> – jeden z trzech planów dostępu: Mini, Medium lub Premium, różniących się ceną, czasem ważności oraz zakresem przyznawanych tokenów na start.</li>
              <li><strong>Treść cyfrowa</strong> – kredyty, dostęp do notatek, wyniki ocen AI oraz inne materiały edukacyjne dostarczane w formie elektronicznej.</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">3. Rejestracja i Warunki Techniczne</h3>
            <p>
              Korzystanie z większości funkcji serwisu wymaga bezpłatnej rejestracji konta za pośrednictwem systemu Supabase Auth. Użytkownik zobowiązuje się do podania prawdziwych danych podczas rejestracji oraz do nieudostępniania danych logowania osobom trzecim. Jedno konto może być użytkowane wyłącznie przez jedną osobę — zakaz udostępniania konta jest kluczowym warunkiem regulaminu.
            </p>
            <p>
              Do prawidłowego działania platformy wymagane jest urządzenie z dostępem do sieci Internet, aktualna przeglądarka internetowa (np. Google Chrome, Firefox, Edge, Safari) oraz włączona obsługa plików cookie i skryptów JavaScript. Dla symulatora matury ustnej zaleca się posiadanie sprawnego mikrofonu.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">4. Pakiety i Dostęp do Funkcji</h3>
            <p>
              Serwis oferuje trzy plany dostępu różniące się zakresem udostępnianych treści i funkcji:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-stone-100">Mini (29 zł):</strong> Pełny dostęp do bazy wiedzy, map myśli i fiszek na okres dokładnie <strong>30 dni</strong> od zakupu. Zawera pakiet <strong>5 uniwersalnych tokenów</strong> na start.</li>
              <li><strong className="text-stone-100">Medium (59 zł):</strong> Pełny dostęp do bazy wiedzy, map myśli i fiszek na okres dokładnie <strong>90 dni</strong> od zakupu. Zawiera pakiet <strong>10 uniwersalnych tokenów</strong> na start.</li>
              <li><strong className="text-stone-100">Premium (89 zł):</strong> Pełny dostęp do wszystkich treści edukacyjnych i modułów AI na okres dokładnie <strong>365 dni (1 rok)</strong> od zakupu. Zawiera pakiet <strong>15 uniwersalnych tokenów</strong> na start.</li>
            </ul>
            <p>
              Szczegółowy zakres każdego pakietu oraz aktualne ceny są prezentowane na stronie cennika w chwili zakupu. Administrator zastrzega prawo do modyfikacji zawartości pakietów z zachowaniem 14-dniowego okresu powiadomienia użytkowników posiadających aktywny pakiet.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">5. System Kredytów (Tokenów) i Płatności</h3>
            <p>
              Serwis korzysta z wewnętrznego systemu rozliczeń opartego o kredyty (tokeny) zapisywane w profilu użytkownika:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Ocenianie rozprawki AI:</strong> pobiera dokładnie <strong>1 kredyt</strong> z konta użytkownika.</li>
              <li><strong>Generowanie przykładowej rozprawki AI:</strong> pobiera dokładnie <strong>1 kredyt</strong> z konta użytkownika.</li>
              <li><strong>Symulacja pełnego egzaminu ustnego AI (oba zadania):</strong> pobiera dokładnie <strong>3 kredyty</strong> z konta użytkownika.</li>
              <li><strong>Symulacja pojedynczego zadania ustnego AI (tylko jawne lub tylko niejawne):</strong> pobiera dokładnie <strong>2 kredyty</strong> z konta użytkownika.</li>
            </ul>
            <p>
              Użytkownik może w każdej chwili doładować stan swoich kredytów, kupując pakiety tokenów za pośrednictwem bezpiecznego operatora płatności <strong>Stripe</strong>. Ceny pakietów są widoczne w panelu użytkownika. Kredyty są przypisane wyłącznie do jednego konta, nie podlegają wymianie na gotówkę, nie są transferowalne na inne konta i nie posiadają daty ważności — są aktywne tak długo, jak aktywne jest konto użytkownika.
            </p>
            <p>
              Pobranie kredytów następuje w momencie wysłania żądania do systemu AI, niezależnie od treści wygenerowanej odpowiedzi. W przypadku udokumentowanej awarii technicznej leżącej po stronie serwisu, administrator może — według własnego uznania — zwrócić pobrane kredyty.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">6. Prawo do Odstąpienia od Umowy i Zwroty</h3>
            <p>
              Zgodnie z art. 38 pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta (Dz.U. 2014 poz. 827 z późn. zm.), prawo do odstąpienia od umowy zawartej na odległość <strong className="text-stone-100">nie przysługuje konsumentowi</strong> w przypadku umów o dostarczanie treści cyfrowych, które nie są zapisane na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą konsumenta przed upływem terminu do odstąpienia od umowy i po poinformowaniu go przez przedsiębiorcę o utracie prawa do odstąpienia od umowy.
            </p>
            <p>
              Dokonując zakupu kredytów lub pakietu przez Stripe, Użytkownik:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>potwierdza zapoznanie się z niniejszym regulaminem,</li>
              <li>wyraża wyraźną zgodę na natychmiastowe dostarczenie treści cyfrowej (aktywację kredytów / pakietu),</li>
              <li>przyjmuje do wiadomości, że po aktywacji konta traci prawo do odstąpienia od umowy i zwrotu środków za zakupiony pakiet lub doładowanie kredytów.</li>
            </ul>
            <p>
              Powyższa zgoda jest potwierdzana poprzez zaznaczenie odpowiedniego checkboxa w formularzu zakupu, przed dokonaniem płatności. Brak zaznaczenia checkboxa uniemożliwia sfinalizowanie transakcji.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">7. Wyłączenie Odpowiedzialności (Zastrzeżenie AI)</h3>
            <p>
              Wszystkie analizy, oceny, sugerowane punkty oraz pytania dopytujące są generowane przez zaawansowane modele językowe AI (Google Gemini). Choć dokładamy wszelkich starań, aby algorytm opierał się na wytycznych CKE Formuły 2023, <strong className="text-stone-100">usługa ma charakter wyłącznie edukacyjny i pomocniczy</strong>.
            </p>
            <p>
              Serwis nie gwarantuje, że oficjalny egzaminator CKE podczas państwowego egzaminu maturalnego oceni pracę użytkownika w ten sam sposób, co algorytm AI. Administrator nie ponosi żadnej odpowiedzialności za ostateczny wynik egzaminacyjny uzyskany przez użytkownika przed Państwową Komisją Egzaminacyjną ani za jakiekolwiek decyzje edukacyjne podjęte na podstawie ocen serwisu.
            </p>
            <p>
              W najszerszym zakresie dopuszczalnym przez prawo, administrator nie ponosi odpowiedzialności za przerwy w działaniu serwisu wynikające z przyczyn leżących po stronie dostawców zewnętrznych (Supabase, Google Gemini API, Stripe), siły wyższej lub planowanych prac technicznych.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">8. Zakaz Nadużyć i Niedozwolone Działania</h3>
            <p>
              Użytkownikowi zabrania się w szczególności:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>automatycznego wysyłania żądań do API serwisu za pomocą skryptów, botów lub innych narzędzi automatyzacji,</li>
              <li>odsprzedaży lub udostępniania konta oraz kredytów osobom trzecim,</li>
              <li>podejmowania prób obejścia systemu kredytowego lub nielegalnego uzyskania dostępu do treści Premium,</li>
              <li>kopiowania, reprodukowania lub dystrybucji treści objętych prawami autorskimi serwisu bez pisemnej zgody administratora,</li>
              <li>wprowadzania do serwisu treści bezprawnych, obraźliwych, naruszających prawa osób trzecich lub dobre obyczaje,</li>
              <li>działań mogących zakłócić lub przeciążyć infrastrukturę techniczną serwisu.</li>
            </ul>
            <p>
              Naruszenie powyższych zasad uprawnia administratora do natychmiastowego zawieszenia lub trwałego usunięcia konta bez prawa do zwrotu niewykorzystanych kredytów lub opłat za pakiet.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">9. Zawieszenie i Usunięcie Konta</h3>
            <p>
              Administrator zastrzega sobie prawo do zawieszenia dostępu do konta lub jego trwałego usunięcia w przypadku:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>naruszenia postanowień niniejszego regulaminu,</li>
              <li>podejrzenia oszustwa lub nieuczciwego korzystania z systemu płatności,</li>
              <li>działań na szkodę serwisu, jego użytkowników lub dostawców zewnętrznych,</li>
              <li>uzasadnionego podejrzenia włamania lub przejęcia konta.</li>
            </ul>
            <p>
              W przypadku zawieszenia konta z winy Użytkownika, niewykorzystane kredyty oraz opłaty za aktywny pakiet nie podlegają zwrotowi. O zawieszeniu konta Użytkownik zostanie poinformowany na adres e-mail podany przy rejestracji, o ile nie będzie to sprzeczne z bezpieczeństwem serwisu lub postępowaniem wyjaśniającym.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">10. Prawa Autorskie i Ograniczenia</h3>
            <p>
              Wszystkie materiały dydaktyczne, struktura notatek, quizy, teksty autorskie, kod źródłowy oraz elementy graficzne platformy są objęte prawami autorskimi i stanowią wyłączną własność administratora serwisu.
            </p>
            <p>
              Użytkownik zachowuje pełne prawa autorskie do wprowadzanych przez siebie rozprawek i monologów. Kopiowanie zawartości serwisu (w tym bazy notatek i pytań CKE) w celach komercyjnych bez pisemnej zgody administratora jest zabronione i może skutkować odpowiedzialnością cywilną. W celu ochrony bazy dydaktycznej serwis stosuje techniczne środki ograniczające kopiowanie i wycinanie tekstu notatek.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">11. Zmiany Regulaminu</h3>
            <p>
              Administrator zastrzega prawo do zmiany niniejszego regulaminu. O każdej istotnej zmianie Użytkownicy posiadający aktywne konto zostaną poinformowani drogą e-mailową z co najmniej <strong className="text-stone-100">14-dniowym wyprzedzeniem</strong> przed wejściem zmian w życie. Dalsze korzystanie z serwisu po upływie tego terminu jest równoznaczne z akceptacją zmienionego regulaminu. Jeżeli Użytkownik nie akceptuje nowych warunków, przysługuje mu prawo do usunięcia konta.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">12. Reklamacje i Postanowienia Końcowe</h3>
            <p>
              Wszelkie reklamacje dotyczące działania platformy (np. błędy przy doładowaniu płatności Stripe, awaria API, nieprawidłowe pobranie kredytów) należy zgłaszać na adres e-mail: <strong className="text-stone-100">wiedzaszytanamiare@kontakt.pl</strong>. Reklamacja powinna zawierać: opis problemu, datę i godzinę zdarzenia oraz adres e-mail konta. Administrator rozpatrzy reklamację w terminie do <strong>14 dni</strong>.
            </p>
            <p>
              W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy Kodeksu Cywilnego, ustawy o świadczeniu usług drogą elektroniczną oraz prawa polskiego. Sądem właściwym do rozstrzygania sporów jest sąd miejscowo właściwy dla siedziby administratora, chyba że przepisy bezwzględnie obowiązujące stanowią inaczej.
            </p>
            <p>
              Konsument ma prawo skorzystać z pozasądowych metod rozwiązywania sporów, w tym z platformy ODR dostępnej pod adresem: <strong className="text-stone-100">https://consumer-redress.ec.europa.eu</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}