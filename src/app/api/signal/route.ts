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

async function sendPush(userId: string, payload: object) {
  const { data: sub } = await supabase
    .from('push_subscriptions').select('subscription').eq('user_id', userId).single()
  if (!sub) return
  try {
    await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(payload))
  } catch (err: any) {
    if (err.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  }
}

export async function POST(req: NextRequest) {
  const { userId, type, time } = await req.json()

  const { data: profile } = await supabase
    .from('profiles').select('couple_id, name').eq('id', userId).single()
  if (!profile?.couple_id) return NextResponse.json({ error: 'Not coupled' }, { status: 400 })

  const { data: couple } = await supabase
    .from('couples').select('user1_id, user2_id, suggested_time, suggested_by')
    .eq('id', profile.couple_id).single()
  if (!couple) return NextResponse.json({ error: 'No couple' }, { status: 400 })

  const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

  // On my way
  if (type === 'on_my_way') {
    await sendPush(partnerId, {
      title: "🌙 On my way.",
      body: "See you soon.",
      type: 'signal',
    })
    return NextResponse.json({ success: true })
  }

  // Suggest a time (new or counter)
  if (type === 'suggest_time') {
    await supabase.from('couples').update({
      suggested_time: time,
      suggested_by: userId,
      suggestion_declined: false,
      confirmed_time: null,
    }).eq('id', profile.couple_id)

    await sendPush(partnerId, {
      title: `✦ How about ${time}?`,
      body: "Open the app to confirm or suggest another time.",
      type: 'time_suggestion',
    })
    return NextResponse.json({ success: true })
  }

  // Approve suggested time
  if (type === 'approve_time') {
    const confirmedTime = couple.suggested_time
    await supabase.from('couples').update({
      confirmed_time: confirmedTime,
      suggested_time: null,
      suggested_by: null,
      suggestion_declined: false,
    }).eq('id', profile.couple_id)

    // Notify the person who suggested
    await sendPush(couple.suggested_by, {
      title: `✦ ${confirmedTime} works.`,
      body: "You're both on the same page. 🌙",
      type: 'time_confirmed',
    })
    return NextResponse.json({ success: true, confirmedTime })
  }

  // Decline — flip it back to the suggester's court
  if (type === 'decline_time') {
    const originalSuggestor = couple.suggested_by

    await supabase.from('couples').update({
      suggestion_declined: true,
      // Keep suggested_time so they can see what was declined
      // Flip suggested_by to the person who declined so the suggester knows it's their turn
      suggested_by: userId, // now the "ball" is with the original suggestor
    }).eq('id', profile.couple_id)

    // Notify original suggestor it's their turn
    await sendPush(originalSuggestor, {
      title: "That time didn't work.",
      body: "Open the app to suggest a new time. 🌙",
      type: 'time_declined',
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
