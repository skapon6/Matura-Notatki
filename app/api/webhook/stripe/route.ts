import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Klient administratora do zapisu danych bez ograniczeń RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    if (!sig) throw new Error('Brak nagłówka stripe-signature')
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error(`⚠️ Błąd weryfikacji webhooka: ${err.message}`)
    return NextResponse.json({ error: `Błąd weryfikacji: ${err.message}` }, { status: 400 })
  }

  // Obsługa zdarzenia po udanej płatności
// Obsługa zdarzenia po udanej płatności
if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session;

  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;

  if (userId && tier) {
    let tokensToAdd = 0;
    let expirationDate: Date | null = null;

    const now = new Date();

    // Obliczamy tokeny oraz datę wygaśnięcia dostępu
    if (tier === 'mini') {
      tokensToAdd = 5;
      expirationDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dni
    } else if (tier === 'medium') {
      tokensToAdd = 10;
      expirationDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 dni
    } else if (tier === 'premium') {
      tokensToAdd = 10;
      expirationDate = null; // Premium nie wygasa nigdy (dostęp na zawsze)
    }

    try {
      // A. Pobieramy aktualny stan profilu
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('essay_credits')
        .eq('id', userId)
        .single();

      const currentCredits = profile?.essay_credits || 0;
      const newCredits = currentCredits + tokensToAdd;

      // B. Zapisujemy dane wraz z datą wygaśnięcia
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: tier,
          essay_credits: newCredits,
          expires_at: expirationDate ? expirationDate.toISOString() : null, // Zapisujemy datę
          updated_at: now.toISOString()
        })
        .eq('id', userId);

      console.log(`✅ Sukces: Nadano pakiet ${tier}, dodano ${tokensToAdd} tokenów. Ważność do: ${expirationDate}`);
    } catch (err) {
      console.error("Błąd aktualizacji profilu w webhooku:", err);
    }
  }
}

  return NextResponse.json({ received: true })
}