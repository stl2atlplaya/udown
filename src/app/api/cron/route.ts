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

function getEstNow() {
  const now = new Date()
  const estStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  return new Date(estStr)
}

function minutesToday(minutes: number): Date {
  const est = getEstNow()
  const d = new Date(est)
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return d
}

function randomInRange(min: number, max: number): number {
  const steps = Math.floor((max - min) / 5)
  return min + Math.floor(Math.random() * steps) * 5
}

async function sendPush(subscription: string, payload: string): Promise<'sent' | 'stale' | 'error'> {
  try {
    await webpush.sendNotification(JSON.parse(subscription), payload)
    return 'sent'
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) return 'stale'
    return 'error'
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const estNow = getEstNow()
  const nowMinutes = estNow.getHours() * 60 + estNow.getMinutes()
  const todayKey = estNow.toLocaleDateString('en-CA')

  // --- Handle reminders first ---
  const { data: remindSubs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription, remind_at')
    .not('remind_at', 'is', null)

  if (remindSubs && remindSubs.length > 0) {
    const staleUsers: string[] = []
    await Promise.allSettled(remindSubs.map(async ({ user_id, subscription, remind_at }) => {
      if (!remind_at) return
      const remindTime = new Date(remind_at)
      if (estNow >= remindTime) {
        const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]
        const result = await sendPush(subscription, JSON.stringify({ title: msg.title, body: msg.body, type: 'reminder' }))
        if (result === 'stale') staleUsers.push(user_id)
        else await supabase.from('push_subscriptions').update({ remind_at: null }).eq('user_id', user_id)
      }
    }))
    if (staleUsers.length > 0) {
      await supabase.from('push_subscriptions').delete().in('user_id', staleUsers)
    }
  }

  // --- Per-user custom notification times ---
  // Get all subscriptions with their profiles and couple same_time preference
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select(`
      user_id,
      subscription,
      profiles!inner(custom_notif_hour, couple_id),
      daily_responses(response, date)
    `)

  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  // Get couples with same_time_notif
  const { data: couples } = await supabase
    .from('couples')
    .select('id, user1_id, user2_id, same_time_notif')

  const coupleMap: Record<string, any> = {}
  couples?.forEach(c => { coupleMap[c.id] = c })

  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  let sent = 0
  const staleUsers: string[] = []

  await Promise.allSettled(subs.map(async ({ user_id, subscription, profiles: profRaw }: any) => {
    const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw

    // Check if already responded today
    const todayResp = prof?.daily_responses?.find((r: any) => r.date === todayKey)
    if (todayResp) return // already answered today, skip

    // Determine send time for this user
    let sendMinutes: number

    const coupleId = prof?.couple_id
    const couple = coupleId ? coupleMap[coupleId] : null

    if (couple?.same_time_notif) {
      // Use couple's shared time — based on user1's preference
      const user1Sub = subs.find((s: any) => s.user_id === couple.user1_id)
      const user1Prof = Array.isArray(user1Sub?.profiles) ? user1Sub.profiles[0] : user1Sub?.profiles
      const user1Mins = user1Prof?.custom_notif_hour
      sendMinutes = user1Mins
        ? (user1Mins > 100 ? user1Mins : user1Mins * 60)
        : randomInRange(1020, 1200) // default evening
    } else if (prof?.custom_notif_hour) {
      // Individual custom time
      const raw = prof.custom_notif_hour
      sendMinutes = raw > 100 ? raw : raw * 60 // handle legacy hour format
    } else {
      // Default: random within evening window 5-8pm
      sendMinutes = randomInRange(1020, 1200)
    }

    // Check if it's time to send
    if (nowMinutes < sendMinutes) return

    // Check if already sent today (using daily_schedule per user would be ideal
    // but for now we check if they have a response — if not, send)
    const payload = JSON.stringify({ title: msg.title, body: msg.body, type: 'daily' })
    const result = await sendPush(subscription, payload)
    if (result === 'sent') sent++
    else if (result === 'stale') staleUsers.push(user_id)
  }))

  if (staleUsers.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', staleUsers)
  }

  return NextResponse.json({ status: 'done', sent, stale: staleUsers.length, time: nowMinutes })
}
