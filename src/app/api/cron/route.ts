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

const MESSAGES = [
  { title: "Hey you.", body: "Big plans tonight? No pressure. Just wondering. u down? 🌙" },
  { title: "Quick question.", body: "The couch will still be there. But so will tonight. u down?" },
  { title: "Asking for a friend.", body: "That friend is your relationship. u down tonight? 🌙" },
  { title: "No context needed.", body: "You know what this is. u down?" },
  { title: "Evening check-in.", body: "Work's done. Day's over. What are you in the mood for? 👀" },
  { title: "Just between us.", body: "Your partner doesn't know we're asking. u down tonight? 🌙" },
  { title: "A thought.", body: "Netflix will still be there tomorrow. u down?" },
  { title: "Genuine question.", body: "Is tonight a good night? We're asking. u down? 🌙" },
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowUtc = new Date()
  const todayEst = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const todayKey = todayEst.toISOString().split('T')[0]

  // Check if we already have a scheduled time for today
  const { data: existing } = await supabase
    .from('daily_schedule')
    .select('send_at, sent')
    .eq('date', todayKey)
    .single()

  let sendAt: Date

  if (!existing) {
    // Pick a random time between 4:00pm and 6:00pm EST today
    const randomMinutes = Math.floor(Math.random() * 121) // 0-120 mins
    const sendEst = new Date(todayEst)
    sendEst.setHours(16, randomMinutes, 0, 0) // 4pm + random minutes

    // Convert back to UTC for storage
    sendAt = new Date(sendEst.toLocaleString('en-US', { timeZone: 'UTC' }))

    await supabase.from('daily_schedule').insert({
      date: todayKey,
      send_at: sendAt.toISOString(),
      sent: false,
    })
  } else if (existing.sent) {
    // Already sent today
    return NextResponse.json({ status: 'already_sent_today' })
  } else {
    sendAt = new Date(existing.send_at)
  }

  // Check if it's time to send yet
  if (nowUtc < sendAt) {
    const minutesUntil = Math.round((sendAt.getTime() - nowUtc.getTime()) / 60000)
    return NextResponse.json({ status: 'not_yet', minutesUntil })
  }

  // Time to send! Mark as sent first to prevent duplicates
  await supabase.from('daily_schedule').update({ sent: true }).eq('date', todayKey)

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  const payload = JSON.stringify({ title: msg.title, body: msg.body, type: 'daily' })

  let sent = 0
  const stale: string[] = []

  await Promise.allSettled(subs.map(async ({ user_id, subscription }) => {
    try {
      await webpush.sendNotification(JSON.parse(subscription), payload)
      sent++
    } catch (err: any) {
      if (err.statusCode === 410) stale.push(user_id)
    }
  }))

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale)
  }

  return NextResponse.json({ status: 'sent', sent, stale: stale.length })
}
