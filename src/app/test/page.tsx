'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPanel() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [results, setResults] = useState<{ok: boolean, message: string}[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [subStatus, setSubStatus] = useState<{you: string, partner: string} | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_TEST_ADMIN_EMAILS || '').split(',').map(e => e.trim())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setAuthorized(ADMIN_EMAILS.includes(session.user.email || ''))
      }
      setLoading(false)
    })
  }, [])

  const runDebug = async () => {
    const lines: string[] = []
    lines.push('Platform: ' + (navigator.userAgent.includes('iPhone') ? 'iPhone' : navigator.userAgent.includes('Android') ? 'Android' : 'Desktop'))
    lines.push('Standalone (home screen): ' + ('standalone' in navigator && (navigator as any).standalone === true ? 'YES' : 'NO - open from home screen icon'))
    lines.push('ServiceWorker supported: ' + ('serviceWorker' in navigator ? 'YES' : 'NO'))
    lines.push('PushManager supported: ' + ('PushManager' in window ? 'YES' : 'NO'))
    lines.push('Notification supported: ' + ('Notification' in window ? 'YES' : 'NO'))
    if ('Notification' in window) lines.push('Notification permission: ' + Notification.permission)
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      lines.push('SW registrations: ' + regs.length)
      for (const reg of regs) {
        lines.push('  SW scope: ' + reg.scope)
        lines.push('  SW state: ' + (reg.active?.state || 'none'))
        if (reg.pushManager) {
          const sub = await reg.pushManager.getSubscription()
          lines.push('  Push subscription: ' + (sub ? 'EXISTS' : 'NONE'))
        }
      }
    }
    setDebugInfo(lines.join('\n'))
  }

  const forceRegister = async () => {
    setRunning('register')
    const lines: string[] = []
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      lines.push('SW registered: ' + reg.scope)
      await navigator.serviceWorker.ready
      lines.push('SW ready')
      const permission = await Notification.requestPermission()
      lines.push('Permission: ' + permission)
      if (permission !== 'granted') {
        lines.push('DENIED - go to iPhone Settings > Safari > this site > Notifications > Allow')
        setDebugInfo(lines.join('\n'))
        setRunning(null)
        return
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData = atob(base64)
      const key = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; i++) key[i] = rawData.charCodeAt(i)
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      lines.push('Push subscription created')
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userId: user.id })
      })
      const data = await res.json()
      lines.push('Saved to DB: ' + (data.success ? 'YES' : 'NO - ' + JSON.stringify(data)))
      setResults(prev => [{ ok: true, message: 'Registered! Now tap Send daily notification to test.' }, ...prev])
    } catch (e: any) {
      lines.push('Error: ' + e.message)
      setResults(prev => [{ ok: false, message: e.message }, ...prev])
    }
    setDebugInfo(lines.join('\n'))
    setRunning(null)
  }

  const run = async (action: string) => {
    setRunning(action)
    try {
      const res = await fetch('/api/test-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (action === 'check-subs') setSubStatus({ you: data.you, partner: data.partner })
      setResults(prev => [{ ok: !!data.success, message: data.message || data.error }, ...prev].slice(0, 10))
    } catch (e: any) {
      setResults(prev => [{ ok: false, message: e.message }, ...prev].slice(0, 10))
    }
    setRunning(null)
  }

  if (loading) return <div style={s.page}><p style={{color:'#8A847C'}}>Loading...</p></div>
  if (!user) return <div style={s.page}><div style={s.card}><div style={s.logo}>u<em>Down</em></div><p style={s.sub}>Sign in first.</p><a href="/" style={s.link}>Back to app</a></div></div>
  if (!authorized) return <div style={s.page}><div style={s.card}><div style={s.logo}>u<em>Down</em></div><p style={s.sub}>Not authorized: {user.email}</p><a href="/" style={s.link}>Back to app</a></div></div>

  const buttons = [
    { action: 'check-subs', label: '📡 Check push subscriptions', desc: 'Verify both users are subscribed' },
    { action: 'test-daily', label: '🔔 Send daily notification', desc: 'Fires the daily prompt to YOU now' },
    { action: 'test-match', label: '✦ Send match notification', desc: 'Fires a match alert to YOU now' },
    { action: 'test-signal', label: '🌙 Send on my way to partner', desc: 'Fires signal notification to your partner' },
    { action: 'simulate-match', label: '💞 Simulate a match', desc: 'Sets both partners to yes - refresh app to see match screen' },
    { action: 'reset-today', label: '🔄 Reset response', desc: 'Clears your answer so you can respond again today' },
  ]

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>u<em>Down</em></div>
        <div style={s.badge}>Test Panel</div>
        <p style={s.sub}>Signed in as <span style={{color:'#E8A598'}}>{user.email}</span></p>

        {subStatus && (
          <div style={s.infoBox}>
            <div style={{fontSize:'0.65rem',color:subStatus.you.includes('No')?'#E8A598':'#7BC47F'}}>{subStatus.you} - You</div>
            <div style={{fontSize:'0.65rem',color:subStatus.partner.includes('No')?'#E8A598':'#7BC47F',marginTop:'0.3rem'}}>{subStatus.partner} - Partner</div>
          </div>
        )}

        <div style={{width:'100%',display:'flex',flexDirection:'column' as const,gap:'0.5rem',marginBottom:'0.5rem'}}>
          <button style={{...s.testBtn,borderColor:'rgba(232,165,152,0.4)'}} onClick={runDebug} disabled={!!running}>
            <div style={s.label}>🔍 Run diagnostics</div>
            <div style={s.desc}>Check SW, permissions, subscription status</div>
          </button>
          <button style={{...s.testBtn,borderColor:'rgba(232,165,152,0.4)'}} onClick={forceRegister} disabled={!!running}>
            <div style={s.label}>{running === 'register' ? '...' : '🔧 Force register push'}</div>
            <div style={s.desc}>Manually register and save your push subscription</div>
          </button>
        </div>

        {debugInfo && (
          <div style={{...s.infoBox,fontFamily:'monospace',fontSize:'0.6rem',whiteSpace:'pre-wrap' as const,lineHeight:1.8,marginBottom:'0.5rem'}}>
            {debugInfo}
          </div>
        )}

        <div style={{width:'100%',height:'1px',background:'rgba(255,255,255,0.06)',margin:'0.3rem 0'}} />

        <div style={{width:'100%',display:'flex',flexDirection:'column' as const,gap:'0.5rem'}}>
          {buttons.map(({ action, label, desc }) => (
            <button key={action} style={{...s.testBtn,opacity:running===action?0.6:1}} onClick={() => run(action)} disabled={!!running}>
              <div style={s.label}>{running === action ? '...' : label}</div>
              <div style={s.desc}>{desc}</div>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div style={{...s.infoBox,marginTop:'0.8rem'}}>
            <div style={{fontSize:'0.55rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.5rem'}}>Log</div>
            {results.map((r, i) => (
              <div key={i} style={{fontSize:'0.7rem',color:r.ok?'#7BC47F':'#E8A598',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',lineHeight:1.5}}>
                {r.ok ? 'OK' : 'ERR'} {r.message}
              </div>
            ))}
          </div>
        )}

        <a href="/" style={{...s.link,marginTop:'1.5rem',display:'block',textAlign:'center' as const}}>Back to app</a>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight:'100vh', background:'#1A1714', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' },
  card: { width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.6rem' },
  logo: { fontFamily:"'DM Serif Display',serif", fontSize:'1.8rem', fontStyle:'italic', color:'#F5F0E8' },
  badge: { fontSize:'0.55rem', letterSpacing:'0.15em', textTransform:'uppercase', background:'rgba(232,165,152,0.15)', color:'#E8A598', padding:'0.25rem 0.6rem' },
  sub: { fontSize:'0.75rem', color:'#8A847C', textAlign:'center' },
  infoBox: { width:'100%', border:'1px solid rgba(232,165,152,0.15)', padding:'0.8rem' },
  testBtn: { width:'100%', background:'rgba(245,240,232,0.04)', border:'1px solid rgba(232,165,152,0.15)', padding:'0.9rem 1rem', cursor:'pointer', textAlign:'left' },
  label: { fontSize:'0.78rem', color:'#F5F0E8', marginBottom:'0.2rem' },
  desc: { fontSize:'0.62rem', color:'#8A847C' },
  link: { fontSize:'0.72rem', color:'#8A847C', textDecoration:'none', border:'1px solid rgba(138,132,124,0.2)', padding:'0.5rem 1rem' },
}
