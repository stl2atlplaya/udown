import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { userId, email, priceId } = await req.json()

  // Get or create Stripe customer
  let { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', userId).single()
  
  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://udown-2lda.vercel.app'}/?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://udown-2lda.vercel.app'}/?upgraded=false`,
    metadata: { userId },
  })

  return NextResponse.json({ url: session.url })
}
