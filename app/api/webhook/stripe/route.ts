// app/api/webhook/stripe/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Klient Supabase z prawami Service Role do ominięcia barier RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Brak sygnatury Stripe', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Błąd weryfikacji webhooka Stripe: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Obsługa sfinalizowania płatności
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;
    const customerEmail = session.customer_details?.email;

    // Dane do formalnego potwierdzenia umowy (Wymóg prawny)
    const transactionId = session.id;
    const amountPaid = ((session.amount_total || 0) / 100).toFixed(2);
    const purchaseDate = new Date().toLocaleString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (metadata && metadata.userId) {
      const userId = metadata.userId;
      const purchaseType = metadata.purchaseType;

      // 1. OBSŁUGA ZAKUPU JEDNORAZOWYCH TOKENÓW
      if (purchaseType === 'tokens') {
        const tokenAmount = parseInt(metadata.tokenAmount || '0');

        try {
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('essay_credits')
            .eq('id', userId)
            .single();

          if (fetchError) throw fetchError;

          const currentCredits = profile?.essay_credits || 0;
          const newCredits = currentCredits + tokenAmount;

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ essay_credits: newCredits })
            .eq('id', userId);

          if (updateError) throw updateError;

          console.log(`Pomyślnie dodano ${tokenAmount} tokenów dla użytkownika ${userId}`);

          // E-MAIL POTWIERDZAJĄCY DLA KLIENTA (Z KLAUZULĄ PRAWNĄ)
          if (customerEmail) {
            await resend.emails.send({
              from: 'Wiedza Szyta na Miarę <kontakt@wiedzaszytanamiare.pl>',
              to: [customerEmail],
              subject: '🎉 Potwierdzenie zakupu tokenów AI – Wiedza Szyta na Miarę',
              html: `
                <div style="font-family: 'Georgia', serif; padding: 25px; color: #e5e5e5; background-color: #1a1614; border-radius: 12px; max-width: 550px; border: 1px solid #332b27;">
                  <h2 style="color: #c68a4c; border-bottom: 1px solid #332b27; padding-bottom: 12px; font-size: 20px; margin-top: 0;">
                    Dziękujemy za zakup tokenów! ✨
                  </h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #d4c5b9;">
                    Do Twojego konta zostało pomyślnie dodane <strong>${tokenAmount} tokenów AI</strong>.
                  </p>
                  <div style="background: #26201c; padding: 15px; border-radius: 8px; border: 1px solid #3d332d; font-size: 13px; color: #f3ece6; margin: 15px 0;">
                    📊 Aktualny stan Twojego konta: <strong>${newCredits} ocen</strong>.
                  </div>
                  <a href="https://wiedzaszytanamiare.pl/ocenianie-rozprawek" style="display: inline-block; background-color: #c68a4c; color: #1a1614; padding: 12px 22px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 13px; margin: 10px 0 20px 0;">
                    Przejdź do Asystenta Rozprawek →
                  </a>

                  <div style="border-top: 1px solid #332b27; padding-top: 15px; font-size: 11px; line-height: 1.5; color: #8c7f76; font-family: sans-serif;">
                    <p style="margin: 4px 0;"><strong style="color: #b5a498;">Potwierdzenie zawarcia umowy o dostarczenie treści cyfrowych:</strong></p>
                    <p style="margin: 4px 0;">• <strong>Przedmiot:</strong> Paczka ${tokenAmount} tokenów AI</p>
                    <p style="margin: 4px 0;">• <strong>Cena:</strong> ${amountPaid} PLN</p>
                    <p style="margin: 4px 0;">• <strong>Data zakupu:</strong> ${purchaseDate}</p>
                    <p style="margin: 4px 0;">• <strong>ID transakcji:</strong> ${transactionId}</p>
                    <p style="margin-top: 10px; font-style: italic;">
                      Zgodnie z wyrażoną przez Ciebie podczas zakupu zgodą na natychmiastowe rozpoczęcie świadczenia usługi cyfrowej oraz przyjęciem do wiadomości informacji o utracie prawa do odstąpienia, informujemy, że stosownie do art. 38 pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, prawo do odstąpienia od umowy wygasło z chwilą udostępnienia treści cyfrowej na Twoim koncie.
                    </p>
                  </div>
                </div>
              `,
            }).catch((e) => console.error('Błąd wysyłki e-maila:', e));
          }
        } catch (dbError: any) {
          console.error('Błąd aktualizacji bazy przy tokenach:', dbError.message);
          return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

      // 2. OBSŁUGA ZAKUPU SUBSKRYPCJI / PAKIETU
      } else if (purchaseType === 'subscription') {
        const tier = metadata.subscriptionTier || 'premium';

        let expirationDate = new Date();
        let daysAdded = 30;
        if (tier === 'mini') {
          expirationDate.setDate(expirationDate.getDate() + 30);
          daysAdded = 30;
        } else if (tier === 'medium') {
          expirationDate.setDate(expirationDate.getDate() + 90);
          daysAdded = 90;
        } else if (tier === 'premium') {
          expirationDate.setDate(expirationDate.getDate() + 365);
          daysAdded = 365;
        }

        try {
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('essay_credits')
            .eq('id', userId)
            .single();

          if (fetchError) throw fetchError;

          const currentCredits = profile?.essay_credits || 0;

          let tokenIncrement = 0;
          if (tier === 'mini') tokenIncrement = 5;
          else if (tier === 'medium') tokenIncrement = 10;
          else if (tier === 'premium') tokenIncrement = 15;

          const newCredits = currentCredits + tokenIncrement;

          // UŻYWAMY DOKŁADNIE TWOJEJ KOLUMNY: expires_at
          const { error: subUpdateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: tier,
              expires_at: expirationDate.toISOString(),
              essay_credits: newCredits,
            })
            .eq('id', userId);

          if (subUpdateError) throw subUpdateError;

          console.log(`Pomyślnie zaktualizowano subskrypcję ${tier} dla użytkownika ${userId}.`);

          // E-MAIL POTWIERDZAJĄCY DLA KLIENTA (Z KLAUZULĄ PRAWNĄ)
          if (customerEmail) {
            const tierNames: Record<string, string> = {
              mini: 'Pakiet Mini (30 dni)',
              medium: 'Pakiet Średni (90 dni)',
              premium: 'Pakiet Premium (365 dni / 1 rok)',
            };
            const displayTierName = tierNames[tier] || `Pakiet ${tier.toUpperCase()}`;

            await resend.emails.send({
              from: 'Wiedza Szyta na Miarę <kontakt@wiedzaszytanamiare.pl>',
              to: [customerEmail],
              subject: `🎓 Potwierdzenie zakupu: ${displayTierName} – Wiedza Szyta na Miarę`,
              html: `
                <div style="font-family: 'Georgia', serif; padding: 25px; color: #e5e5e5; background-color: #1a1614; border-radius: 12px; max-width: 550px; border: 1px solid #332b27;">
                  <h2 style="color: #c68a4c; border-bottom: 1px solid #332b27; padding-bottom: 12px; font-size: 20px; margin-top: 0;">
                    Witaj w gronie Maturzystów Premium! 📚
                  </h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #d4c5b9;">
                    Twój <strong>${displayTierName}</strong> został pomyślnie aktywowany.
                  </p>
                  <div style="background: #26201c; padding: 15px; border-radius: 8px; border: 1px solid #3d332d; font-size: 13px; color: #f3ece6; margin: 15px 0; line-height: 1.6;">
                    ✅ <strong>Ważność pakietu:</strong> ${daysAdded} dni<br/>
                    ✅ <strong>Przyznane tokeny AI:</strong> +${tokenIncrement} ocen wypracowań<br/>
                    ✅ <strong>Baza notatek i lektur:</strong> Pełny dostęp bez limitów
                  </div>
                  <a href="https://wiedzaszytanamiare.pl" style="display: inline-block; background-color: #c68a4c; color: #1a1614; padding: 12px 22px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 13px; margin: 10px 0 20px 0;">
                    Wejdź do Kącika Maturalnego →
                  </a>

                  <div style="border-top: 1px solid #332b27; padding-top: 15px; font-size: 11px; line-height: 1.5; color: #8c7f76; font-family: sans-serif;">
                    <p style="margin: 4px 0;"><strong style="color: #b5a498;">Potwierdzenie zawarcia umowy o dostarczenie treści cyfrowych:</strong></p>
                    <p style="margin: 4px 0;">• <strong>Usługa:</strong> ${displayTierName}</p>
                    <p style="margin: 4px 0;">• <strong>Cena:</strong> ${amountPaid} PLN</p>
                    <p style="margin: 4px 0;">• <strong>Data zawarcia umowy:</strong> ${purchaseDate}</p>
                    <p style="margin: 4px 0;">• <strong>ID transakcji:</strong> ${transactionId}</p>
                    <p style="margin-top: 10px; font-style: italic;">
                      Zgodnie z wyrażoną przez Ciebie podczas zakupu zgodą na natychmiastowe rozpoczęcie świadczenia usługi cyfrowej oraz przyjęciem do wiadomości informacji o utracie prawa do odstąpienia, informujemy, że stosownie do art. 38 pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, prawo do odstąpienia od umowy wygasło z chwilą udostępnienia treści cyfrowej na Twoim koncie.
                    </p>
                  </div>
                </div>
              `,
            }).catch((e) => console.error('Błąd wysyłki e-maila:', e));
          }
        } catch (dbError: any) {
          console.error('Błąd aktualizacji bazy przy subskrypcji:', dbError.message);
          return NextResponse.json({ error: dbError.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}