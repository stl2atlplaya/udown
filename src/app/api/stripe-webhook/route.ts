import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session.metadata?.userId
    if (userId) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const premiumUntil = new Date((sub as any).current_period_end * 1000).toISOString()
      await supabase.from('profiles').update({ is_premium: true, premium_until: premiumUntil }).eq('id', userId)
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any
    const customerId = invoice.customer as string
    const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (profile) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription)
      const premiumUntil = new Date((sub as any).current_period_end * 1000).toISOString()
      await supabase.from('profiles').update({ is_premium: true, premium_until: premiumUntil }).eq('id', profile.id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = sub.customer as string
    const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (profile) {
      await supabase.from('profiles').update({ is_premium: false, premium_until: null }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ received: true })
}
