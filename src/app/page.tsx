'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { registerPush } from '@/lib/push'
import type { User } from '@supabase/supabase-js'
import styles from './page.module.css'

type Screen = 'landing' | 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'couple-setup' | 'home' | 'settings' | 'upgrade' | 'premium-home'
type CoupleStatus = 'none' | 'pending-send' | 'pending-receive' | 'linked'

interface Profile {
  id: string
  name: string
  email: string
  couple_id: string | null
  is_premium: boolean
  premium_until: string | null
  stripe_customer_id: string | null
  custom_notif_hour: number | null
  streak_protected: boolean
  streak_uses: number
}

const MOODS = [
  { key: 'romantic', label: '🕯 Romantic', desc: 'Slow and connected' },
  { key: 'adventurous', label: '🔥 Adventurous', desc: 'Try something new' },
  { key: 'quick', label: '⚡ Quick', desc: 'Short on time' },
  { key: 'slow', label: '🌙 Slow night', desc: 'Take our time' },
]

const POSITIONS = [
  { name: "The Lotus", description: "Face to face, wrapped together. Slow and intimate.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="18" r="5" stroke="#E8A598" strokeWidth="1.5"/><circle cx="68" cy="18" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 23 C45 30 40 40 45 50 C50 58 58 60 60 60 C62 60 70 58 75 50 C80 40 75 30 68 23" stroke="#8A847C" strokeWidth="1.5" fill="none"/><path d="M52 23 C55 30 58 35 60 38 C62 35 65 30 68 23" stroke="#E8A598" strokeWidth="1.5" fill="none"/><path d="M42 42 C38 45 36 50 40 54" stroke="#E8A598" strokeWidth="1.5"/><path d="M78 42 C82 45 84 50 80 54" stroke="#8A847C" strokeWidth="1.5"/><path d="M45 50 C40 55 42 62 48 64" stroke="#E8A598" strokeWidth="1.5"/><path d="M75 50 C80 55 78 62 72 64" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Missionary", description: "Classic for a reason. Eye contact, full connection.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 25 L60 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 32 L70 32" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 48 L52 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 48 L68 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="62" cy="52" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M56 57 C50 57 44 60 42 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 57 C74 57 80 60 82 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 57 L55 70" stroke="#8A847C" strokeWidth="1.5"/><path d="M66 57 L69 70" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Cowgirl", description: "One partner takes the lead. All the control.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="15" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 20 L60 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 28 L70 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L48 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L72 58" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="58" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 63 L46 75" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 63 L74 75" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Spooning", description: "Close, warm, unhurried. Perfect for tonight.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="35" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 40 C35 48 38 52 40 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M25 44 L45 44" stroke="#8A847C" strokeWidth="1.5"/><path d="M40 55 L32 68" stroke="#8A847C" strokeWidth="1.5"/><path d="M40 55 L48 68" stroke="#8A847C" strokeWidth="1.5"/><circle cx="42" cy="32" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 37 C42 45 45 49 47 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M32 41 L52 41" stroke="#E8A598" strokeWidth="1.5"/><path d="M47 52 L39 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M47 52 L55 65" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Bridge", description: "Arched and open. Surprisingly deep.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="38" cy="62" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 58 C30 45 35 30 50 28 C65 26 75 35 72 50" stroke="#E8A598" strokeWidth="1.5"/><path d="M28 65 L35 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M48 65 L42 67" stroke="#E8A598" strokeWidth="1.5"/><circle cx="72" cy="40" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 45 L72 60" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 52 L82 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 60 L65 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 60 L79 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Doggy Style", description: "Primal and passionate. No eye contact required.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M30 35 C30 42 32 46 35 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M20 40 L40 38" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 48 L28 62" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 48 L42 62" stroke="#E8A598" strokeWidth="1.5"/><circle cx="78" cy="38" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 43 C75 50 70 52 65 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 48 L88 44" stroke="#8A847C" strokeWidth="1.5"/><path d="M65 52 L60 64" stroke="#8A847C" strokeWidth="1.5"/><path d="M75 55 L72 66" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Reverse Cowgirl", description: "A different angle. A different experience.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="15" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 20 L60 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 28 L70 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L48 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L72 58" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="55" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 60 L46 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 60 L74 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Cat", description: "Like missionary, but shifted. Every movement counts.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="55" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 25 L58 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M45 32 L68 30" stroke="#E8A598" strokeWidth="1.5"/><path d="M58 48 L50 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M58 48 L66 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="65" cy="48" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 53 C52 53 46 56 44 61" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 53 C78 53 82 56 82 61" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 53 L57 66" stroke="#8A847C" strokeWidth="1.5"/><path d="M70 53 L73 66" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Standing", description: "Spontaneous. Against the wall. Why not.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="12" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 17 L52 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 25 L62 25" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 42 L46 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 42 L58 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="68" cy="15" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 20 L68 45" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 28 L78 28" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 45 L62 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 45 L74 65" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Pretzel", description: "Intertwined and close. Takes a second to find the rhythm.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="45" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M45 25 C42 35 38 42 40 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 32 L55 30" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 52 L34 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 52 L52 58" stroke="#E8A598" strokeWidth="1.5"/><circle cx="72" cy="35" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 40 C70 48 65 52 60 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 42 L82 40" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 55 L55 68" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 55 L68 65" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Seated", description: "Face to face, lap to lap. Deeply intimate.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="55" cy="22" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 27 L55 48" stroke="#8A847C" strokeWidth="1.5"/><path d="M45 35 L65 35" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 48 L45 58" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 48 L65 58" stroke="#8A847C" strokeWidth="1.5"/><circle cx="60" cy="18" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M56 23 C52 30 50 38 52 46" stroke="#E8A598" strokeWidth="1.5"/><path d="M46 30 L62 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 46 L46 56" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 46 L60 52" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Waterfall", description: "Head rushes. Literally.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="65" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 60 L60 38" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 52 L70 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 38 L52 22" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 38 L68 22" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="42" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 47 C46 47 40 50 38 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 47 C74 47 80 50 82 55" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Edge of Bed", description: "Simple setup. Surprisingly good angle.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="55" width="50" height="6" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><circle cx="42" cy="35" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 40 L42 55" stroke="#E8A598" strokeWidth="1.5"/><path d="M32 47 L52 47" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 55 L30 70" stroke="#E8A598" strokeWidth="1.5"/><path d="M49 55 L54 70" stroke="#E8A598" strokeWidth="1.5"/><circle cx="78" cy="40" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 45 L78 62" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 52 L88 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M73 62 L68 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M83 62 L88 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Snake", description: "Lying flat, close as possible. Slow burn.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="38" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M27 38 L75 40" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 34 L42 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M75 40 L88 36" stroke="#E8A598" strokeWidth="1.5"/><path d="M75 40 L85 46" stroke="#E8A598" strokeWidth="1.5"/><circle cx="25" cy="43" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M30 43 L78 45" stroke="#8A847C" strokeWidth="1.5"/><path d="M50 39 L50 47" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 45 L90 41" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 45 L88 51" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Sphinx", description: "Half raised, half surrendered. Intense.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="32" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M30 37 C30 44 33 48 36 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M20 42 L42 40" stroke="#E8A598" strokeWidth="1.5"/><path d="M36 52 L28 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M36 52 L44 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="78" cy="45" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M65 50 L90 48" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 50 L72 62" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 50 L86 60" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Legs Up", description: "Deep and deliberate. Communication helps.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="55" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 50 L40 35" stroke="#E8A598" strokeWidth="1.5"/><path d="M30 42 L50 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 35 L30 18" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 35 L50 18" stroke="#E8A598" strokeWidth="1.5"/><circle cx="72" cy="42" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 47 L72 62" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 54 L82 54" stroke="#8A847C" strokeWidth="1.5"/><path d="M67 62 L62 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M77 62 L82 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Chairperson", description: "Seated power dynamic. Very good use of furniture.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="42" y="48" width="36" height="5" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><rect x="72" y="53" width="4" height="18" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><rect x="44" y="53" width="4" height="18" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><circle cx="60" cy="28" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 33 L60 48" stroke="#8A847C" strokeWidth="1.5"/><path d="M50 40 L70 40" stroke="#8A847C" strokeWidth="1.5"/><circle cx="60" cy="22" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 27 C52 33 52 40 55 46" stroke="#E8A598" strokeWidth="1.5"/><path d="M46 33 L62 31" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Butter Churner", description: "Adventurous. Worth trying at least once.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="68" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 63 L60 45" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 55 L70 55" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 45 L48 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 45 L72 28" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="38" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 43 C46 43 40 46 38 51" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 43 C74 43 80 46 82 51" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Side by Side", description: "Lazy and lovely. Sunday morning energy.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="32" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 37 L35 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M25 45 L45 45" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 55 L28 70" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 55 L42 70" stroke="#8A847C" strokeWidth="1.5"/><circle cx="65" cy="35" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 40 L65 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 48 L75 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 58 L58 72" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 58 L72 72" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Yab-Yum", description: "Ancient tantric position. Breathing together matters.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="55" cy="25" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 30 C52 38 50 45 52 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M45 38 L65 36" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 52 L44 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 52 L62 60" stroke="#8A847C" strokeWidth="1.5"/><circle cx="62" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M62 25 C62 33 60 40 58 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 32 L70 30" stroke="#E8A598" strokeWidth="1.5"/><path d="M58 48 L52 60" stroke="#E8A598" strokeWidth="1.5"/><path d="M58 48 L66 56" stroke="#E8A598" strokeWidth="1.5"/></svg> },
]

function getTodayPosition() {
  const today = new Date().toISOString().split('T')[0]
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0)
  return POSITIONS[seed % POSITIONS.length]
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayResponse, setTodayResponse] = useState<'yes' | 'no' | null>(null)
  const [todayMood, setTodayMood] = useState<string | null>(null)
  const [matched, setMatched] = useState(false)
  const [partnerMood, setPartnerMood] = useState<string | null>(null)
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus>('none')
  const [inviteCode, setInviteCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [coupleId, setCoupleId] = useState('')
  const [yesCount, setYesCount] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [premiumData, setPremiumData] = useState<any>(null)
  const isRecovery = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { isRecovery.current = true; setScreen('reset-password'); setLoading(false); return }
      if (isRecovery.current) return
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setLoading(false); setScreen('landing') }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isRecovery.current) return
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })
    // Check for upgrade success
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('upgraded') === 'true') window.history.replaceState({}, '', '/')
    }
    return () => subscription.unsubscribe()
  }, [])

  const calculateStreaks = (myYesDates: string[], partnerYesDates: string[]) => {
    const partnerSet = new Set(partnerYesDates)
    const matchDates = myYesDates.filter(d => partnerSet.has(d)).sort()
    if (matchDates.length === 0) return { current: 0, longest: 0 }
    let longest = 1, tempStreak = 1
    for (let i = 1; i < matchDates.length; i++) {
      const diff = (new Date(matchDates[i]).getTime() - new Date(matchDates[i-1]).getTime()) / 86400000
      if (diff === 1) { tempStreak++; if (tempStreak > longest) longest = tempStreak }
      else tempStreak = 1
    }
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lastMatch = matchDates[matchDates.length - 1]
    return { current: (lastMatch === today || lastMatch === yesterday) ? tempStreak : 0, longest: Math.max(longest, tempStreak) }
  }

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    if (data?.couple_id) {
      setCoupleId(data.couple_id)
      const { data: couple } = await supabase.from('couples').select('user1_id, user2_id, last_match').eq('id', data.couple_id).single()
      if (couple) {
        const pid = couple.user1_id === userId ? couple.user2_id : couple.user1_id
        setPartnerId(pid)
        const { data: pp } = await supabase.from('profiles').select('name').eq('id', pid).single()
        setPartnerName(pp?.name || 'your partner')
        const today = new Date().toISOString().split('T')[0]
        if (couple.last_match === today) setMatched(true)
        const [myRes, partnerRes] = await Promise.all([
          supabase.from('daily_responses').select('date,response,mood').eq('couple_id', data.couple_id).eq('user_id', userId),
          supabase.from('daily_responses').select('date,response,mood').eq('couple_id', data.couple_id).eq('user_id', pid),
        ])
        const myYes = (myRes.data || []).filter((r: any) => r.response === 'yes')
        const partnerYes = (partnerRes.data || []).filter((r: any) => r.response === 'yes')
        const mySet = new Set(myYes.map((r: any) => r.date))
        setYesCount(partnerYes.filter((r: any) => mySet.has(r.date)).length)
        const streaks = calculateStreaks(myYes.map((r: any) => r.date), partnerYes.map((r: any) => r.date))
        setCurrentStreak(streaks.current)
        setLongestStreak(streaks.longest)
        const todayMyResp = (myRes.data || []).find((r: any) => r.date === today)
        const todayPartnerResp = (partnerRes.data || []).find((r: any) => r.date === today)
        if (todayMyResp) { setTodayResponse(todayMyResp.response as 'yes' | 'no'); setTodayMood(todayMyResp.mood) }
        if (todayPartnerResp?.mood && couple.last_match === today) setPartnerMood(todayPartnerResp.mood)
        // Load premium data
        if (data.is_premium) {
          const res = await fetch(`/api/premium?coupleId=${data.couple_id}&userId=${userId}`)
          const pd = await res.json()
          setPremiumData(pd)
        }
      }
      setCoupleStatus('linked')
      setScreen('home')
    } else {
      setScreen('couple-setup')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error)
  }, [])

  const enablePush = async (userId: string) => {
    try {
      const sub = await registerPush()
      if (sub) await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub, userId }) })
    } catch (e) { console.error('Push failed:', e) }
  }

  const handleUpgrade = async (priceId: string) => {
    if (!user || !profile) return
    const res = await fetch('/api/stripe-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email, priceId }) })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  const handleRemovePartner = async () => {
    if (!confirm('Remove your partner?')) return
    await fetch('/api/couple', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, coupleId }) })
    setPartnerName(''); setPartnerId(''); setCoupleId(''); setYesCount(0); setMatched(false); setTodayResponse(null); setCurrentStreak(0); setLongestStreak(0)
    setProfile(p => p ? { ...p, couple_id: null } : p)
    setScreen('couple-setup')
  }

  if (loading) return <Splash />
  if (screen === 'reset-password') return <ResetPassword onDone={() => { isRecovery.current = false; setScreen('login') }} />
  if (screen === 'landing') return <Landing onLogin={() => setScreen('login')} onSignup={() => setScreen('signup')} />
  if (screen === 'login') return <Login onBack={() => setScreen('landing')} onForgot={() => setScreen('forgot-password')} onSuccess={() => {}} />
  if (screen === 'signup') return <Signup onBack={() => setScreen('landing')} onSuccess={(u) => { setUser(u); enablePush(u.id) }} />
  if (screen === 'forgot-password') return <ForgotPassword onBack={() => setScreen('login')} />
  if (screen === 'couple-setup') return <CoupleSetup userId={user?.id || ''} generatedCode={generatedCode} setGeneratedCode={setGeneratedCode} inviteCode={inviteCode} setInviteCode={setInviteCode} coupleStatus={coupleStatus} setCoupleStatus={setCoupleStatus} onLinked={() => loadProfile(user!.id)} />
  if (screen === 'upgrade') return <Upgrade profile={profile} onUpgrade={handleUpgrade} onBack={() => setScreen('home')} />
  if (screen === 'settings') return <Settings profile={profile} partnerName={partnerName} yesCount={yesCount} currentStreak={currentStreak} longestStreak={longestStreak} coupleId={coupleId} premiumData={premiumData} onUpgrade={() => setScreen('upgrade')} onRemovePartner={handleRemovePartner} onBack={() => setScreen('home')} onSaveNotifHour={async (h) => { await fetch('/api/premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-notif-hour', userId: user?.id, hour: h }) }); setProfile(p => p ? { ...p, custom_notif_hour: h } : p) }} onSignOut={async () => { await supabase.auth.signOut(); setScreen('landing'); setProfile(null); setTodayResponse(null); setMatched(false) }} />
  if (screen === 'home') return (
    <Home
      profile={profile} partnerName={partnerName} todayResponse={todayResponse} todayMood={todayMood}
      matched={matched} partnerMood={partnerMood} yesCount={yesCount} currentStreak={currentStreak}
      longestStreak={longestStreak} premiumData={premiumData} coupleId={coupleId} userId={user?.id || ''}
      onRespond={async (r, mood) => {
        const res = await fetch('/api/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, response: r }) })
        const data = await res.json()
        setTodayResponse(r); setTodayMood(mood || null)
        if (mood && profile?.is_premium) await fetch('/api/premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save-mood', userId: user?.id, mood }) })
        if (data.matched) {
          setMatched(true); setYesCount(c => c + 1)
          if (yesCount + 1 === 10 || yesCount + 1 === 25 || yesCount + 1 === 50) {
            // Milestone!
          }
        }
      }}
      onRatePosition={async (posName, rating) => { await fetch('/api/premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rate-position', coupleId, positionName: posName, rating }) }); setPremiumData((pd: any) => ({ ...pd, ratings: [...(pd?.ratings || []).filter((r: any) => r.position_name !== posName), { position_name: posName, rating }] })) }}
      onSaveNote={async (note) => { await fetch('/api/premium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save-note', userId: user?.id, coupleId, note }) }); setPremiumData((pd: any) => ({ ...pd, notes: [{ note, matched_on: new Date().toISOString().split('T')[0], user_id: user?.id }, ...(pd?.notes || [])] })) }}
      onUpgrade={() => setScreen('upgrade')}
      onSettings={() => setScreen('settings')}
      onSignOut={async () => { await supabase.auth.signOut(); setScreen('landing'); setProfile(null); setTodayResponse(null); setMatched(false) }}
    />
  )
  return null
}

