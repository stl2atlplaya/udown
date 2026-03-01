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

export async function POST(req: NextRequest) {
  const { userId, type, time } = await req.json()

  const { data: profile } = await supabase
    .from('profiles').select('couple_id, name').eq('id', userId).single()

  if (!profile?.couple_id) return NextResponse.json({ error: 'Not coupled' }, { status: 400 })

  const { data: couple } = await supabase
    .from('couples').select('user1_id, user2_id')
    .eq('id', profile.couple_id).single()

  if (!couple) return NextResponse.json({ error: 'No couple' }, { status: 400 })

  const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

  const { data: partnerSub } = await supabase
    .from('push_subscriptions').select('subscription')
    .eq('user_id', partnerId).single()

  if (!partnerSub) return NextResponse.json({ error: 'Partner not subscribed' }, { status: 400 })

  const payload = type === 'on_my_way'
    ? JSON.stringify({
        title: "🌙 On my way.",
        body: "See you soon.",
        type: 'signal',
      })
    : JSON.stringify({
        title: `✦ Tonight at ${time}`,
        body: "It's on the calendar. Don't be late. 🌙",
        type: 'signal',
      })

  try {
    await webpush.sendNotification(JSON.parse(partnerSub.subscription), payload)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('user_id', partnerId)
    }
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
