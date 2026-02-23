'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the tokens in the URL hash — extract and set session
    const hash = window.location.hash
    if (!hash) { setError('Invalid or expired reset link.'); return }

    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      setError('Invalid or expired reset link.')
      return
    }

    // Set the session so updateUser works
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) setError('Invalid or expired reset link.')
        else setReady(true)
      })
  }, [])

  const handleSubmit = async () => {
    if (!password || !confirm) return setError('Fill both fields.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setLoading(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false) }
    else { await supabase.auth.signOut(); setDone(true) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1A1714', color: '#F5F0E8',
      fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem'
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: '380px', width: '100%' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#E8A598', marginBottom: '2rem' }}>
          u<em style={{ color: '#8A847C' }}>Down</em>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <p style={{ fontSize: '0.9rem', color: '#8A847C', marginBottom: '2rem' }}>
              Password updated. You're good to go.
            </p>
            <a href="/" style={{
              display: 'block', background: '#C4614A', color: '#F5F0E8',
              padding: '1rem', textAlign: 'center', textDecoration: 'none',
              fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase'
            }}>
              Sign in →
            </a>
          </div>
        ) : (
          <>
            <a href="/" style={{ display: 'block', marginBottom: '1.5rem', color: '#8A847C', fontSize: '0.75rem', textDecoration: 'underline' }}>← Back to app</a>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', fontStyle: 'italic', marginBottom: '2rem' }}>
              New password.
            </h2>

            {error && (
              <p style={{ color: '#E88A8A', fontSize: '0.75rem', marginBottom: '1rem' }}>{error}</p>
            )}

            {ready && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A847C', display: 'block', marginBottom: '0.4rem' }}>
                    New password
                  </label>
                  <input
                    type="password" placeholder="6+ characters" value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      background: 'rgba(245,240,232,0.05)', border: '1px solid rgba(232,165,152,0.2)',
                      color: '#F5F0E8', padding: '0.9rem 1.2rem', fontFamily: "'DM Mono', monospace",
                      fontSize: '0.82rem', width: '100%', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A847C', display: 'block', marginBottom: '0.4rem' }}>
                    Confirm password
                  </label>
                  <input
                    type="password" placeholder="Same again" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    style={{
                      background: 'rgba(245,240,232,0.05)', border: '1px solid rgba(232,165,152,0.2)',
                      color: '#F5F0E8', padding: '0.9rem 1.2rem', fontFamily: "'DM Mono', monospace",
                      fontSize: '0.82rem', width: '100%', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={handleSubmit} disabled={loading}
                  style={{
                    background: '#C4614A', color: '#F5F0E8', border: 'none',
                    padding: '1rem', fontFamily: "'DM Mono', monospace", fontSize: '0.8rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                    width: '100%', opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Updating...' : 'Set new password →'}
                </button>
              </>
            )}

            {!ready && !error && (
              <p style={{ color: '#8A847C', fontSize: '0.8rem' }}>Verifying your link...</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