function Splash() {
  return <div className={styles.splash}><div className={styles.splashLogo}>u<span>Down</span></div></div>
}

function Landing({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div className={styles.landing}>
      <div className={styles.landingBg} />
      <div className={styles.landingContent}>
        <div className={styles.landingLogo}>u<em>Down</em></div>
        <h1 className={styles.landingH1}>Are you<br /><em>feeling it</em><br />tonight?</h1>
        <p className={styles.landingSub}>Once a day, we ask the question.<br />Both say yes? We let you know.<br />Simple as that.</p>
        <div className={styles.landingButtons}>
          <button className="btn btn-yes" onClick={onSignup}>Create account</button>
          <button className="btn btn-ghost" onClick={onLogin}>Sign in</button>
        </div>
      </div>
      <div className={styles.landingFooter}>Private by design. No awkward conversations required.</div>
    </div>
  )
}

function Signup({ onBack, onSuccess }: { onBack: () => void; onSuccess: (u: User) => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const handleSubmit = async () => {
    if (!name || !email || !password) return setError('Fill everything in.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    setLoading(true); setError('')
    const { data, error: e } = await supabase.auth.signUp({ email, password })
    if (e || !data.user) { setError(e?.message || 'Something went wrong.'); setLoading(false); return }
    await supabase.from('profiles').insert({ id: data.user.id, name, email })
    onSuccess(data.user)
  }
  return (
    <AuthShell title="Let's get started." onBack={onBack}>
      <div className={styles.formGroup}><label className="label">Your name</label><input className="input" placeholder="First name is fine" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className={styles.formGroup}><label className="label">Email</label><input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className={styles.formGroup}><label className="label">Password</label><input className="input" type="password" placeholder="6+ characters" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p className="error-msg">{error}</p>}
      <button className="btn" onClick={handleSubmit} disabled={loading}>{loading ? 'One sec...' : 'Create account →'}</button>
    </AuthShell>
  )
}

function Login({ onBack, onForgot, onSuccess }: { onBack: () => void; onForgot: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const handleSubmit = async () => {
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError('Wrong email or password.'); setLoading(false) }
  }
  return (
    <AuthShell title="Welcome back." onBack={onBack}>
      <div className={styles.formGroup}><label className="label">Email</label><input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className={styles.formGroup}><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p className="error-msg">{error}</p>}
      <button className="btn" onClick={handleSubmit} disabled={loading}>{loading ? 'Signing in...' : 'Sign in →'}</button>
      <button className={styles.forgotLink} onClick={onForgot}>Forgot password?</button>
    </AuthShell>
  )
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const handleSubmit = async () => {
    if (!email) return setError('Enter your email.')
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://udown-2lda.vercel.app/' })
    if (e) { setError(e.message); setLoading(false) } else setSent(true)
  }
  return (
    <AuthShell title="Reset password." onBack={onBack}>
      {sent ? <div className={styles.sentMsg}><div className={styles.sentIcon}>📬</div><p>Check your email.</p><button className="btn btn-ghost" onClick={onBack} style={{marginTop:'1rem'}}>Back to sign in</button></div> : (
        <><div className={styles.formGroup}><label className="label">Email</label><input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        {error && <p className="error-msg">{error}</p>}
        <button className="btn" onClick={handleSubmit} disabled={loading}>{loading ? 'Sending...' : 'Send reset link →'}</button></>
      )}
    </AuthShell>
  )
}

