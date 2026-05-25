// app/api/webhook/stripe/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-30' as any,
})

// Używamy Service Role (sb_secret_...), aby móc zapisać status płatności bezpośrednio w bazie danych, omijając blokady RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  // Weryfikacja, czy powiadomienie na pewno pochodzi od Stripe
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Błąd weryfikacji podpisu webhooka: ${err.message}`)
    return NextResponse.json({ error: `Błąd weryfikacji: ${err.message}` }, { status: 400 })
  }

  // Obsługujemy zdarzenie pomyślnego opłacenia jednorazowego koszyka
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = session.customer as string

    // Aktualizujemy status w tabeli profiles na 'paid'
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'paid', 
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Błąd aktualizacji bazy danych Supabase:', error)
      return NextResponse.json({ error: 'Nie udało się zaktualizować profilu' }, { status: 500 })
    }
    
    console.log(`Płatność udana dla klienta o ID: ${customerId}`)
  }

  return NextResponse.json({ received: true })
}