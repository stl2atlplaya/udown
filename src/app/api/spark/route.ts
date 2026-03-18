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

// Curated spark prompts — enough for a year of weekly prompts
const SPARK_PROMPTS = [
  "What's something you've always wanted to try together but never brought up?",
  "Describe your perfect evening in three words. Compare answers.",
  "What's something your partner does that still surprises you?",
  "When did you first know this was something real?",
  "What's one thing you wish happened more between you two?",
  "What's a memory from early in your relationship you still think about?",
  "If you had one night with no responsibilities, what would you do?",
  "What's something your partner does that makes you feel most seen?",
  "What's a fantasy you've never fully said out loud?",
  "What does intimacy mean to you — right now, at this point in your life?",
  "What's the most spontaneous thing you've ever done together?",
  "What would your ideal Saturday morning look like?",
  "What's something about your partner that you find unexpectedly attractive?",
  "When do you feel closest to your partner?",
  "What's something you want more of — and haven't asked for?",
  "What's a ritual you two have that you'd never want to lose?",
  "Describe a moment recently where you felt completely connected.",
  "What's one thing you could do this week to make your partner feel desired?",
  "What's something you're still figuring out about what you want?",
  "If tonight were a movie, what genre would it be?",
  "What do you miss most about early in your relationship?",
  "What's something small your partner does that means more than they know?",
  "What's a place you'd love to be together right now?",
  "What does your partner do that makes you feel safe?",
  "What's one thing you've never told your partner you appreciate about them?",
  "What's something you want to get better at — together?",
  "When was the last time you were genuinely surprised by your partner?",
  "What's a dream you have that involves both of you?",
  "What would make this month feel meaningful?",
  "What's something you'd do differently if you weren't tired or busy?",
  "What's the best version of your relationship look like in a year?",
  "What's something you want your partner to know but haven't said lately?",
  "What makes you feel most like yourself around your partner?",
  "What's one word for how you want tonight to feel?",
  "What do you need more of right now — and does your partner know?",
  "What's the most intimate non-physical moment you've shared recently?",
  "What's something on your mind that you haven't brought up yet?",
  "What would you do if you knew your partner was 100% in the mood?",
  "What's a version of intimacy you haven't explored yet?",
  "What does your partner do that no one else does?",
  "What's something you love about where you are right now — as a couple?",
  "What's a question you've wanted to ask but haven't?",
  "What makes you feel most desired?",
  "What's something you want your relationship to feel like this year?",
  "When do you feel most like a team?",
  "What's something you appreciate about how your partner loves you?",
  "What's the most romantic thing your partner has ever done?",
  "What's something you want to do before the year is over — together?",
  "What's one habit you'd love to build as a couple?",
  "What does your partner do that you never want them to stop?",
  "What would tonight look like if everything went exactly right?",
  "What's something you want to be braver about — with your partner?",
]

function getWeekKey(date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getPromptForWeek(weekKey: string): string {
  // Deterministic prompt based on week key
  const hash = weekKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return SPARK_PROMPTS[hash % SPARK_PROMPTS.length]
}

export async function GET(req: NextRequest) {
  const coupleId = req.nextUrl.searchParams.get('coupleId')
  const userId = req.nextUrl.searchParams.get('userId')
  if (!coupleId) return NextResponse.json({ error: 'Missing coupleId' }, { status: 400 })

  const weekKey = getWeekKey()
  const prompt = getPromptForWeek(weekKey)

  // Get my reflection if any
  const { data: myResponse } = await supabase
    .from('spark_responses')
    .select('reflection')
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .eq('week_key', weekKey)
    .single()

  return NextResponse.json({ weekKey, prompt, myReflection: myResponse?.reflection || null })
}

export async function POST(req: NextRequest) {
  const { action, coupleId, userId, reflection } = await req.json()

  if (action === 'save-reflection') {
    await supabase.from('spark_responses').upsert({
      couple_id: coupleId,
      user_id: userId,
      week_key: getWeekKey(),
      reflection,
    }, { onConflict: 'couple_id,user_id,week_key' })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