function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false)
  const handleSubmit = async () => {
    if (!password || !confirm) return setError('Fill both fields.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); setLoading(false) } else setDone(true)
  }
  return (
    <AuthShell title="New password." onBack={onDone}>
      {done ? <div className={styles.sentMsg}><div className={styles.sentIcon}>✓</div><p>Password updated.</p><button className="btn" onClick={onDone} style={{marginTop:'1rem'}}>Sign in →</button></div> : (
        <><div className={styles.formGroup}><label className="label">New password</label><input className="input" type="password" placeholder="6+ characters" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div className={styles.formGroup}><label className="label">Confirm</label><input className="input" type="password" placeholder="Same again" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
        {error && <p className="error-msg">{error}</p>}
        <button className="btn" onClick={handleSubmit} disabled={loading}>{loading ? 'Updating...' : 'Set new password →'}</button></>
      )}
    </AuthShell>
  )
}

function CoupleSetup({ userId, generatedCode, setGeneratedCode, inviteCode, setInviteCode, coupleStatus, setCoupleStatus, onLinked }: any) {
  const [tab, setTab] = useState<'send'|'receive'>('send'); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const generateCode = async () => {
    setLoading(true)
    const res = await fetch('/api/couple', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', userId }) })
    const data = await res.json()
    if (data.code) { setGeneratedCode(data.code); setCoupleStatus('pending-send') }
    setLoading(false)
  }
  const joinWithCode = async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/couple', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', userId, inviteCode }) })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false) } else onLinked()
  }
  return (
    <div className={styles.screen}><div className={styles.screenInner}>
      <div className={styles.screenHeader}><div className={styles.logo}>u<em>Down</em></div><p className={styles.screenSub}>Link up with your partner</p></div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'send' ? styles.tabActive : ''}`} onClick={() => setTab('send')}>I'll invite them</button>
        <button className={`${styles.tab} ${tab === 'receive' ? styles.tabActive : ''}`} onClick={() => setTab('receive')}>I have a code</button>
      </div>
      {tab === 'send' && <div className={styles.tabContent}>
        {!generatedCode ? <><p className={styles.hint}>Generate a code and send it to your partner.</p><button className="btn" onClick={generateCode} disabled={loading}>{loading ? 'Generating...' : 'Generate invite code'}</button></> :
        <><p className={styles.hint}>Send this to your partner.</p><div className={styles.codeDisplay}>{generatedCode}</div><button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(generatedCode)}>Copy code</button><p className={styles.waiting}>Waiting for them to join...</p></>}
      </div>}
      {tab === 'receive' && <div className={styles.tabContent}>
        <p className={styles.hint}>Enter the code your partner sent you.</p>
        <div className={styles.formGroup}><input className="input" placeholder="e.g. AB3X9K" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} maxLength={6} style={{ textTransform:'uppercase', letterSpacing:'0.2em', fontSize:'1.2rem', textAlign:'center' }} /></div>
        {error && <p className="error-msg">{error}</p>}
        <button className="btn" onClick={joinWithCode} disabled={loading || inviteCode.length < 6}>{loading ? 'Connecting...' : 'Connect →'}</button>
      </div>}
    </div></div>
  )
}

function Upgrade({ profile, onUpgrade, onBack }: { profile: Profile | null; onUpgrade: (priceId: string) => void; onBack: () => void }) {
  const monthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || ''
  const yearly = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || ''
  return (
    <div className={styles.screen}><div className={styles.screenInner}>
      <button className={styles.backBtn} onClick={onBack}>← back</button>
      <div className={styles.logo}>u<em>Down</em></div>
      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
        <h2 className={`${styles.authTitle} serif`} style={{margin:0}}>uDown Plus.</h2>
        <span style={{background:'linear-gradient(135deg,#C4614A,#E8A598)',color:'white',fontSize:'0.55rem',letterSpacing:'0.1em',padding:'0.2rem 0.5rem',textTransform:'uppercase'}}>Premium</span>
      </div>
      <p style={{color:'#8A847C',fontSize:'0.8rem',lineHeight:1.7,marginBottom:'2rem'}}>Everything you need to stay connected — and then some.</p>
      <div style={{display:'flex',flexDirection:'column',gap:'0.7rem',marginBottom:'2rem'}}>
        {[
          ['🌙','Set your mood','Tell your partner the vibe — only if you both match'],
          ['📅','Match history','See your connection over time with a private calendar'],
          ['⭐','Rate positions','Track what you loved, tried, and want to try next'],
          ['🛡','Streak protection','One grace day per month to protect your streak'],
          ['🏆','Milestone moments','Celebrate your 10th, 25th, 50th match together'],
          ['📝','Partner notes','Leave a private note after a match'],
          ['⏰','Custom timing','Set your own daily prompt window'],
        ].map(([icon, title, desc]) => (
          <div key={title as string} style={{display:'flex',gap:'0.8rem',alignItems:'flex-start'}}>
            <span style={{fontSize:'1rem',marginTop:'0.1rem'}}>{icon}</span>
            <div><div style={{fontSize:'0.8rem',color:'#F5F0E8',marginBottom:'0.1rem'}}>{title}</div><div style={{fontSize:'0.7rem',color:'#8A847C',lineHeight:1.5}}>{desc}</div></div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.8rem'}}>
        <button className="btn btn-yes" onClick={() => onUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || '')} style={{position:'relative'}}>
          <span>$34.99 / year</span>
          <span style={{position:'absolute',right:'1rem',top:'50%',transform:'translateY(-50%)',fontSize:'0.6rem',background:'rgba(255,255,255,0.2)',padding:'0.15rem 0.4rem'}}>BEST VALUE</span>
        </button>
        <button className="btn btn-ghost" onClick={() => onUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '')}>$4.99 / month</button>
      </div>
      <p style={{fontSize:'0.65rem',color:'#8A847C',textAlign:'center',marginTop:'1rem'}}>Cancel anytime. No questions asked.</p>
    </div></div>
  )
}

function Home({ profile, partnerName, todayResponse, todayMood, matched, partnerMood, yesCount, currentStreak, longestStreak, premiumData, coupleId, userId, onRespond, onRatePosition, onSaveNote, onUpgrade, onSettings, onSignOut }: any) {
  const [loading, setLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : 'Good evening'
  const position = getTodayPosition()
  const isPremium = profile?.is_premium
  const posRating = premiumData?.ratings?.find((r: any) => r.position_name === position.name)?.rating

  const respond = async (r: 'yes' | 'no') => {
    setLoading(true)
    await onRespond(r, selectedMood)
    setLoading(false)
  }

  const matchedMoodLabel = MOODS.find(m => m.key === partnerMood)?.label
  const myMoodLabel = MOODS.find(m => m.key === todayMood)?.label

  const milestoneMsg = yesCount === 10 ? "✦ 10 matches together." : yesCount === 25 ? "✦ 25 matches. Remarkable." : yesCount === 50 ? "✦ 50 matches. Legendary." : null

  return (
    <div className={styles.screen}>
      <div className={styles.homeHeader}>
        <div className={styles.logo}>u<em>Down</em></div>
        <div className={styles.homeHeaderRight}>
          {yesCount > 0 && <div className={styles.yesCounter} title="Times you've both said yes">✦ {yesCount}</div>}
          {!isPremium && <button onClick={onUpgrade} style={{fontSize:'0.6rem',letterSpacing:'0.08em',color:'#E8A598',background:'none',border:'1px solid rgba(232,165,152,0.3)',padding:'0.2rem 0.5rem',cursor:'pointer',textTransform:'uppercase'}}>Plus</button>}
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
            {milestoneMsg && <div style={{color:'#E8A598',fontSize:'0.75rem',letterSpacing:'0.1em',marginBottom:'0.5rem'}}>{milestoneMsg}</div>}
            {matchedMoodLabel && myMoodLabel && <p style={{fontSize:'0.78rem',color:'#8A847C',marginBottom:'0.5rem'}}>You: {myMoodLabel} · Them: {matchedMoodLabel}</p>}
            <p className={styles.matchSub}>Tonight's the night.</p>
            {yesCount > 0 && <div className={styles.matchCount}>✦ {yesCount} {yesCount === 1 ? 'time' : 'times'} and counting</div>}

            {isPremium && (
              <div style={{marginTop:'1rem',width:'100%',maxWidth:'340px'}}>
                {!noteSaved ? (
                  showNoteInput ? (
                    <div style={{marginBottom:'1rem'}}>
                      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Leave a note for tonight..." style={{width:'100%',background:'rgba(245,240,232,0.05)',border:'1px solid rgba(232,165,152,0.2)',color:'#F5F0E8',padding:'0.8rem',fontSize:'0.78rem',fontFamily:'monospace',resize:'none',height:'80px',boxSizing:'border-box' as const}} />
                      <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                        <button className="btn" style={{flex:1,padding:'0.6rem'}} onClick={async () => { await onSaveNote(note); setNoteSaved(true) }}>Save note</button>
                        <button className="btn btn-ghost" style={{flex:1,padding:'0.6rem'}} onClick={() => setShowNoteInput(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost" style={{width:'100%',marginBottom:'1rem',padding:'0.6rem',fontSize:'0.72rem'}} onClick={() => setShowNoteInput(true)}>📝 Leave a note for tonight</button>
                  )
                ) : <p style={{fontSize:'0.72rem',color:'#8A847C',marginBottom:'1rem',textAlign:'center'}}>Note saved ✓</p>}
              </div>
            )}

            <Dashboard currentStreak={currentStreak} longestStreak={longestStreak} position={position} label="Tonight's suggestion" isPremium={isPremium} posRating={posRating} onRatePosition={onRatePosition} onUpgrade={onUpgrade} />
          </div>

        ) : todayResponse ? (
          <div className={styles.respondedState}>
            <div className={styles.respondedIcon}>{todayResponse === 'yes' ? '👀' : '🌙'}</div>
            <h2 className={`${styles.respondedTitle} serif`}>{todayResponse === 'yes' ? 'Got it.' : 'No worries.'}</h2>
            <p className={styles.respondedSub}>{todayResponse === 'yes' ? `Waiting on ${partnerName}. If they're down too, you'll both know.` : "We'll check in again tomorrow."}</p>
            <div className={styles.responseTag}>You said <span className={todayResponse === 'yes' ? styles.tagYes : styles.tagNo}>{todayResponse === 'yes' ? 'yes' : 'no'}</span> today{myMoodLabel ? ` · ${myMoodLabel}` : ''}</div>

            {isPremium && premiumData?.history?.length > 0 && (
              <MatchCalendar history={premiumData.history} />
            )}

            <Dashboard currentStreak={currentStreak} longestStreak={longestStreak} position={position} label="Position of the day" isPremium={isPremium} posRating={posRating} onRatePosition={onRatePosition} onUpgrade={onUpgrade} />

            {isPremium && premiumData?.notes?.length > 0 && (
              <div style={{marginTop:'1rem',width:'100%',maxWidth:'340px'}}>
                <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.6rem'}}>Recent notes</div>
                {premiumData.notes.slice(0,3).map((n: any, i: number) => (
                  <div key={i} style={{border:'1px solid rgba(232,165,152,0.1)',padding:'0.8rem',marginBottom:'0.5rem',fontSize:'0.75rem',color:'#F5F0E8',lineHeight:1.6}}>
                    <div style={{color:'#8A847C',fontSize:'0.6rem',marginBottom:'0.3rem'}}>{n.matched_on}</div>
                    {n.note}
                  </div>
                ))}
              </div>
            )}

            {!isPremium && (
              <button onClick={onUpgrade} style={{marginTop:'1.5rem',fontSize:'0.7rem',color:'#E8A598',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Unlock mood sharing, match history & more with uDown Plus</button>
            )}
          </div>

        ) : (
          <div className={styles.promptState}>
            <p className={styles.promptGreeting}>{greeting}, {profile?.name}.</p>
            <h2 className={`${styles.promptQuestion} serif`}>u down<br /><em>tonight?</em></h2>
            <p className={styles.promptSub}>{partnerName} won't know what you said.<br />Unless you both say yes.</p>

            {isPremium && (
              <div style={{marginBottom:'1.5rem',width:'100%',maxWidth:'300px'}}>
                <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.6rem',textAlign:'center'}}>Set the vibe (optional)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                  {MOODS.map(m => (
                    <button key={m.key} onClick={() => setSelectedMood(selectedMood === m.key ? null : m.key)}
                      style={{padding:'0.6rem',border:`1px solid ${selectedMood === m.key ? '#E8A598' : 'rgba(232,165,152,0.15)'}`,background:selectedMood === m.key ? 'rgba(232,165,152,0.1)' : 'none',color:selectedMood === m.key ? '#E8A598' : '#8A847C',fontSize:'0.7rem',cursor:'pointer',textAlign:'left' as const}}>
                      <div>{m.label}</div>
                      <div style={{fontSize:'0.6rem',opacity:0.7,marginTop:'0.1rem'}}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.responseButtons}>
              <button className="btn btn-yes" onClick={() => respond('yes')} disabled={loading}>Yeah 👀</button>
              <button className="btn btn-no" onClick={() => respond('no')} disabled={loading}>Not tonight</button>
            </div>

            {!isPremium && (
              <button onClick={onUpgrade} style={{marginTop:'1.5rem',fontSize:'0.7rem',color:'#8A847C',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Unlock uDown Plus features</button>
            )}
          </div>
        )}
      </div>
      <div className={styles.homeFooter}>Private by design. {partnerName} can't see your answer.</div>
    </div>
  )
}

function Dashboard({ currentStreak, longestStreak, position, label, isPremium, posRating, onRatePosition, onUpgrade }: any) {
  return (
    <div style={{marginTop:'2rem',width:'100%',maxWidth:'340px',display:'flex',flexDirection:'column',gap:'1rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
        <div style={{border:'1px solid rgba(232,165,152,0.2)',padding:'1.2rem',textAlign:'center'}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'2.2rem',fontStyle:'italic',color:'#F5F0E8',lineHeight:1}}>{currentStreak}</div>
          <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginTop:'0.3rem'}}>Current Streak</div>
        </div>
        <div style={{border:'1px solid rgba(232,165,152,0.2)',padding:'1.2rem',textAlign:'center'}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'2.2rem',fontStyle:'italic',color:'#F5F0E8',lineHeight:1}}>{longestStreak}</div>
          <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginTop:'0.3rem'}}>Longest Streak</div>
        </div>
      </div>
      <div style={{border:'1px solid rgba(232,165,152,0.2)',padding:'1.4rem',display:'flex',flexDirection:'column',gap:'0.6rem'}}>
        <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C'}}>{label}</div>
        <div style={{width:'100%',height:'110px',opacity:0.85,marginBottom:'0.4rem'}}>{position.svg}</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',fontStyle:'italic',color:'#E8A598'}}>{position.name}</div>
        <div style={{fontSize:'0.78rem',lineHeight:1.7,color:'#8A847C'}}>{position.description}</div>
        {isPremium ? (
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.3rem'}}>
            {[['loved','❤️ Loved'],['tried','✓ Tried'],['next','→ Try next']].map(([key, lbl]) => (
              <button key={key} onClick={() => onRatePosition(position.name, key)}
                style={{flex:1,padding:'0.4rem',border:`1px solid ${posRating === key ? '#E8A598' : 'rgba(232,165,152,0.15)'}`,background:posRating === key ? 'rgba(232,165,152,0.1)' : 'none',color:posRating === key ? '#E8A598' : '#8A847C',fontSize:'0.6rem',cursor:'pointer'}}>
                {lbl}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={onUpgrade} style={{fontSize:'0.65rem',color:'#8A847C',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',textAlign:'left' as const,padding:0}}>⭐ Rate this position with Plus</button>
        )}
      </div>
    </div>
  )
}

function MatchCalendar({ history }: { history: any[] }) {
  const months: Record<string, string[]> = {}
  history.forEach((r: any) => {
    const [y, m] = r.date.split('-')
    const key = `${y}-${m}`
    if (!months[key]) months[key] = []
    months[key].push(r.date)
  })
  const monthKeys = Object.keys(months).sort().reverse().slice(0, 3)
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div style={{marginTop:'1.5rem',width:'100%',maxWidth:'340px'}}>
      <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.8rem'}}>Match history</div>
      {monthKeys.map(key => {
        const [y, m] = key.split('-')
        const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate()
        const firstDay = new Date(parseInt(y), parseInt(m) - 1, 1).getDay()
        const matchSet = new Set(months[key])
        return (
          <div key={key} style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'0.65rem',color:'#8A847C',marginBottom:'0.4rem'}}>{monthNames[parseInt(m)-1]} {y}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px'}}>
              {Array(firstDay).fill(null).map((_,i) => <div key={`e${i}`} style={{aspectRatio:'1'}} />)}
              {Array(daysInMonth).fill(null).map((_,i) => {
                const d = String(i+1).padStart(2,'0')
                const dateStr = `${y}-${m}-${d}`
                const isMatch = matchSet.has(dateStr)
                return <div key={d} style={{aspectRatio:'1',background:isMatch ? '#C4614A' : 'rgba(255,255,255,0.04)',borderRadius:'2px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.45rem',color:isMatch ? 'white' : '#8A847C'}}>{i+1}</div>
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Settings({ profile, partnerName, yesCount, currentStreak, longestStreak, coupleId, premiumData, onUpgrade, onRemovePartner, onBack, onSaveNotifHour, onSignOut }: any) {
  const [notifHour, setNotifHour] = useState(profile?.custom_notif_hour ?? 17)
  const [hourSaved, setHourSaved] = useState(false)
  const isPremium = profile?.is_premium

  return (
    <div className={styles.screen}><div className={styles.screenInner}>
      <button className={styles.backBtn} onClick={onBack}>← back</button>
      <div className={styles.logo}>u<em>Down</em></div>
      <h2 className={`${styles.authTitle} serif`}>Account.</h2>

      <div className={styles.settingsCard}>
        <div className={styles.settingsLabel}>You</div>
        <div className={styles.settingsValue}>{profile?.name}</div>
        {isPremium ? <div style={{fontSize:'0.65rem',color:'#E8A598',marginTop:'0.3rem'}}>✦ uDown Plus</div> : <button onClick={onUpgrade} style={{marginTop:'0.5rem',fontSize:'0.7rem',color:'#E8A598',background:'none',border:'1px solid rgba(232,165,152,0.3)',padding:'0.3rem 0.8rem',cursor:'pointer'}}>Upgrade to Plus</button>}
      </div>

      {partnerName && (
        <div className={styles.settingsCard}>
          <div className={styles.settingsLabel}>Your partner</div>
          <div className={styles.settingsValue}>{partnerName}</div>
          <div style={{marginTop:'0.8rem',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.6rem',textAlign:'center' as const}}>
            {[['✦ ' + yesCount,'Matches'],['🔥 ' + currentStreak,'Streak'],['⭐ ' + longestStreak,'Best']].map(([val,lbl]) => (
              <div key={lbl} style={{border:'1px solid rgba(232,165,152,0.12)',padding:'0.8rem 0.4rem'}}>
                <div style={{fontSize:'1.2rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',color:'#F5F0E8'}}>{val}</div>
                <div style={{fontSize:'0.55rem',letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#8A847C',marginTop:'0.2rem'}}>{lbl}</div>
              </div>
            ))}
          </div>
          <button className={styles.dangerBtn} onClick={onRemovePartner} style={{marginTop:'1rem'}}>Remove partner</button>
        </div>
      )}

      {isPremium && (
        <div className={styles.settingsCard}>
          <div className={styles.settingsLabel}>Notification time</div>
          <p style={{fontSize:'0.72rem',color:'#8A847C',marginBottom:'0.8rem'}}>Set your preferred prompt hour</p>
          <div style={{display:'flex',gap:'0.8rem',alignItems:'center'}}>
            <input type="range" min={14} max={21} value={notifHour} onChange={e => setNotifHour(parseInt(e.target.value))} style={{flex:1}} />
            <span style={{fontSize:'0.8rem',color:'#F5F0E8',minWidth:'45px'}}>{notifHour > 12 ? `${notifHour-12}pm` : `${notifHour}am`}</span>
          </div>
          <button className="btn btn-ghost" style={{marginTop:'0.8rem',padding:'0.6rem',fontSize:'0.72rem'}} onClick={async () => { await onSaveNotifHour(notifHour); setHourSaved(true); setTimeout(() => setHourSaved(false), 2000) }}>{hourSaved ? 'Saved ✓' : 'Save time'}</button>
        </div>
      )}

      <div style={{marginTop:'2rem',display:'flex',flexDirection:'column',gap:'0.8rem'}}>
        <button className="btn btn-ghost" onClick={onSignOut}>Sign out</button>
      </div>
    </div></div>
  )
}

function AuthShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className={styles.screen}><div className={styles.screenInner}>
      <button className={styles.backBtn} onClick={onBack}>← back</button>
      <div className={styles.logo}>u<em>Down</em></div>
      <h2 className={`${styles.authTitle} serif`}>{title}</h2>
      <div className={styles.authForm}>{children}</div>
    </div></div>
  )
}
