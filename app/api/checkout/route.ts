// app/api/checkout/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js' // Dodajemy import standardowego klienta dla admina
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Tworzymy klienta admina, który omija zabezpieczenia RLS w bazie i zawsze zapisuje dane
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const supabase = await getSupabaseServer()

    // 1. Sprawdzamy, który użytkownik wysłał prośbę o zakup
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany!' }, { status: 401 })
    }

    // 2. Szukamy profilu użytkownika w bazie używając admina (aby na pewno odczytać dane)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    // 3. Jeśli nie ma ID klienta Stripe, tworzymy go w panelu Stripe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Zapisujemy ID klienta używając ADMINA (zabezpieczenia RLS zostaną ominięte)
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          stripe_customer_id: customerId
        })
    }

    // 4. Tworzymy sesję płatności (koszyk) w Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'blik', 'p24'],
      line_items: [
        {
          // Twój właściwy Price ID pobrany ze Stripe
          price: 'price_1Tb2pg04jpvEtROD0DSO03r2', 
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?payment=canceled`,
    })

    // Zwracamy link do bezpiecznej strony Stripe
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}