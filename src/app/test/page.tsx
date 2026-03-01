'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Result {
  ok: boolean
  message: string
}

export default function TestPanel() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [subStatus, setSubStatus] = useState<{ you: string; partner: string } | null>(null)

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

  const run = async (action: string, label: string) => {
    setRunning(action)
    try {
      const res = await fetch('/api/test-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (action === 'check-subs') {
        setSubStatus({ you: data.you, partner: data.partner })
      }
      setResults(prev => [{ ok: data.success, message: data.message || data.error }, ...prev].slice(0, 10))
    } catch (e: any) {
      setResults(prev => [{ ok: false, message: e.message }, ...prev].slice(0, 10))
    }
    setRunning(null)
  }

  if (loading) return <div style={styles.page}><div style={styles.loading}>Loading...</div></div>

  if (!user) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>u<em>Down</em></div>
        <p style={styles.sub}>Sign in to access the test panel.</p>
        <a href="/" style={styles.btn}>← Back to app</a>
      </div>
    </div>
  )

  if (!authorized) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>u<em>Down</em></div>
        <p style={styles.sub}>You're not authorized to access this panel.</p>
        <p style={{fontSize:'0.7rem',color:'#8A847C',marginTop:'0.5rem'}}>{user.email}</p>
        <a href="/" style={styles.btn}>← Back to app</a>
      </div>
    </div>
  )

  const buttons = [
    { action: 'check-subs', label: '📡 Check push subscriptions', desc: 'Verify both users are subscribed' },
    { action: 'test-daily', label: '🔔 Send daily notification', desc: 'Fires the daily prompt to YOU now' },
    { action: 'test-match', label: '✦ Send match notification', desc: 'Fires a match alert to YOU now' },
    { action: 'test-signal', label: '🌙 Send "on my way" to partner', desc: 'Fires signal notification to your partner' },
    { action: 'simulate-match', label: '💞 Simulate a match', desc: 'Sets both partners to yes — refresh app to see match screen' },
    { action: 'reset-today', label: '🔄 Reset today\'s response', desc: 'Clears your answer so you can respond again today' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>u<em>Down</em></div>
        <div style={styles.badge}>Test Panel</div>
        <p style={styles.sub}>Signed in as <span style={{color:'#E8A598'}}>{user.email}</span></p>

        {subStatus && (
          <div style={styles.subStatus}>
            <div style={{fontSize:'0.65rem',color: subStatus.you.includes('✓') ? '#7BC47F' : '#E8A598'}}>{subStatus.you} — You</div>
            <div style={{fontSize:'0.65rem',color: subStatus.partner.includes('✓') ? '#7BC47F' : '#E8A598'}}>{subStatus.partner} — Partner</div>
          </div>
        )}

        <div style={styles.btnGroup}>
          {buttons.map(({ action, label, desc }) => (
            <button
              key={action}
              style={{...styles.testBtn, opacity: running === action ? 0.6 : 1}}
              onClick={() => run(action, label)}
              disabled={!!running}
            >
              <div style={styles.testBtnLabel}>{running === action ? '...' : label}</div>
              <div style={styles.testBtnDesc}>{desc}</div>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div style={styles.results}>
            <div style={styles.resultsTitle}>Log</div>
            {results.map((r, i) => (
              <div key={i} style={{...styles.resultRow, color: r.ok ? '#7BC47F' : '#E8A598'}}>
                {r.ok ? '✓' : '✗'} {r.message}
              </div>
            ))}
          </div>
        )}

        <a href="/" style={{...styles.btn, marginTop: '1.5rem', display:'block', textAlign:'center' as const}}>← Back to app</a>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight:'100vh', background:'#1A1714', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' },
  loading: { color:'#8A847C', fontSize:'0.8rem' },
  card: { width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.6rem' },
  logo: { fontFamily:"'DM Serif Display',serif", fontSize:'1.8rem', fontStyle:'italic', color:'#F5F0E8', marginBottom:'0.2rem' },
  badge: { fontSize:'0.55rem', letterSpacing:'0.15em', textTransform:'uppercase', background:'rgba(232,165,152,0.15)', color:'#E8A598', padding:'0.25rem 0.6rem', marginBottom:'0.4rem' },
  sub: { fontSize:'0.75rem', color:'#8A847C', textAlign:'center' },
  subStatus: { width:'100%', border:'1px solid rgba(232,165,152,0.15)', padding:'0.8rem', display:'flex', flexDirection:'column', gap:'0.3rem', marginTop:'0.4rem' },
  btnGroup: { width:'100%', display:'flex', flexDirection:'column', gap:'0.6rem', marginTop:'0.8rem' },
  testBtn: { width:'100%', background:'rgba(245,240,232,0.04)', border:'1px solid rgba(232,165,152,0.15)', padding:'0.9rem 1rem', cursor:'pointer', textAlign:'left', transition:'border-color 0.2s' },
  testBtnLabel: { fontSize:'0.78rem', color:'#F5F0E8', marginBottom:'0.2rem' },
  testBtnDesc: { fontSize:'0.62rem', color:'#8A847C' },
  results: { width:'100%', border:'1px solid rgba(232,165,152,0.1)', padding:'0.8rem', marginTop:'0.8rem' },
  resultsTitle: { fontSize:'0.55rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8A847C', marginBottom:'0.6rem' },
  resultRow: { fontSize:'0.7rem', padding:'0.3rem 0', borderBottom:'1px solid rgba(255,255,255,0.04)', lineHeight:1.5 },
  btn: { fontSize:'0.72rem', color:'#8A847C', textDecoration:'none', border:'1px solid rgba(138,132,124,0.2)', padding:'0.5rem 1rem' },
}
