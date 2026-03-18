import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const coupleId = req.nextUrl.searchParams.get('coupleId')
  if (!coupleId) return NextResponse.json({ error: 'Missing coupleId' }, { status: 400 })

  const currentMonth = new Date().toISOString().slice(0, 7) // "2026-03"

  const { data: couple } = await supabase
    .from('couples')
    .select('goal_target, goal_month, goal_set_by, user1_id, user2_id')
    .eq('id', coupleId)
    .single()

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  // Count matches this month
  const { data: responses } = await supabase
    .from('daily_responses')
    .select('date, user_id, response')
    .eq('couple_id', coupleId)
    .gte('date', `${currentMonth}-01`)
    .eq('response', 'yes')

  // Count days where both said yes
  const dateMap: Record<string, Set<string>> = {}
  for (const r of responses || []) {
    if (!dateMap[r.date]) dateMap[r.date] = new Set()
    dateMap[r.date].add(r.user_id)
  }
  const matchCount = Object.values(dateMap).filter(users =>
    users.has(couple.user1_id) && users.has(couple.user2_id)
  ).length

  // Reset goal if it's a new month
  const activeGoal = couple.goal_month === currentMonth ? couple.goal_target : null

  return NextResponse.json({
    goalTarget: activeGoal,
    goalMonth: currentMonth,
    matchCount,
    isNewMonth: couple.goal_month !== currentMonth,
  })
}

export async function POST(req: NextRequest) {
  const { coupleId, userId, target } = await req.json()
  const currentMonth = new Date().toISOString().slice(0, 7)

  await supabase.from('couples').update({
    goal_target: target,
    goal_set_by: userId,
    goal_set_at: new Date().toISOString(),
    goal_month: currentMonth,
  }).eq('id', coupleId)

  return NextResponse.json({ success: true })
}
