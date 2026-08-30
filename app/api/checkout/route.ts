// app/api/checkout/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  return NextResponse.json(
    { error: "Płatności online zostaną uruchomione wkrótce! Trwają ostatnie prace techniczne." },
    { status: 503 }
  );
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); }
      }
    }
  );

  // 1. Bezpiecznie sprawdzamy sesję użytkownika przez getUser() (Zabezpieczenie przed konsolą i oszustwami)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Niezalogowany użytkownik' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, tier, pack } = body; // type może być: 'subscription' lub 'tokens'

    let lineItems: any[] = [];
    let metadata: any = {
      userId: user.id, // Przekazujemy bezpiecznie zweryfikowane ID użytkownika
    };
    let mode: 'payment' | 'subscription' = 'payment';

    // 2. OBSŁUGA JEDNORAZOWYCH PAKIETÓW TOKENÓW (Działa w locie)
    if (type === 'tokens') {
      mode = 'payment';
      let amountInCents = 0;
      let tokenCount = 0;

      if (pack === 5) {
        amountInCents = 1000; // 10.00 PLN
        tokenCount = 5;
      } else if (pack === 10) {
        amountInCents = 1500; // 15.00 PLN
        tokenCount = 10;
      } else if (pack === 20) {
        amountInCents = 2500; // 25.00 PLN
        tokenCount = 20;
      } else {
        return NextResponse.json({ error: 'Nieprawidłowy rozmiar pakietu' }, { status: 400 });
      }

      lineItems = [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: `Pakiet ${tokenCount} Tokenów AI`,
              // ZAKTUALIZOWANY, UNIWERSALNY OPIS PRODUKTU DLA STRIPE (Zadania pisemne + ustne)
              description: `Jednorazowe doładowanie o ${tokenCount} kredytów do wykorzystania we wszystkich funkcjach AI (asystent rozprawek oraz próbne egzaminy ustne na żywo).`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }
      ];

      // Przekazujemy metadane do Webhooka
      metadata.purchaseType = 'tokens';
      metadata.tokenAmount = tokenCount.toString();

    } else {
      // 3. KLASYCZNA SUBSKRYPCJA (Używa stałych Price ID z .env)
      mode = 'payment';
      let priceId = '';

      if (tier === 'mini') priceId = process.env.STRIPE_PRICE_MINI!;
      else if (tier === 'medium') priceId = process.env.STRIPE_PRICE_MEDIUM!;
      else if (tier === 'premium') priceId = process.env.STRIPE_PRICE_PREMIUM!;

      if (!priceId) {
        return NextResponse.json({ error: 'Brak konfiguracji Price ID dla wybranego pakietu' }, { status: 400 });
      }

      lineItems = [{ price: priceId, quantity: 1 }];
      metadata.purchaseType = 'subscription';
      metadata.subscriptionTier = tier;
    }

    // Tworzenie sesji płatniczej Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: mode,
      success_url: `${request.headers.get('origin')}/?payment=success`,
      cancel_url: `${request.headers.get('origin')}/`,
      metadata: metadata,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}