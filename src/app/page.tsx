'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { registerPush } from '@/lib/push'
import type { User } from '@supabase/supabase-js'
import styles from './page.module.css'

type Screen = 'landing' | 'login' | 'signup' | 'forgot-password' | 'couple-setup' | 'home' | 'settings'
type CoupleStatus = 'none' | 'pending-send' | 'pending-receive' | 'linked'

interface Profile {
  id: string
  name: string
  couple_id: string | null
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayResponse, setTodayResponse] = useState<'yes' | 'no' | null>(null)
  const [matched, setMatched] = useState(false)
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus>('none')
  const [inviteCode, setInviteCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [coupleId, setCoupleId] = useState('')
  const [yesCount, setYesCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setLoading(false); setScreen('landing') }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)

    if (data?.couple_id) {
      setCoupleId(data.couple_id)
      const { data: couple } = await supabase
        .from('couples')
        .select('user1_id, user2_id, last_match')
        .eq('id', data.couple_id)
        .single()

      if (couple) {
        const pid = couple.user1_id === userId ? couple.user2_id : couple.user1_id
        setPartnerId(pid)
        const { data: partnerProfile } = await supabase
          .from('profiles').select('name').eq('id', pid).single()
        setPartnerName(partnerProfile?.name || 'your partner')

        const today = new Date().toISOString().split('T')[0]
        if (couple.last_match === today) setMatched(true)

        // Count mutual yes matches
        const { count } = await supabase
          .from('daily_responses')
          .select('date', { count: 'exact', head: false })
          .eq('couple_id', data.couple_id)
          .eq('response', 'yes')
          .eq('user_id', userId)
        
        // Get partner yes count for same dates to find matches
        const { data: myYes } = await supabase
          .from('daily_responses')
          .select('date')
          .eq('couple_id', data.couple_id)
          .eq('response', 'yes')
          .eq('user_id', userId)

        const { data: partnerYes } = await supabase
          .from('daily_responses')
          .select('date')
          .eq('couple_id', data.couple_id)
          .eq('response', 'yes')
          .eq('user_id', pid)

        if (myYes && partnerYes) {
          const myDates = new Set(myYes.map((r: any) => r.date))
          const matches = partnerYes.filter((r: any) => myDates.has(r.date))
          setYesCount(matches.length)
        }
      }

      const today = new Date().toISOString().split('T')[0]
      const { data: resp } = await supabase
        .from('daily_responses').select('response')
        .eq('user_id', userId).eq('date', today).single()
      if (resp) setTodayResponse(resp.response as 'yes' | 'no')

      setCoupleStatus('linked')
      setScreen('home')
    } else {
      setScreen('couple-setup')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  const enablePush = async (userId: string) => {
    try {
      const sub = await registerPush()
      if (sub) {
        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, userId }),
        })
      }
    } catch (e) { console.error('Push failed:', e) }
  }

  const handleRemovePartner = async () => {
    if (!confirm('Remove your partner? You can reconnect anytime with a new invite code.')) return
    await fetch('/api/couple', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, coupleId }),
    })
    setPartnerName('')
    setPartnerId('')
    setCoupleId('')
    setYesCount(0)
    setMatched(false)
    setTodayResponse(null)
    setProfile(p => p ? { ...p, couple_id: null } : p)
    setScreen('couple-setup')
  }

  if (loading) return <Splash />
  if (screen === 'landing') return <Landing onLogin={() => setScreen('login')} onSignup={() => setScreen('signup')} />
  if (screen === 'login') return <Login onBack={() => setScreen('landing')} onForgot={() => setScreen('forgot-password')} onSuccess={() => {}} />
  if (screen === 'signup') return <Signup onBack={() => setScreen('landing')} onSuccess={(u) => { setUser(u); enablePush(u.id) }} />
  if (screen === 'forgot-password') return <ForgotPassword onBack={() => setScreen('login')} />
  if (screen === 'couple-setup') return (
    <CoupleSetup
      userId={user?.id || ''}
      generatedCode={generatedCode}
      setGeneratedCode={setGeneratedCode}
      inviteCode={inviteCode}
      setInviteCode={setInviteCode}
      coupleStatus={coupleStatus}
      setCoupleStatus={setCoupleStatus}
      onLinked={() => { loadProfile(user!.id) }}
    />
  )
  if (screen === 'settings') return (
    <Settings
      profile={profile}
      partnerName={partnerName}
      yesCount={yesCount}
      onRemovePartner={handleRemovePartner}
      onBack={() => setScreen('home')}
      onSignOut={async () => {
        await supabase.auth.signOut()
        setScreen('landing'); setProfile(null); setTodayResponse(null); setMatched(false)
      }}
    />
  )
  if (screen === 'home') return (
    <Home
      profile={profile}
      partnerName={partnerName}
      todayResponse={todayResponse}
      matched={matched}
      yesCount={yesCount}
      onRespond={async (r) => {
        const res = await fetch('/api/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, response: r }),
        })
        const data = await res.json()
        setTodayResponse(r)
        if (data.matched) { setMatched(true); setYesCount(c => c + 1) }
      }}
      onSettings={() => setScreen('settings')}
      onSignOut={async () => {
        await supabase.auth.signOut()
        setScreen('landing'); setProfile(null); setTodayResponse(null); setMatched(false)
      }}
    />
  )
  return null
}

