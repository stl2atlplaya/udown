import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await supabase
    .from('push_subscriptions')
    .update({ remind_at: remindAt })
    .eq('user_id', userId)

  return NextResponse.json({ success: true, remindAt })
}
