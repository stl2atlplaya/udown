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
  const { userId, response } = await req.json() // response: 'yes' | 'no'

  const today = new Date().toISOString().split('T')[0]

  // Get user's profile + couple
  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', userId)
    .single()

  if (!profile?.couple_id) {
    return NextResponse.json({ error: 'Not coupled yet' }, { status: 400 })
  }

  // Record response (upsert in case of re-tap)
  const { error } = await supabase.from('daily_responses').upsert({
    user_id: userId,
    couple_id: profile.couple_id,
    date: today,
    response,
  }, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Check if partner has also responded
  const { data: couple } = await supabase
    .from('couples')
    .select('user1_id, user2_id')
    .eq('id', profile.couple_id)
    .single()

  if (!couple) return NextResponse.json({ success: true })

  const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

  const { data: partnerResponse } = await supabase
    .from('daily_responses')
    .select('response')
    .eq('user_id', partnerId)
    .eq('date', today)
    .single()

  // If BOTH said yes — send the magic notification to both
  if (response === 'yes' && partnerResponse?.response === 'yes') {
    await sendMatchNotification(userId, partnerId)

    // Mark couple as matched for today
    await supabase.from('couples').update({
      last_match: today,
    }).eq('id', profile.couple_id)
  }

  return NextResponse.json({ success: true, matched: response === 'yes' && partnerResponse?.response === 'yes' })
}

async function sendMatchNotification(user1Id: string, user2Id: string) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .in('user_id', [user1Id, user2Id])

  const payload = JSON.stringify({
    title: "✦ You're both down.",
    body: "Tonight's the night. We'll see ourselves out.",
    type: 'match',
  })

  const promises = (subs || []).map(({ subscription }) => {
    try {
      return webpush.sendNotification(JSON.parse(subscription), payload)
    } catch {
      return Promise.resolve()
    }
  })

  await Promise.allSettled(promises)
}
