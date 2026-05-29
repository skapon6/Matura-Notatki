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
            Ostatnia aktualizacja: 29 maja 2026 r. Niniejszy regulamin określa zasady korzystania z platformy internetowej oferującej asystenta pisania rozprawek oraz symulator matury ustnej z języka polskiego.
          </p>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">1. Postanowienia Ogólne</h3>
            <p>
              Właścicielem i administratorem platformy dostępnej pod adresem <strong className="text-stone-100">[Adres Twojej Domeny]</strong> jest <strong className="text-stone-100">[Nazwa Twojej Firmy / Imię i Nazwisko]</strong>, kontakt: <strong className="text-stone-100">[Twój Adres E-mail]</strong>. Serwis świadczy usługi drogą elektroniczną w postaci interaktywnych notatek maturalnych, automatycznego sprawdzania rozprawek oraz symulacji egzaminu ustnego przy użyciu algorytmów sztucznej inteligencji.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">2. Rejestracja i Warunki Techniczne</h3>
            <p>
              Korzystanie z większości funkcji serwisu wymaga bezpłatnej rejestracji konta za pośrednictwem systemu Supabase Auth. Do prawidłowego działania platformy wymagane jest urządzenie z dostępem do sieci Internet, aktualna przeglądarka internetowa (np. Google Chrome, Firefox, Edge, Safari) oraz włączona obsługa plików cookie i skryptów JavaScript. Dla symulatora matury ustnej zaleca się posiadanie sprawnego mikrofonu.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">3. System Kredytów (Tokenów) i Płatności</h3>
            <p>
              Serwis korzysta z wewnętrznego systemu rozliczeń opartego o kredyty (tokeny) zapisywane w profilu użytkownika:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Ocenianie rozprawki AI:</strong> pobiera dokładnie <strong>1 kredyt</strong> z konta użytkownika.</li>
              <li><strong>Generowanie przykładowej rozprawki AI:</strong> pobiera dokładnie <strong>1 kredyt</strong> z konta użytkownika.</li>
              <li><strong>Symulacja pełnego egzaminu ustnego AI:</strong> pobiera dokładnie <strong>3 kredyty</strong> z konta użytkownika.</li>
            </ul>
            <p>
              Użytkownik może w każdej chwili doładować stan swoich kredytów, kupując pakiety tokenów za pośrednictwem bezpiecznego operatora płatności <strong>Stripe</strong>. Ceny pakietów są widoczne w panelu użytkownika. Kredyty są przypisane wyłącznie do jednego konta i nie podlegają wymianie na gotówkę.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">4. Prawo do odstąpienia od umowy i zwroty</h3>
            <p>
              Zgodnie z art. 38 pkt 13 ustawy o prawach konsumenta, prawo do odstąpienia od umowy zawartej na odległość **nie przysługuje konsumentowi** w przypadku umów o dostarczanie treści cyfrowych, które nie są zapisane na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą konsumenta przed upływem terminu do odstąpienia od umowy.
            </p>
            <p>
              Dokonując zakupu kredytów przez Stripe, użytkownik wyraża zgodę na natychmiastowe dostarczenie treści cyfrowej (kredytów) i przyjmuje do wiadomości, że w momencie doładowania konta traci prawo do odstąpienia od umowy i zwrotu środków za zakupiony pakiet.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">5. Wyłączenie Odpowiedzialności (Zastrzeżenie AI)</h3>
            <p>
              Wszystkie analizy, oceny, sugerowane punkty (np. 20/35 pkt) oraz pytania dopytujące są generowane przez zaawansowane modele językowe AI (Gemini). Choć dokładamy wszelkich starań, aby algorytm rygorystycznie opierał się na wytycznych CKE Formuły 2023, **usługa ma charakter wyłącznie edukacyjny i pomocniczy**.
            </p>
            <p>
              Serwis nie gwarantuje, że oficjalny egzaminator CKE podczas państwowego egzaminu maturalnego oceni pracę użytkownika w ten sam sposób. Administrator nie ponosi żadnej odpowiedzialności za ostateczny wynik egzaminacyjny uzyskany przez użytkownika przed Państwową Komisją Egzaminacyjną.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">6. Prawa Autorskie i Ograniczenia</h3>
            <p>
              Wszystkie materiały dydaktyczne, struktura notatek, quizy, teksty autorskie, kod źródłowy oraz elementy graficzne platformy są objęte prawami autorskimi i należą do właściciela serwisu. 
            </p>
            <p>
              Użytkownik zachowuje pełne prawa autorskie do wprowadzanych przez siebie rozprawek i monologów. Kopiowanie zawartości serwisu (w tym bazy notatek i pytań CKE) w celach komercyjnych bez zgody administratora jest zabronione. W celu ochrony bazy dydaktycznej serwis stosuje techniczne środki ograniczające kopiowanie i wycinanie tekstu notatek.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[#c68a4c] uppercase tracking-wider font-serif">7. Reklamacje i Postanowienia Końcowe</h3>
            <p>
              Wszelkie reklamacje dotyczące działania platformy (np. błędy przy doładowaniu płatności Stripe, awaria API) należy zgłaszać na adres e-mail: <strong className="text-stone-100">[Twój Adres E-mail]</strong>. Administrator rozpatrzy reklamację w terminie do 14 dni roboczych. W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy Kodeksu Cywilnego oraz prawa polskiego.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}