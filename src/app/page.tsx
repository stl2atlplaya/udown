'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { registerPush } from '@/lib/push'
import type { User } from '@supabase/supabase-js'
import styles from './page.module.css'

type Screen = 'landing' | 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'couple-setup' | 'home' | 'settings'
type CoupleStatus = 'none' | 'pending-send' | 'pending-receive' | 'linked'

interface Profile {
  id: string
  name: string
  couple_id: string | null
}

const POSITIONS = [
  { name: "The Lotus", description: "Face to face, wrapped together. Slow and intimate.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="18" r="5" stroke="#E8A598" strokeWidth="1.5"/><circle cx="68" cy="18" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 23 C45 30 40 40 45 50 C50 58 58 60 60 60 C62 60 70 58 75 50 C80 40 75 30 68 23" stroke="#8A847C" strokeWidth="1.5" fill="none"/><path d="M52 23 C55 30 58 35 60 38 C62 35 65 30 68 23" stroke="#E8A598" strokeWidth="1.5" fill="none"/><path d="M42 42 C38 45 36 50 40 54" stroke="#E8A598" strokeWidth="1.5"/><path d="M78 42 C82 45 84 50 80 54" stroke="#8A847C" strokeWidth="1.5"/><path d="M45 50 C40 55 42 62 48 64" stroke="#E8A598" strokeWidth="1.5"/><path d="M75 50 C80 55 78 62 72 64" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Missionary", description: "Classic for a reason. Eye contact, full connection.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 25 L60 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 32 L70 32" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 48 L52 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 48 L68 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="62" cy="52" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M56 57 C50 57 44 60 42 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 57 C74 57 80 60 82 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 57 L55 70" stroke="#8A847C" strokeWidth="1.5"/><path d="M66 57 L69 70" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Cowgirl", description: "One partner takes the lead. All the control.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="15" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 20 L60 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 28 L70 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L48 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L72 58" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="58" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 63 L46 75" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 63 L74 75" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 63 C50 68 52 72 55 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 63 C70 68 68 72 65 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Spooning", description: "Close, warm, unhurried. Perfect for tonight.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="35" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 40 C35 48 38 52 40 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M25 44 L45 44" stroke="#8A847C" strokeWidth="1.5"/><path d="M40 55 L32 68" stroke="#8A847C" strokeWidth="1.5"/><path d="M40 55 L48 68" stroke="#8A847C" strokeWidth="1.5"/><circle cx="42" cy="32" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 37 C42 45 45 49 47 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M32 41 L52 41" stroke="#E8A598" strokeWidth="1.5"/><path d="M47 52 L39 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M47 52 L55 65" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Bridge", description: "Arched and open. Surprisingly deep.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="38" cy="62" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 58 C30 45 35 30 50 28 C65 26 75 35 72 50" stroke="#E8A598" strokeWidth="1.5"/><path d="M28 65 L35 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M48 65 L42 67" stroke="#E8A598" strokeWidth="1.5"/><circle cx="72" cy="40" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 45 L72 60" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 52 L82 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 60 L65 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 60 L79 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Doggy Style", description: "Primal and passionate. No eye contact required.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M30 35 C30 42 32 46 35 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M20 40 L40 38" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 48 L28 62" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 48 L42 62" stroke="#E8A598" strokeWidth="1.5"/><circle cx="78" cy="38" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 43 C75 50 70 52 65 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 48 L88 44" stroke="#8A847C" strokeWidth="1.5"/><path d="M65 52 L60 64" stroke="#8A847C" strokeWidth="1.5"/><path d="M75 55 L72 66" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Reverse Cowgirl", description: "A different angle. A different experience.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="15" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 20 L60 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 28 L70 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L48 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 42 L72 58" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="55" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 50 L60 42" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 60 L46 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 60 L74 72" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Cat", description: "Like missionary, but shifted. Every movement counts.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="55" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 25 L58 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M45 32 L68 30" stroke="#E8A598" strokeWidth="1.5"/><path d="M58 48 L50 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M58 48 L66 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="65" cy="48" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 53 C52 53 46 56 44 61" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 53 C78 53 82 56 82 61" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 53 L57 66" stroke="#8A847C" strokeWidth="1.5"/><path d="M70 53 L73 66" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Standing", description: "Spontaneous. Against the wall. Why not.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="12" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 17 L52 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 25 L62 25" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 42 L46 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 42 L58 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="68" cy="15" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 20 L68 45" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 28 L78 28" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 45 L62 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 45 L74 65" stroke="#8A847C" strokeWidth="1.5"/><path d="M58 38 L52 35" stroke="#8A847C" strokeWidth="1.2"/></svg> },
  { name: "The Pretzel", description: "Intertwined and close. Takes a second to find the rhythm.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="45" cy="20" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M45 25 C42 35 38 42 40 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 32 L55 30" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 52 L34 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 52 L52 58" stroke="#E8A598" strokeWidth="1.5"/><circle cx="72" cy="35" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 40 C70 48 65 52 60 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 42 L82 40" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 55 L55 68" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 55 L68 65" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Seated", description: "Face to face, lap to lap. Deeply intimate.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="55" cy="22" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 27 L55 48" stroke="#8A847C" strokeWidth="1.5"/><path d="M45 35 L65 35" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 48 L45 58" stroke="#8A847C" strokeWidth="1.5"/><path d="M55 48 L65 58" stroke="#8A847C" strokeWidth="1.5"/><path d="M45 58 L42 70" stroke="#8A847C" strokeWidth="1.5"/><path d="M65 58 L68 70" stroke="#8A847C" strokeWidth="1.5"/><circle cx="60" cy="18" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M56 23 C52 30 50 38 52 46" stroke="#E8A598" strokeWidth="1.5"/><path d="M46 30 L62 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 46 L46 56" stroke="#E8A598" strokeWidth="1.5"/><path d="M52 46 L60 52" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Waterfall", description: "Head rushes. Literally.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="65" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 60 L60 38" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 52 L70 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 38 L52 22" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 38 L68 22" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="42" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 47 C46 47 40 50 38 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 47 C74 47 80 50 82 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M56 47 L53 60" stroke="#8A847C" strokeWidth="1.5"/><path d="M64 47 L67 60" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Edge of Bed", description: "Simple setup. Surprisingly good angle.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="55" width="50" height="6" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><circle cx="42" cy="35" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 40 L42 55" stroke="#E8A598" strokeWidth="1.5"/><path d="M32 47 L52 47" stroke="#E8A598" strokeWidth="1.5"/><path d="M35 55 L30 70" stroke="#E8A598" strokeWidth="1.5"/><path d="M49 55 L54 70" stroke="#E8A598" strokeWidth="1.5"/><circle cx="78" cy="40" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 45 L78 62" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 52 L88 52" stroke="#8A847C" strokeWidth="1.5"/><path d="M73 62 L68 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M83 62 L88 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 52 L50 47" stroke="#8A847C" strokeWidth="1.2"/></svg> },
  { name: "The Snake", description: "Lying flat, close as possible. Slow burn.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="38" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M27 38 L75 40" stroke="#E8A598" strokeWidth="1.5"/><path d="M42 34 L42 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M75 40 L88 36" stroke="#E8A598" strokeWidth="1.5"/><path d="M75 40 L85 46" stroke="#E8A598" strokeWidth="1.5"/><circle cx="25" cy="43" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M30 43 L78 45" stroke="#8A847C" strokeWidth="1.5"/><path d="M50 39 L50 47" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 45 L90 41" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 45 L88 51" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "The Sphinx", description: "Half raised, half surrendered. Intense.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="32" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M30 37 C30 44 33 48 36 52" stroke="#E8A598" strokeWidth="1.5"/><path d="M20 42 L42 40" stroke="#E8A598" strokeWidth="1.5"/><path d="M36 52 L28 65" stroke="#E8A598" strokeWidth="1.5"/><path d="M36 52 L44 65" stroke="#E8A598" strokeWidth="1.5"/><circle cx="78" cy="45" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M65 50 L90 48" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 50 L72 62" stroke="#8A847C" strokeWidth="1.5"/><path d="M78 50 L86 60" stroke="#8A847C" strokeWidth="1.5"/><path d="M65 50 L58 46" stroke="#8A847C" strokeWidth="1.5"/><path d="M44 50 L58 46" stroke="#E8A598" strokeWidth="1.2"/></svg> },
  { name: "Legs Up", description: "Deep and deliberate. Communication helps.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="55" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 50 L40 35" stroke="#E8A598" strokeWidth="1.5"/><path d="M30 42 L50 42" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 35 L30 18" stroke="#E8A598" strokeWidth="1.5"/><path d="M40 35 L50 18" stroke="#E8A598" strokeWidth="1.5"/><circle cx="72" cy="42" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M72 47 L72 62" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 54 L82 54" stroke="#8A847C" strokeWidth="1.5"/><path d="M67 62 L62 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M77 62 L82 72" stroke="#8A847C" strokeWidth="1.5"/><path d="M62 47 L45 50" stroke="#8A847C" strokeWidth="1.2"/></svg> },
  { name: "The Chairperson", description: "Seated power dynamic. Very good use of furniture.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="42" y="48" width="36" height="5" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><rect x="72" y="53" width="4" height="18" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><rect x="44" y="53" width="4" height="18" rx="1" stroke="#8A847C" strokeWidth="1" fill="none"/><circle cx="60" cy="28" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M60 33 L60 48" stroke="#8A847C" strokeWidth="1.5"/><path d="M50 40 L70 40" stroke="#8A847C" strokeWidth="1.5"/><circle cx="60" cy="22" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 27 C52 33 52 40 55 46" stroke="#E8A598" strokeWidth="1.5"/><path d="M46 33 L62 31" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 46 L50 55" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 46 L62 52" stroke="#E8A598" strokeWidth="1.5"/></svg> },
  { name: "The Butter Churner", description: "Adventurous. Worth trying at least once.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="68" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M60 63 L60 45" stroke="#E8A598" strokeWidth="1.5"/><path d="M50 55 L70 55" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 45 L48 28" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 45 L72 28" stroke="#E8A598" strokeWidth="1.5"/><circle cx="60" cy="38" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M52 43 C46 43 40 46 38 51" stroke="#8A847C" strokeWidth="1.5"/><path d="M68 43 C74 43 80 46 82 51" stroke="#8A847C" strokeWidth="1.5"/><path d="M56 43 L54 56" stroke="#8A847C" strokeWidth="1.5"/><path d="M64 43 L66 56" stroke="#8A847C" strokeWidth="1.5"/></svg> },
  { name: "Side by Side", description: "Lazy and lovely. Sunday morning energy.", svg: <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="32" r="5" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 37 L35 55" stroke="#8A847C" strokeWidth="1.5"/><path d="M25 45 L45 45" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 55 L28 70" stroke="#8A847C" strokeWidth="1.5"/><path d="M35 55 L42 70" stroke="#8A847C" strokeWidth="1.5"/><circle cx="65" cy="35" r="5" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 40 L65 58" stroke="#E8A598" strokeWidth="1.5"/><path d="M55 48 L75 48" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 58 L58 72" stroke="#E8A598" strokeWidth="1.5"/><path d="M65 58 L72 72" stroke="#E8A598" strokeWidth="1.5"/><path d="M45 45 L55 46" stroke="#E8A598" strokeWidth="1.2"/></svg> },
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
  const [matched, setMatched] = useState(false)
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus>('none')
  const [inviteCode, setInviteCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [coupleId, setCoupleId] = useState('')
  const [yesCount, setYesCount] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const isRecovery = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isRecovery.current = true
        setScreen('reset-password')
        setLoading(false)
        return
      }
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

    return () => subscription.unsubscribe()
  }, [])

  const calculateStreaks = (myYesDates: string[], partnerYesDates: string[]) => {
    const mySet = new Set(myYesDates)
    const partnerSet = new Set(partnerYesDates)
    const matchDates = myYesDates.filter(d => partnerSet.has(d)).sort()

    if (matchDates.length === 0) return { current: 0, longest: 0 }

    let longest = 1
    let current = 1
    let tempStreak = 1

    for (let i = 1; i < matchDates.length; i++) {
      const prev = new Date(matchDates[i - 1])
      const curr = new Date(matchDates[i])
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        tempStreak++
        if (tempStreak > longest) longest = tempStreak
      } else {
        tempStreak = 1
      }
    }

    // Check if streak is current (includes today or yesterday)
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lastMatch = matchDates[matchDates.length - 1]

    let currentStreak = 0
    if (lastMatch === today || lastMatch === yesterday) {
      currentStreak = tempStreak
    }

    return { current: currentStreak, longest: Math.max(longest, tempStreak) }
  }

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)

    if (data?.couple_id) {
      setCoupleId(data.couple_id)
      const { data: couple } = await supabase
        .from('couples').select('user1_id, user2_id, last_match')
        .eq('id', data.couple_id).single()

      if (couple) {
        const pid = couple.user1_id === userId ? couple.user2_id : couple.user1_id
        setPartnerId(pid)
        const { data: partnerProfile } = await supabase
          .from('profiles').select('name').eq('id', pid).single()
        setPartnerName(partnerProfile?.name || 'your partner')

        const today = new Date().toISOString().split('T')[0]
        if (couple.last_match === today) setMatched(true)

        const { data: myYes } = await supabase
          .from('daily_responses').select('date')
          .eq('couple_id', data.couple_id).eq('response', 'yes').eq('user_id', userId)

        const { data: partnerYes } = await supabase
          .from('daily_responses').select('date')
          .eq('couple_id', data.couple_id).eq('response', 'yes').eq('user_id', pid)

        if (myYes && partnerYes) {
          const myDates = new Set(myYes.map((r: any) => r.date))
          const matches = partnerYes.filter((r: any) => myDates.has(r.date))
          setYesCount(matches.length)

          const streaks = calculateStreaks(
            myYes.map((r: any) => r.date),
            partnerYes.map((r: any) => r.date)
          )
          setCurrentStreak(streaks.current)
          setLongestStreak(streaks.longest)
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
    setPartnerName(''); setPartnerId(''); setCoupleId('')
    setYesCount(0); setMatched(false); setTodayResponse(null)
    setCurrentStreak(0); setLongestStreak(0)
    setProfile(p => p ? { ...p, couple_id: null } : p)
    setScreen('couple-setup')
  }

  const handlePasswordReset = () => {
    isRecovery.current = false
    setScreen('login')
  }

  if (loading) return <Splash />
  if (screen === 'reset-password') return <ResetPassword onDone={handlePasswordReset} />
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
      currentStreak={currentStreak}
      longestStreak={longestStreak}
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
      currentStreak={currentStreak}
      longestStreak={longestStreak}
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

function Splash() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashLogo}>u<span>Down</span></div>
    </div>
  )
}

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

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email) return setError('Enter your email.')
    setLoading(true); setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://udown-2lda.vercel.app/',
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
          <p className={styles.hint} style={{marginBottom:'1rem'}}>Enter your email and we'll send a reset link.</p>
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

function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!password || !confirm) return setError('Fill both fields.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setLoading(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false) }
    else setDone(true)
  }

  return (
    <AuthShell title="New password." onBack={onDone}>
      {done ? (
        <div className={styles.sentMsg}>
          <div className={styles.sentIcon}>✓</div>
          <p>Password updated. You're good to go.</p>
          <button className="btn" onClick={onDone} style={{marginTop:'1rem'}}>Sign in →</button>
        </div>
      ) : (
        <>
          <div className={styles.formGroup}>
            <label className="label">New password</label>
            <input className="input" type="password" placeholder="6+ characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className="label">Confirm password</label>
            <input className="input" type="password" placeholder="Same again" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Set new password →'}
          </button>
        </>
      )}
    </AuthShell>
  )
}

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