// ── SPLASH ──────────────────────────────────────────────────────────
function Splash() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashLogo}>u<span>Down</span></div>
    </div>
  )
}

// ── LANDING ─────────────────────────────────────────────────────────
function Landing({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div className={styles.landing}>
      <div className={styles.landingBg} />
      <div className={styles.landingContent}>
        <div className={styles.landingLogo}>u<em>Down</em></div>
        <h1 className={styles.landingH1}>Are you<br /><em>feeling it</em><br />tonight?</h1>
        <p className={styles.landingSub}>
          Once a day, we ask the question.<br />
          Both say yes? We let you know.<br />
          Simple as that.
        </p>
        <div className={styles.landingButtons}>
          <button className="btn btn-yes" onClick={onSignup}>Create account</button>
          <button className="btn btn-ghost" onClick={onLogin}>Sign in</button>
        </div>
      </div>
      <div className={styles.landingFooter}>Private by design. No awkward conversations required.</div>
    </div>
  )
}

// ── SIGNUP ──────────────────────────────────────────────────────────
function Signup({ onBack, onSuccess }: { onBack: () => void; onSuccess: (u: User) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name || !email || !password) return setError('Fill everything in.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    setLoading(true); setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Something went wrong.')
      setLoading(false); return
    }
    await supabase.from('profiles').insert({ id: data.user.id, name, email })
    onSuccess(data.user)
  }

  return (
    <AuthShell title="Let's get started." onBack={onBack}>
      <div className={styles.formGroup}>
        <label className="label">Your name</label>
        <input className="input" placeholder="First name is fine" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className="label">Email</label>
        <input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className="label">Password</label>
        <input className="input" type="password" placeholder="6+ characters" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      {error && <p className="error-msg">{error}</p>}
      <button className="btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'One sec...' : 'Create account →'}
      </button>
    </AuthShell>
  )
}

// ── LOGIN ────────────────────────────────────────────────────────────
function Login({ onBack, onForgot, onSuccess }: { onBack: () => void; onForgot: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true); setError('')
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { setError('Wrong email or password.'); setLoading(false) }
  }

  return (
    <AuthShell title="Welcome back." onBack={onBack}>
      <div className={styles.formGroup}>
        <label className="label">Email</label>
        <input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className={styles.formGroup}>
        <label className="label">Password</label>
        <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      {error && <p className="error-msg">{error}</p>}
      <button className="btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in →'}
      </button>
      <button className={styles.forgotLink} onClick={onForgot}>Forgot password?</button>
    </AuthShell>
  )
}

