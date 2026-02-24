import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { action, userId, coupleId, ...data } = await req.json()

  // Save mood when responding
  if (action === 'save-mood') {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('daily_responses').update({ mood: data.mood }).eq('user_id', userId).eq('date', today)
    return NextResponse.json({ success: true })
  }

  // Rate a position
  if (action === 'rate-position') {
    await supabase.from('position_ratings').upsert({
      couple_id: coupleId, position_name: data.positionName, rating: data.rating
    }, { onConflict: 'couple_id,position_name' })
    return NextResponse.json({ success: true })
  }

  // Save partner note
  if (action === 'save-note') {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('partner_notes').upsert({
      couple_id: coupleId, user_id: userId, note: data.note, matched_on: today
    }, { onConflict: 'couple_id,user_id,matched_on' })
    return NextResponse.json({ success: true })
  }

  // Set custom notification hour
  if (action === 'set-notif-hour') {
    await supabase.from('profiles').update({ custom_notif_hour: data.hour }).eq('id', userId)
    return NextResponse.json({ success: true })
  }

  // Use streak protection
  if (action === 'use-streak-protection') {
    await supabase.from('profiles').update({ streak_protected: false }).eq('id', userId)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const coupleId = searchParams.get('coupleId')
  const userId = searchParams.get('userId')

  if (!coupleId) return NextResponse.json({ error: 'Missing coupleId' }, { status: 400 })

  const [ratingsRes, notesRes, historyRes] = await Promise.all([
    supabase.from('position_ratings').select('*').eq('couple_id', coupleId),
    supabase.from('partner_notes').select('*').eq('couple_id', coupleId).order('matched_on', { ascending: false }).limit(20),
    supabase.from('daily_responses').select('date,response,mood').eq('couple_id', coupleId).eq('response', 'yes').order('date', { ascending: false }).limit(90),
  ])

  return NextResponse.json({
    ratings: ratingsRes.data || [],
    notes: notesRes.data || [],
    history: historyRes.data || [],
  })
}
