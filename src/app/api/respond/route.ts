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

const MATCH_MESSAGES = [
  { title: "✦ It's a yes.", body: "You're both down. Don't waste it. 🌙" },
  { title: "✦ Oh, it's on.", body: "Both of you said yes. We're saying nothing else. Go." },
  { title: "✦ Mutual.", body: "Tonight's looking good. Real good. 👀" },
  { title: "✦ Well well well.", body: "Looks like you're both in the mood. Funny how that works." },
  { title: "✦ Stars aligned.", body: "You're both down. We'll let the two of you take it from here. 🔥" },
  { title: "✦ Green light.", body: "Both said yes. Put the phone down. Seriously." },
  { title: "✦ Noted. By both of you.", body: "Tonight's on the table. Don't leave it there." },
  { title: "✦ The universe said yes.", body: "And so did both of you. Make it count. 🌙" },
]

export async function POST(req: NextRequest) {
  const { userId, response } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  const { data: profile } = await supabase
    .from('profiles').select('couple_id').eq('id', userId).single()

  if (!profile?.couple_id) {
    return NextResponse.json({ error: 'Not coupled yet' }, { status: 400 })
  }

  const { error } = await supabase.from('daily_responses').upsert({
    user_id: userId,
    couple_id: profile.couple_id,
    date: today,
    response,
  }, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: couple } = await supabase
    .from('couples').select('user1_id, user2_id')
    .eq('id', profile.couple_id).single()

  if (!couple) return NextResponse.json({ success: true })

  const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

  const { data: partnerResponse } = await supabase
    .from('daily_responses').select('response')
    .eq('user_id', partnerId).eq('date', today).single()

  if (response === 'yes' && partnerResponse?.response === 'yes') {
    await sendMatchNotification(userId, partnerId)
    await supabase.from('couples').update({ last_match: today }).eq('id', profile.couple_id)
    return NextResponse.json({ success: true, matched: true })
  }

  return NextResponse.json({ success: true, matched: false })
}

async function sendMatchNotification(user1Id: string, user2Id: string) {
  const { data: subs } = await supabase
    .from('push_subscriptions').select('subscription')
    .in('user_id', [user1Id, user2Id])

  const msg = MATCH_MESSAGES[Math.floor(Math.random() * MATCH_MESSAGES.length)]

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    type: 'match',
  })

  const promises = (subs || []).map(({ subscription }) => {
    try { return webpush.sendNotification(JSON.parse(subscription), payload) }
    catch { return Promise.resolve() }
  })

  await Promise.allSettled(promises)
}
