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
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all users with push subscriptions
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  // Pick a random message for today
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    type: 'daily',
  })

  let sent = 0
  const stale: string[] = []

  const promises = subs.map(async ({ user_id, subscription }) => {
    try {
      await webpush.sendNotification(JSON.parse(subscription), payload)
      sent++
    } catch (err: any) {
      // 410 Gone = subscription expired/invalid, clean it up
      if (err.statusCode === 410) {
        stale.push(user_id)
      }
    }
  })

  await Promise.allSettled(promises)

  // Remove stale subscriptions
  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale)
  }

  return NextResponse.json({ sent, stale: stale.length })
}
