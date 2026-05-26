import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Tworzymy klienta admina, który omija zabezpieczenia RLS w bazie i zawsze zapisuje dane
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Odczytujemy przesłany pakiet z body żądania
    const { tier } = await request.json()

    // Walidacja przesłanego pakietu
    if (!tier || !['mini', 'medium', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Niepoprawny pakiet subskrypcji!' }, { status: 400 })
    }

    const supabase = await getSupabaseServer()

    // 1. Sprawdzamy, który użytkownik wysłał prośbę o zakup
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany!' }, { status: 401 })
    }

    // MAPOWANIE PAKIETÓW NA IDENTYFIKATORY CEN ZE STRIPE
    // Zastąp poniższe wartości rzeczywistymi identyfikatorami cen (Price ID) z Twojego panelu Stripe
    const PRICE_IDS: Record<string, string> = {
      mini: 'price_1TbQ9904jpvEtRODKKge92mt',       // np. 'price_1...'
      medium: 'price_1TbQ8m04jpvEtROD7jxGIlBO',   // np. 'price_2...'
      premium: 'price_1Tb2pg04jpvEtROD0DSO03r2',       // Twój aktualny Price ID
    }

    const priceId = PRICE_IDS[tier]

    if (!priceId || priceId.startsWith('TU_WPISZ')) {
      return NextResponse.json(
        { error: `Brak skonfigurowanego Price ID dla pakietu: ${tier}.` }, 
        { status: 400 }
      )
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

    // 4. Tworzymy sesję płatności (koszyk) w Stripe z wybranym priceId
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'blik', 'p24'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      // PRZEKAZYWANIE METADANYCH: Bardzo ważne dla webhooka, który przetwarza udaną płatność
      metadata: {
        supabase_user_id: user.id,
        tier: tier // Przekazujemy informację o wybranym pakiecie (mini/medium/premium)
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          tier: tier
        }
      },
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