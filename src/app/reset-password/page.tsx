'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) { setError('Invalid or expired reset link.'); return }
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    if (type !== 'recovery' || !accessToken || !refreshToken) { setError('Invalid or expired reset link.'); return }
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => { if (error) setError('Invalid or expired reset link.'); else setReady(true) })
  }, [])

  const handleSubmit = async () => {
    if (!password || !confirm) return setError('Fill both fields.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); setLoading(false) }
    else window.location.href = '/'
  }

  return (
    <div style={{ minHeight:'100vh', background:'#1A1714', color:'#F5F0E8', fontFamily:'monospace', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
      <div style={{ maxWidth:'380px', width:'100%' }}>
        <a href="/" style={{ display:'block', marginBottom:'2rem', color:'#8A847C', fontSize:'0.8rem', textDecoration:'underline' }}>← Back to app</a>
        <h2 style={{ fontSize:'2rem', fontStyle:'italic', marginBottom:'1.5rem' }}>New password.</h2>
        {error && <p style={{ color:'#E88A8A', fontSize:'0.8rem', marginBottom:'1rem' }}>{error}</p>}
        {!ready && !error && <p style={{ color:'#8A847C' }}>Verifying...</p>}
        {ready && <>
          <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ display:'block', width:'100%', padding:'0.9rem', marginBottom:'1rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(232,165,152,0.2)', color:'#F5F0E8', fontSize:'0.9rem', boxSizing:'border-box' as const }} />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)}
            style={{ display:'block', width:'100%', padding:'0.9rem', marginBottom:'1.5rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(232,165,152,0.2)', color:'#F5F0E8', fontSize:'0.9rem', boxSizing:'border-box' as const }} />
          <button onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', padding:'1rem', background:'#C4614A', color:'#F5F0E8', border:'none', cursor:'pointer', fontSize:'0.8rem', letterSpacing:'0.1em', textTransform:'uppercase' as const }}>
            {loading ? 'Updating...' : 'Set new password →'}
          </button>
        </>}
      </div>
    </div>
  )
}
