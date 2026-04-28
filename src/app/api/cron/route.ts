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
  { title: "Hey there...", body: "uDown? 🌙" },
  { title: "Checking in...", body: "uDown? 👀" },
  { title: "So....", body: "uDown? 🌙" },
  { title: "Just wonderin'...", body: "uDown? 👀" },
  { title: "Is tonight the night?", body: "uDown? 🌙" },
]

const REMINDER_MESSAGES = [
  { title: "Still here...", body: "uDown? 🌙" },
  { title: "An hour later...", body: "uDown? 👀" },
  { title: "Checking back in...", body: "uDown? 🌙" },
  { title: "Still wonderin'...", body: "uDown? 👀" },
  { title: "One more time...", body: "uDown? 🌙" },
]

async function sendToUser(subscription: string, payload: string): Promise<'sent' | 'stale'> {
  try {
    await webpush.sendNotification(JSON.parse(subscription), payload)
    return 'sent'
  } catch (err: any) {
    if (err.statusCode === 410) return 'stale'
    return 'stale'
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowUtc = new Date()
  const todayEst = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const todayKey = todayEst.toISOString().split('T')[0]

  // --- Handle pending reminders ---
  const { data: remindSubs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription, remind_at')
    .not('remind_at', 'is', null)
    .lte('remind_at', nowUtc.toISOString())

  if (remindSubs && remindSubs.length > 0) {
    const remMsg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]
    const remPayload = JSON.stringify({ title: remMsg.title, body: remMsg.body, type: 'daily' })
    const staleUsers: string[] = []

    await Promise.allSettled(remindSubs.map(async ({ user_id, subscription }) => {
      const result = await sendToUser(subscription, remPayload)
      if (result === 'stale') staleUsers.push(user_id)
    }))

    // Clear remind_at for all processed users
    await supabase
      .from('push_subscriptions')
      .update({ remind_at: null })
      .in('user_id', remindSubs.map(s => s.user_id))

    if (staleUsers.length > 0) {
      await supabase.from('push_subscriptions').delete().in('user_id', staleUsers)
    }
  }

  // --- Handle daily notification ---
  const { data: existing } = await supabase
    .from('daily_schedule')
    .select('send_at, sent')
    .eq('date', todayKey)
    .single()

  let sendAt: Date

  if (!existing) {
    const randomMinutes = Math.floor(Math.random() * 121)
    const sendEst = new Date(todayEst)
    sendEst.setHours(16, randomMinutes, 0, 0)
    sendAt = new Date(sendEst.toLocaleString('en-US', { timeZone: 'UTC' }))
    await supabase.from('daily_schedule').insert({
      date: todayKey,
      send_at: sendAt.toISOString(),
      sent: false,
    })
  } else if (existing.sent) {
    return NextResponse.json({ status: 'already_sent_today', reminders: remindSubs?.length ?? 0 })
  } else {
    sendAt = new Date(existing.send_at)
  }

  if (nowUtc < sendAt) {
    const minutesUntil = Math.round((sendAt.getTime() - nowUtc.getTime()) / 60000)
    return NextResponse.json({ status: 'not_yet', minutesUntil })
  }

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
    const result = await sendToUser(subscription, payload)
    if (result === 'sent') sent++
    else stale.push(user_id)
  }))

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale)
  }

  return NextResponse.json({ status: 'sent', sent, stale: stale.length })
}
