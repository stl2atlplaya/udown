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

async function sendPush(userId: string, payload: object) {
  const { data: sub } = await supabase
    .from('push_subscriptions').select('subscription').eq('user_id', userId).single()
  if (!sub) return
  try {
    await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(payload))
  } catch (err: any) {
    if (err.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  }
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  const { action, userId, inviteCode } = await req.json()

  if (action === 'create') {
    // Clear any existing pending invites for this user
    await supabase.from('invites').delete().eq('created_by', userId)

    const code = generateCode()
    const { error } = await supabase.from('invites').insert({
      code,
      created_by: userId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ code })
  }

  if (action === 'join') {
    // Check neither user is already coupled
    const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', userId).single()
    if (myProfile?.couple_id) return NextResponse.json({ error: 'You are already coupled up.' }, { status: 400 })

    const { data: invite } = await supabase.from('invites')
      .select('created_by, expires_at')
      .eq('code', inviteCode.toUpperCase())
      .single()

    if (!invite) return NextResponse.json({ error: 'Invalid code.' }, { status: 400 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Code has expired.' }, { status: 400 })
    if (invite.created_by === userId) return NextResponse.json({ error: "That's your own code!" }, { status: 400 })

    const { data: theirProfile } = await supabase.from('profiles').select('couple_id').eq('id', invite.created_by).single()
    if (theirProfile?.couple_id) return NextResponse.json({ error: 'Your partner is already coupled up.' }, { status: 400 })

    // Create couple
    const { data: couple, error: coupleError } = await supabase.from('couples').insert({
      user1_id: invite.created_by,
      user2_id: userId,
    }).select().single()

    if (coupleError || !couple) return NextResponse.json({ error: coupleError?.message || 'Failed to create couple' }, { status: 400 })

    // Link both profiles
    await supabase.from('profiles').update({ couple_id: couple.id }).in('id', [userId, invite.created_by])

    // Clean up invite
    await supabase.from('invites').delete().eq('code', inviteCode.toUpperCase())

    // Get both names for the notification
    const { data: joinerProfile } = await supabase.from('profiles').select('name').eq('id', userId).single()
    const joinerName = joinerProfile?.name || 'Your partner'

    // Notify Person A that their partner joined
    await sendPush(invite.created_by, {
      title: '✦ It's a match!',
      body: `${joinerName} just joined. I think you're gonna be good at this 😉`,
      type: 'coupled',
    })

    return NextResponse.json({ success: true, coupleId: couple.id })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const { userId, coupleId } = await req.json()

  if (!userId || !coupleId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Get both users in the couple
  const { data: couple } = await supabase.from('couples').select('user1_id, user2_id').eq('id', coupleId).single()

  if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

  // Unlink BOTH partners
  await supabase.from('profiles').update({ couple_id: null }).in('id', [couple.user1_id, couple.user2_id])

  // Delete the couple record
  await supabase.from('couples').delete().eq('id', coupleId)

  // Clean up push subscription snooze
  await supabase.from('push_subscriptions').update({ remind_at: null }).in('user_id', [couple.user1_id, couple.user2_id])

  return NextResponse.json({ success: true })
}