// ── FORGOT PASSWORD ──────────────────────────────────────────────────
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email) return setError('Enter your email.')
    setLoading(true); setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/',
    })
    if (resetError) { setError(resetError.message); setLoading(false) }
    else setSent(true)
  }

  return (
    <AuthShell title="Reset password." onBack={onBack}>
      {sent ? (
        <div className={styles.sentMsg}>
          <div className={styles.sentIcon}>📬</div>
          <p>Check your email. We sent a reset link.</p>
          <button className="btn btn-ghost" onClick={onBack} style={{marginTop:'1rem'}}>Back to sign in</button>
        </div>
      ) : (
        <>
          <p className={styles.hint} style={{marginBottom:'1rem'}}>
            Enter your email and we'll send you a link to reset your password.
          </p>
          <div className={styles.formGroup}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link →'}
          </button>
        </>
      )}
    </AuthShell>
  )
}

// ── COUPLE SETUP ─────────────────────────────────────────────────────
function CoupleSetup({ userId, generatedCode, setGeneratedCode, inviteCode, setInviteCode, coupleStatus, setCoupleStatus, onLinked }: any) {
  const [tab, setTab] = useState<'send' | 'receive'>('send')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const generateCode = async () => {
    setLoading(true)
    const res = await fetch('/api/couple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', userId }),
    })
    const data = await res.json()
    if (data.code) { setGeneratedCode(data.code); setCoupleStatus('pending-send') }
    setLoading(false)
  }

  const joinWithCode = async () => {
    if (!inviteCode) return
    setLoading(true); setError('')
    const res = await fetch('/api/couple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', userId, inviteCode }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false) }
    else onLinked()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.screenInner}>
        <div className={styles.screenHeader}>
          <div className={styles.logo}>u<em>Down</em></div>
          <p className={styles.screenSub}>Link up with your partner</p>
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'send' ? styles.tabActive : ''}`} onClick={() => setTab('send')}>I'll invite them</button>
          <button className={`${styles.tab} ${tab === 'receive' ? styles.tabActive : ''}`} onClick={() => setTab('receive')}>I have a code</button>
        </div>
        {tab === 'send' && (
          <div className={styles.tabContent}>
            {!generatedCode ? (
              <>
                <p className={styles.hint}>Generate a code and send it to your partner.</p>
                <button className="btn" onClick={generateCode} disabled={loading}>{loading ? 'Generating...' : 'Generate invite code'}</button>
              </>
            ) : (
              <>
                <p className={styles.hint}>Send this to your partner. Expires in 24 hours.</p>
                <div className={styles.codeDisplay}>{generatedCode}</div>
                <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(generatedCode)}>Copy code</button>
                <p className={styles.waiting}>Waiting for them to join...</p>
              </>
            )}
          </div>
        )}
        {tab === 'receive' && (
          <div className={styles.tabContent}>
            <p className={styles.hint}>Enter the code your partner sent you.</p>
            <div className={styles.formGroup}>
              <input className="input" placeholder="e.g. AB3X9K" value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())} maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.2rem', textAlign: 'center' }} />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn" onClick={joinWithCode} disabled={loading || inviteCode.length < 6}>
              {loading ? 'Connecting...' : 'Connect →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── HOME ─────────────────────────────────────────────────────────────
function Home({ profile, partnerName, todayResponse, matched, yesCount, onRespond, onSettings, onSignOut }: {
  profile: Profile | null; partnerName: string; todayResponse: 'yes' | 'no' | null
  matched: boolean; yesCount: number
  onRespond: (r: 'yes' | 'no') => Promise<void>; onSettings: () => void; onSignOut: () => void
}) {
  const [loading, setLoading] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : 'Good evening'

  const respond = async (r: 'yes' | 'no') => {
    setLoading(true); await onRespond(r); setLoading(false)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.homeHeader}>
        <div className={styles.logo}>u<em>Down</em></div>
        <div className={styles.homeHeaderRight}>
          {yesCount > 0 && (
            <div className={styles.yesCounter} title="Times you've both said yes">
              ✦ {yesCount}
            </div>
          )}
          <button className={styles.settingsBtn} onClick={onSettings}>⚙</button>
          <button className={styles.signOut} onClick={onSignOut}>sign out</button>
        </div>
      </div>

      <div className={styles.homeBody}>
        <div className={styles.homeGlow} />
        {matched ? (
          <div className={styles.matchState}>
            <div className={styles.matchIcon}>✦</div>
            <h2 className={`${styles.matchTitle} serif`}>You're both down.</h2>
            <p className={styles.matchSub}>Tonight's the night. We'll see ourselves out.</p>
            <p className={styles.matchSmall}>See you tomorrow, {profile?.name}.</p>
            {yesCount > 0 && <div className={styles.matchCount}>✦ {yesCount} {yesCount === 1 ? 'time' : 'times'} and counting</div>}
          </div>
        ) : todayResponse ? (
          <div className={styles.respondedState}>
            <div className={styles.respondedIcon}>{todayResponse === 'yes' ? '👀' : '🌙'}</div>
            <h2 className={`${styles.respondedTitle} serif`}>{todayResponse === 'yes' ? 'Got it.' : 'No worries.'}</h2>
            <p className={styles.respondedSub}>
              {todayResponse === 'yes'
                ? `Waiting on ${partnerName}. If they're down too, you'll both know.`
                : "We'll check in again tomorrow."}
            </p>
            <div className={styles.responseTag}>
              You said <span className={todayResponse === 'yes' ? styles.tagYes : styles.tagNo}>
                {todayResponse === 'yes' ? 'yes' : 'no'}
              </span> today
            </div>
          </div>
        ) : (
          <div className={styles.promptState}>
            <p className={styles.promptGreeting}>{greeting}, {profile?.name}.</p>
            <h2 className={`${styles.promptQuestion} serif`}>u down<br /><em>tonight?</em></h2>
            <p className={styles.promptSub}>{partnerName} won't know what you said.<br />Unless you both say yes.</p>
            <div className={styles.responseButtons}>
              <button className="btn btn-yes" onClick={() => respond('yes')} disabled={loading}>Yeah 👀</button>
              <button className="btn btn-no" onClick={() => respond('no')} disabled={loading}>Not tonight</button>
            </div>
          </div>
        )}
      </div>
      <div className={styles.homeFooter}>Private by design. {partnerName} can't see your answer.</div>
    </div>
  )
}

// ── SETTINGS ─────────────────────────────────────────────────────────
function Settings({ profile, partnerName, yesCount, onRemovePartner, onBack, onSignOut }: {
  profile: Profile | null; partnerName: string; yesCount: number
  onRemovePartner: () => void; onBack: () => void; onSignOut: () => void
}) {
  return (
    <div className={styles.screen}>
      <div className={styles.screenInner}>
        <button className={styles.backBtn} onClick={onBack}>← back</button>
        <div className={styles.logo}>u<em>Down</em></div>
        <h2 className={`${styles.authTitle} serif`}>Account.</h2>

        <div className={styles.settingsCard}>
          <div className={styles.settingsLabel}>You</div>
          <div className={styles.settingsValue}>{profile?.name}</div>
        </div>

        {partnerName && (
          <div className={styles.settingsCard}>
            <div className={styles.settingsLabel}>Your partner</div>
            <div className={styles.settingsValue}>{partnerName}</div>
            <div className={styles.settingsSub}>
              Together you've both said yes <strong style={{color:'var(--blush)'}}>{yesCount} {yesCount === 1 ? 'time' : 'times'}</strong>. Not bad.
            </div>
            <button className={styles.dangerBtn} onClick={onRemovePartner}>Remove partner</button>
          </div>
        )}

        <div style={{marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
          <button className="btn btn-ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

// ── AUTH SHELL ───────────────────────────────────────────────────────
function AuthShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className={styles.screen}>
      <div className={styles.screenInner}>
        <button className={styles.backBtn} onClick={onBack}>← back</button>
        <div className={styles.logo}>u<em>Down</em></div>
        <h2 className={`${styles.authTitle} serif`}>{title}</h2>
        <div className={styles.authForm}>{children}</div>
      </div>
    </div>
  )
}
