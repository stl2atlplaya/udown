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
  { title: "✦ Oh, it's on.", body: "Both of you said yes. Go." },
  { title: "✦ Mutual.", body: "Tonight's looking good. Real good. 👀" },
  { title: "✦ Well well well.", body: "Looks like you're both in the mood." },
  { title: "✦ Stars aligned.", body: "You're both down. 🔥" },
  { title: "✦ Green light.", body: "Both said yes. Put the phone down." },
  { title: "✦ The universe said yes.", body: "And so did both of you. 🌙" },
]

const MOOD_LABELS: Record<string, string> = {
  romantic: 'Romantic 🕯',
  adventurous: 'Adventurous 🔥',
  quick: 'Quick ⚡',
  slow: 'Slow night 🌙',
}

export async function POST(req: NextRequest) {
  const { userId, response, mood } = await req.json()

  // Get EST date — reset at 6am EST
  const estDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const estHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const today = estHour >= 6 ? estDate : new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const { data: profile } = await supabase
    .from('profiles').select('couple_id').eq('id', userId).single()

  if (!profile?.couple_id) return NextResponse.json({ error: 'Not coupled yet' }, { status: 400 })

  const moodValue = Array.isArray(mood) ? mood.join(',') : (mood || null)

  const { error } = await supabase.from('daily_responses').upsert({
    user_id: userId,
    couple_id: profile.couple_id,
    date: today,
    response,
    mood: moodValue,
  }, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: couple } = await supabase
    .from('couples').select('user1_id, user2_id')
    .eq('id', profile.couple_id).single()

  if (!couple) return NextResponse.json({ success: true })

  const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

  const { data: partnerResponse } = await supabase
    .from('daily_responses').select('response, mood')
    .eq('user_id', partnerId).eq('date', today).single()

  if (response === 'yes' && partnerResponse?.response === 'yes') {
    const { data: alreadyMatched } = await supabase
      .from('couples').select('last_match').eq('id', profile.couple_id).single()

    if (alreadyMatched?.last_match !== today) {
      await supabase.from('couples').update({ last_match: today }).eq('id', profile.couple_id)

      const myMoods = moodValue ? moodValue.split(',') : []
      const partnerMoods = partnerResponse.mood ? partnerResponse.mood.split(',') : []
      const sharedMoods = myMoods.filter((m: string) => partnerMoods.includes(m))

      await sendMatchNotification(userId, partnerId, sharedMoods)
    }

    return NextResponse.json({ success: true, matched: true })
  }

  return NextResponse.json({ success: true, matched: false })
}

async function sendMatchNotification(user1Id: string, user2Id: string, sharedMoods: string[]) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', [user1Id, user2Id])

  if (!subs || subs.length === 0) return

  const msg = MATCH_MESSAGES[Math.floor(Math.random() * MATCH_MESSAGES.length)]
  const moodText = sharedMoods.length > 0
    ? ` You're both feeling ${sharedMoods.map((m: string) => MOOD_LABELS[m] || m).join(' and ')}.`
    : ''

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body + moodText,
    type: 'match',
  })

  const stale: string[] = []
  await Promise.allSettled(subs.map(async ({ user_id, subscription }) => {
    try {
      await webpush.sendNotification(JSON.parse(subscription), payload)
    } catch (err: any) {
      if (err.statusCode === 410) stale.push(user_id)
    }
  }))

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale)
  }
}
