import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/couple — generate or use invite code
export async function POST(req: NextRequest) {
  const { action, userId, inviteCode } = await req.json()

  if (action === 'create') {
    // Generate a unique invite code for this user
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { error } = await supabase.from('invites').insert({
      code,
      created_by: userId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ code })
  }

  if (action === 'join') {
    // Look up the invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('code', inviteCode.toUpperCase())
      .gte('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 })
    }

    if (invite.created_by === userId) {
      return NextResponse.json({ error: "That's your own code!" }, { status: 400 })
    }

    // Check neither user is already coupled
    const { data: existingCouple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId},user1_id.eq.${invite.created_by},user2_id.eq.${invite.created_by}`)
      .single()

    if (existingCouple) {
      return NextResponse.json({ error: 'One of you is already coupled up.' }, { status: 400 })
    }

    // Create couple
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .insert({
        user1_id: invite.created_by,
        user2_id: userId,
      })
      .select()
      .single()

    if (coupleError) return NextResponse.json({ error: coupleError.message }, { status: 400 })

    // Update profiles with couple_id
    await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', invite.created_by)
    await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', userId)

    // Delete invite
    await supabase.from('invites').delete().eq('code', inviteCode)

    return NextResponse.json({ success: true, coupleId: couple.id })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
