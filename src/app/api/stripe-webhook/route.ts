import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: any
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const obj = event.data.object as any

  if (event.type === 'checkout.session.completed') {
    const userId = obj.metadata?.userId
    if (userId) {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
      const sub = await stripe.subscriptions.retrieve(obj.subscription) as any
      const premiumUntil = new Date(sub.current_period_end * 1000).toISOString()
      await supabase.from('profiles').update({ is_premium: true, premium_until: premiumUntil }).eq('id', userId)
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const customerId = obj.customer as string
    const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (profile) {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
      const sub = await stripe.subscriptions.retrieve(obj.subscription) as any
      const premiumUntil = new Date(sub.current_period_end * 1000).toISOString()
      await supabase.from('profiles').update({ is_premium: true, premium_until: premiumUntil }).eq('id', profile.id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = obj.customer as string
    const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (profile) {
      await supabase.from('profiles').update({ is_premium: false, premium_until: null }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ received: true })
}
