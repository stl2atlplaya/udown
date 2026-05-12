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
  const { userId, coupleId, word } = await req.json()

  if (!word?.trim()) return NextResponse.json({ error: 'No word provided' }, { status: 400 })

  // Get EST date
  const estDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const estHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const today = estHour >= 6 ? estDate : new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const { data: couple } = await supabase
    .from('couples')
    .select('user1_id, user2_id, word_user1, word_user2, word_date')
    .eq('id', coupleId)
    .single()

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  const isUser1 = couple.user1_id === userId
  const partnerId = isUser1 ? couple.user2_id : couple.user1_id

  // Reset if it's a new day
  const wordDate = couple.word_date ? String(couple.word_date).slice(0, 10) : null
  const isNewDay = wordDate !== today

  const updates: any = { word_date: today }
  if (isNewDay) {
    updates.word_user1 = null
    updates.word_user2 = null
  }

  if (isUser1) {
    updates.word_user1 = word.trim()
  } else {
    updates.word_user2 = word.trim()
  }

  await supabase.from('couples').update(updates).eq('id', coupleId)

  // Get partner's word to return
  const partnerWord = isNewDay ? null : (isUser1 ? couple.word_user2 : couple.word_user1)

  // Send push to partner notifying them their partner set a word
  try {
    const { data: partnerSub } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', partnerId).single()
    if (partnerSub) {
      await webpush.sendNotification(JSON.parse(partnerSub.subscription), JSON.stringify({
        title: "✦ They set their word.",
        body: "Open the app to set yours and see theirs.",
        type: 'signal',
      }))
    }
  } catch {}

  return NextResponse.json({
    success: true,
    myWord: word.trim(),
    partnerWord: partnerWord || null,
  })
}

export async function GET(req: NextRequest) {
  const coupleId = req.nextUrl.searchParams.get('coupleId')
  const userId = req.nextUrl.searchParams.get('userId')
  if (!coupleId || !userId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const estDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const estHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const today = estHour >= 6 ? estDate : new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const { data: couple } = await supabase
    .from('couples')
    .select('user1_id, user2_id, word_user1, word_user2, word_date')
    .eq('id', coupleId)
    .single()

  if (!couple) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const wordDate = couple.word_date ? String(couple.word_date).slice(0, 10) : null
  if (wordDate !== today) {
    return NextResponse.json({ myWord: null, partnerWord: null })
  }

  const isUser1 = couple.user1_id === userId
  const myWord = isUser1 ? couple.word_user1 : couple.word_user2
  const partnerWord = isUser1 ? couple.word_user2 : couple.word_user1

  return NextResponse.json({ myWord: myWord || null, partnerWord: partnerWord || null })
}
