import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const ALLOWED_EMAILS = (process.env.TEST_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, email } = body

    // Debug: always return what we received and what's allowed
    if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        received: email, 
        allowed: ALLOWED_EMAILS,
        env_set: !!process.env.TEST_ADMIN_EMAILS
      }, { status: 401 })
    }

    if (action === 'test-daily') {
      const { data: sub, error: subError } = await supabase
        .from('push_subscriptions').select('subscription').eq('user_id', userId).single()
      if (!sub) return NextResponse.json({ error: 'No push subscription found. Use Force Register first.', subError }, { status: 400 })
      await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify({
        title: "🧪 Test daily prompt",
        body: "This is a test. u down tonight? 🌙",
        type: 'daily',
      }))
      return NextResponse.json({ success: true, message: 'Daily notification sent!' })
    }

    if (action === 'test-match') {
      const { data: sub } = await supabase
        .from('push_subscriptions').select('subscription').eq('user_id', userId).single()
      if (!sub) return NextResponse.json({ error: 'No push subscription found.' }, { status: 400 })
      await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify({
        title: "✦ It's a yes.",
        body: "You're both down. Don't waste it. 🌙 (test)",
        type: 'match',
      }))
      return NextResponse.json({ success: true, message: 'Match notification sent!' })
    }

    if (action === 'test-signal') {
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', userId).single()
      if (!profile?.couple_id) return NextResponse.json({ error: 'No couple linked.' }, { status: 400 })
      const { data: couple } = await supabase.from('couples').select('user1_id, user2_id').eq('id', profile.couple_id).single()
      const partnerId = couple?.user1_id === userId ? couple?.user2_id : couple?.user1_id
      const { data: partnerSub } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', partnerId).single()
      if (!partnerSub) return NextResponse.json({ error: 'Partner has no push subscription.' }, { status: 400 })
      await webpush.sendNotification(JSON.parse(partnerSub.subscription), JSON.stringify({
        title: "🌙 On my way. (test)",
        body: "See you soon.",
        type: 'signal',
      }))
      return NextResponse.json({ success: true, message: 'Signal sent to partner!' })
    }

    if (action === 'reset-today') {
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('daily_responses').delete().eq('user_id', userId).eq('date', today)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', userId).single()
      if (profile?.couple_id) {
        const { data: couple } = await supabase.from('couples').select('last_match').eq('id', profile.couple_id).single()
        if (couple?.last_match === today) {
          await supabase.from('couples').update({ last_match: null }).eq('id', profile.couple_id)
        }
      }
      return NextResponse.json({ success: true, message: "Today's response cleared. You can answer again." })
    }

    if (action === 'simulate-match') {
      const today = new Date().toISOString().split('T')[0]
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', userId).single()
      if (!profile?.couple_id) return NextResponse.json({ error: 'No couple linked.' }, { status: 400 })
      const { data: couple } = await supabase.from('couples').select('user1_id, user2_id').eq('id', profile.couple_id).single()
      if (!couple) return NextResponse.json({ error: 'Couple not found.' }, { status: 400 })
      const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id
      await supabase.from('daily_responses').upsert([
        { user_id: userId, couple_id: profile.couple_id, date: today, response: 'yes' },
        { user_id: partnerId, couple_id: profile.couple_id, date: today, response: 'yes' },
      ], { onConflict: 'user_id,date' })
      await supabase.from('couples').update({ last_match: today }).eq('id', profile.couple_id)
      return NextResponse.json({ success: true, message: 'Match simulated! Refresh the app to see the match screen.' })
    }

    if (action === 'check-subs') {
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', userId).single()
      const { data: couple } = profile?.couple_id 
        ? await supabase.from('couples').select('user1_id, user2_id').eq('id', profile.couple_id).single()
        : { data: null }
      const pid = couple ? (couple.user1_id === userId ? couple.user2_id : couple.user1_id) : null
      const { data: mySub } = await supabase.from('push_subscriptions').select('user_id').eq('user_id', userId).single()
      const { data: partnerSub } = pid ? await supabase.from('push_subscriptions').select('user_id').eq('user_id', pid).single() : { data: null }
      return NextResponse.json({
        success: true,
        you: mySub ? 'Subscribed' : 'No subscription',
        partner: partnerSub ? 'Subscribed' : 'No subscription',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
