import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Klient Supabase z prawami Service Role do ominięcia barier RLS przy aktualizacji profilu
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

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

    if (metadata) {
      const userId = metadata.userId;
      const purchaseType = metadata.purchaseType;

      // 1. OBSŁUGA ZAKUPU JEDNORAZOWYCH TOKENÓW
      if (purchaseType === 'tokens') {
        const tokenAmount = parseInt(metadata.tokenAmount || '0');

        try {
          // Pobieramy aktualną liczbę tokenów użytkownika
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('essay_credits')
            .eq('id', userId)
            .single();

          if (fetchError) throw fetchError;

          const currentCredits = profile?.essay_credits || 0;
          const newCredits = currentCredits + tokenAmount;

          // Aktualizujemy tokeny w bazie Supabase
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ essay_credits: newCredits })
            .eq('id', userId);

          if (updateError) throw updateError;

          console.log(`Pomyślnie dodano ${tokenAmount} tokenów dla użytkownika ${userId}`);
        } catch (dbError: any) {
          console.error('Błąd aktualizacji bazy danych przy zakupie tokenów:', dbError.message);
          return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

      // 2. OBSŁUGA ZAKUPU SUBSKRYPCJI (POPRAWIONA LOGIKA - DODANO TOKENY I 365 DNI WAŻNOŚCI)
      } else if (purchaseType === 'subscription') {
        const tier = metadata.subscriptionTier;
        
        let expirationDate = new Date();
        if (tier === 'mini') {
          expirationDate.setDate(expirationDate.getDate() + 30);
        } else if (tier === 'medium') {
          expirationDate.setDate(expirationDate.getDate() + 90);
        } else if (tier === 'premium') {
          expirationDate.setDate(expirationDate.getDate() + 365); // Ustawienie ważności na dokładnie 365 dni (1 rok) [1]
        }

        try {
          // KROK 1: Najpierw pobieramy aktualną liczbę tokenów użytkownika z bazy danych
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('essay_credits')
            .eq('id', userId)
            .single();

          if (fetchError) throw fetchError;

          const currentCredits = profile?.essay_credits || 0;

          // KROK 2: Ustalamy ile tokenów dodać w zależności od wybranego pakietu
          let tokenIncrement = 0;
          if (tier === 'mini') {
            tokenIncrement = 5;
          } else if (tier === 'medium') {
            tokenIncrement = 10;
          } else if (tier === 'premium') {
            tokenIncrement = 15; // Przyznanie 20 tokenów na start przy zakupie Premium (zamiast 10)
          }

          const newCredits = currentCredits + tokenIncrement;

          // KROK 3: Aktualizujemy profil o status, czas wygaśnięcia oraz NOWE TOKENY
          const { error: subUpdateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: tier,
              expires_at: expirationDate.toISOString(),
              essay_credits: newCredits
            })
            .eq('id', userId);

          if (subUpdateError) throw subUpdateError;

          console.log(`Pomyślnie zaktualizowano subskrypcję ${tier} dla użytkownika ${userId} oraz przyznano ${tokenIncrement} tokenów.`);
        } catch (dbError: any) {
          console.error('Błąd aktualizacji bazy przy subskrypcji:', dbError.message);
          return NextResponse.json({ error: dbError.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}