function Home({ profile, partnerName, todayResponse, matched, yesCount, currentStreak, longestStreak, onRespond, onSettings, onSignOut }: {
  profile: Profile | null; partnerName: string; todayResponse: 'yes' | 'no' | null
  matched: boolean; yesCount: number; currentStreak: number; longestStreak: number
  onRespond: (r: 'yes' | 'no') => Promise<void>; onSettings: () => void; onSignOut: () => void
}) {
  const [loading, setLoading] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : 'Good evening'
  const position = getTodayPosition()

  const respond = async (r: 'yes' | 'no') => {
    setLoading(true); await onRespond(r); setLoading(false)
  }

  const showDashboard = todayResponse !== null || matched

  return (
    <div className={styles.screen}>
      <div className={styles.homeHeader}>
        <div className={styles.logo}>u<em>Down</em></div>
        <div className={styles.homeHeaderRight}>
          {yesCount > 0 && (
            <div className={styles.yesCounter} title="Times you've both said yes">✦ {yesCount}</div>
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
            {yesCount > 0 && <div className={styles.matchCount}>✦ {yesCount} {yesCount === 1 ? 'time' : 'times'} and counting</div>}
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
                <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C'}}>Tonight's suggestion</div>
                <div style={{width:'100%',height:'80px',opacity:0.85}}>{position.svg}</div>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',fontStyle:'italic',color:'#E8A598'}}>{position.name}</div>
                <div style={{fontSize:'0.78rem',lineHeight:1.7,color:'#8A847C'}}>{position.description}</div>
              </div>
            </div>
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
                <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C'}}>Position of the day</div>
                <div style={{width:'100%',height:'80px',opacity:0.85}}>{position.svg}</div>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',fontStyle:'italic',color:'#E8A598'}}>{position.name}</div>
                <div style={{fontSize:'0.78rem',lineHeight:1.7,color:'#8A847C'}}>{position.description}</div>
              </div>
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

function Settings({ profile, partnerName, yesCount, currentStreak, longestStreak, onRemovePartner, onBack, onSignOut }: {
  profile: Profile | null; partnerName: string; yesCount: number
  currentStreak: number; longestStreak: number
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
            <div className={styles.settingsStreaks}>
              <div className={styles.dashStat}>
                <div className={styles.dashStatValue}>{currentStreak}</div>
                <div className={styles.dashStatLabel}>Current Streak</div>
              </div>
              <div className={styles.dashStat}>
                <div className={styles.dashStatValue}>{longestStreak}</div>
                <div className={styles.dashStatLabel}>Longest Streak</div>
              </div>
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
