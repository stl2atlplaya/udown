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


// Store userId in IndexedDB so service worker can access it
function storeUserIdForSW(userId: string) {
  try {
    const request = indexedDB.open('udown', 1)
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('user')) db.createObjectStore('user')
    }
    request.onsuccess = (e: any) => {
      const db = e.target.result
      const tx = db.transaction('user', 'readwrite')
      tx.objectStore('user').put(userId, 'userId')
    }
  } catch {}
}


function getEstToday(): string | null {
  const now = new Date()
  const estHour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  if (estHour < 6) return null // Before 6am EST — still "yesterday"
  return now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) // YYYY-MM-DD
}

function isInTrial(trialStartedAt: string | null): boolean {
  if (!trialStartedAt) return false
  const trialEnd = new Date(trialStartedAt)
  trialEnd.setDate(trialEnd.getDate() + 14)
  return new Date() < trialEnd
}

function daysLeftInTrial(trialStartedAt: string | null): number {
  if (!trialStartedAt) return 0
  const trialEnd = new Date(trialStartedAt)
  trialEnd.setDate(trialEnd.getDate() + 14)
  const diff = trialEnd.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
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
  const [coupleMeta, setCoupleMeta] = useState<any>(null)
  const [sparkData, setSparkData] = useState<any>(null)
  const [goalData, setGoalData] = useState<any>(null)
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

  const enablePush = async (userId: string) => {
    try {
      storeUserIdForSW(userId)
      const sub = await registerPush()
      if (sub) await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub, userId }) })
    } catch (e) { console.error('Push failed:', e) }
  }

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    if (data?.couple_id) {
      setCoupleId(data.couple_id)
      const { data: couple } = await supabase.from('couples').select('user1_id, user2_id, last_match, suggested_time, suggested_by, confirmed_time, trial_started_at, suggestion_declined').eq('id', data.couple_id).single()
      if (couple) {
        const pid = couple.user1_id === userId ? couple.user2_id : couple.user1_id
        setPartnerId(pid)
        const { data: pp } = await supabase.from('profiles').select('name').eq('id', pid).single()
        const savedPartnerName = data?.partner_name || pp?.name || 'your partner'
        setPartnerName(savedPartnerName)
        const today = new Date().toISOString().split('T')[0]
        const estToday = getEstToday()
        if (couple?.last_match === (estToday || today)) setMatched(true)
        setCoupleMeta(couple)
        const [myRes, partnerRes] = await Promise.all([
          supabase.from('daily_responses').select('date,response,mood').eq('couple_id', data.couple_id).eq('user_id', userId),
          supabase.from('daily_responses').select('date,response,mood').eq('couple_id', data.couple_id).eq('user_id', pid),
        ])
        const myYes = (myRes.data || []).filter((r: any) => r.response === 'yes')
        const partnerYes = (partnerRes.data || []).filter((r: any) => r.response === 'yes')
        const mySet = new Set(myYes.map((r: any) => r.date))
        const mutualMatches = partnerYes.filter((r: any) => mySet.has(r.date))
setYesCount(mutualMatches.length)
        const streaks = calculateStreaks(myYes.map((r: any) => r.date), partnerYes.map((r: any) => r.date))
        setCurrentStreak(streaks.current)
        setLongestStreak(streaks.longest)
        const todayMyResp = estToday ? (myRes.data || []).find((r: any) => r.date === estToday) : null
        const todayPartnerResp = estToday ? (partnerRes.data || []).find((r: any) => r.date === estToday) : null
        if (todayMyResp) { setTodayResponse(todayMyResp.response as 'yes' | 'no'); setTodayMood(todayMyResp.mood) }
        if (todayPartnerResp?.mood && couple?.last_match === (estToday || today)) setPartnerMood(todayPartnerResp.mood)
        // Load premium data
        if (data.is_premium) {
          const res = await fetch(`/api/premium?coupleId=${data.couple_id}&userId=${userId}`)
          const pd = await res.json()
          setPremiumData(pd)
        }
      }
      // Set trial start on first match
      const today2 = getEstToday()
      if (today2 && couple?.last_match === today2 && !couple?.trial_started_at) {
        await supabase.from('couples').update({ trial_started_at: new Date().toISOString() }).eq('id', data.couple_id)
      }

      // Load spark and goal
      const [sparkRes, goalRes] = await Promise.all([
        fetch(`/api/spark?coupleId=${data.couple_id}&userId=${userId}`),
        fetch(`/api/goal?coupleId=${data.couple_id}`),
      ])
      const [sparkJson, goalJson] = await Promise.all([sparkRes.json(), goalRes.json()])
      setSparkData(sparkJson)
      setGoalData(goalJson)

      // Set trial start on first match

      enablePush(userId)
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


  const handleUpgrade = async (priceId: string) => {
    if (!user || !profile) return
    if (!priceId) {
      alert('Stripe price not configured. Please contact support.')
      return
    }
    try {
      const res = await fetch('/api/stripe-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email, priceId }) })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Could not start checkout. Please try again.')
      }
    } catch (e) {
      alert('Something went wrong. Please try again.')
    }
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
  if (screen === 'settings') return <Settings profile={profile} partnerName={partnerName} yesCount={yesCount} currentStreak={currentStreak} longestStreak={longestStreak} coupleId={coupleId} premiumData={premiumData} onUpgrade={() => setScreen('upgrade')} onRemovePartner={handleRemovePartner} onBack={() => setScreen('home')} onSaveNotifHour={async (mins) => { await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, custom_notif_hour: mins }) }); setProfile(p => p ? { ...p, custom_notif_hour: mins } : p) }} onSignOut={async () => { await supabase.auth.signOut(); setScreen('landing'); setProfile(null); setTodayResponse(null); setMatched(false) }} />
  if (screen === 'home') return (
    <Home
      profile={profile} partnerName={partnerName} todayResponse={todayResponse} todayMood={todayMood}
      matched={matched} partnerMood={partnerMood} yesCount={yesCount} currentStreak={currentStreak}
      longestStreak={longestStreak} premiumData={premiumData} coupleId={coupleId} userId={user?.id || ''}
      coupleMeta={coupleMeta} sparkData={sparkData} goalData={goalData} setGoalData={setGoalData}
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
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState('')
  const [relLength, setRelLength] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const progress = [12, 28, 44, 60, 76][step] || 12

  const goals = [
    { key: 'awkward', icon: '😶', label: 'Initiating feels awkward or one-sided' },
    { key: 'reconnect', icon: '🔥', label: 'We want to reconnect and be more intentional' },
    { key: 'communication', icon: '💬', label: 'We struggle to talk about this stuff' },
    { key: 'more', icon: '✦', label: 'Things are good — we just want more of it' },
  ]

  const lengths = [
    { key: 'under1', icon: '🌱', label: 'Less than a year' },
    { key: '1to3', icon: '💛', label: '1–3 years' },
    { key: '3to7', icon: '🔥', label: '3–7 years' },
    { key: '7plus', icon: '✦', label: '7+ years' },
  ]

  const handleSubmit = async () => {
    if (!name || !email || !password) return setError('Fill everything in.')
    if (password.length < 6) return setError('Password needs 6+ characters.')
    setLoading(true); setError('')
    const { data, error: e } = await supabase.auth.signUp({ email, password })
    if (e || !data.user) { setError(e?.message || 'Something went wrong.'); setLoading(false); return }
    await supabase.from('profiles').insert({ id: data.user.id, name, email, onboarding_goal: goal, relationship_length: relLength })
    onSuccess(data.user)
  }

  const progressBar = (
    <div style={{position:'absolute' as const,top:0,left:0,right:0,height:'2px',background:'rgba(255,255,255,0.06)'}}>
      <div style={{height:'100%',background:'#E8A598',width:`${progress}%`,transition:'width 0.4s ease'}} />
    </div>
  )

  if (step === 0) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar}
      <div className={styles.screenInner} style={{textAlign:'center' as const}}>
        <div className={styles.logo} style={{marginBottom:'1.6rem'}}>u<em>Down</em></div>
        <div style={{fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase' as const,color:'#E8A598',marginBottom:'0.8rem'}}>For couples</div>
        <h2 className="serif" style={{fontSize:'1.5rem',color:'#F5F0E8',lineHeight:1.2,marginBottom:'0.8rem',fontWeight:400}}>Intimacy shouldn&apos;t require a conversation.</h2>
        <p style={{fontSize:'0.82rem',color:'#8A847C',lineHeight:1.8,marginBottom:'2rem',maxWidth:'280px',margin:'0 auto 2rem'}}>uDown quietly checks in with both of you each evening. No awkward asks. No rejected feelings.</p>
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.6rem',width:'100%',maxWidth:'300px'}}>
          <button className="btn btn-yes" onClick={() => setStep(1)}>Let&apos;s go →</button>
          <button className="btn btn-ghost" onClick={onBack}>Sign in instead</button>
        </div>
      </div>
    </div>
  )

  if (step === 1) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar}
      <div className={styles.screenInner}>
        <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,width:'100%',marginBottom:'1.5rem'}}>
          <button className={styles.backBtn} onClick={() => setStep(0)}>← back</button>
          <span style={{fontSize:'0.65rem',color:'#8A847C'}}>1 of 4</span>
        </div>
        <h2 className="serif" style={{fontSize:'1.3rem',color:'#F5F0E8',marginBottom:'0.5rem',fontWeight:400}}>What brings you to uDown?</h2>
        <p style={{fontSize:'0.78rem',color:'#8A847C',marginBottom:'1.5rem'}}>Pick the one that feels most true.</p>
        <div style={{width:'100%',display:'flex',flexDirection:'column' as const,gap:'0.5rem'}}>
          {goals.map(g => (
            <button key={g.key} onClick={() => { setGoal(g.key); setTimeout(() => setStep(2), 300) }}
              style={{width:'100%',padding:'0.8rem 1rem',border:`1px solid ${goal === g.key ? 'rgba(232,165,152,0.35)' : 'rgba(255,255,255,0.08)'}`,background:goal === g.key ? 'rgba(232,165,152,0.06)' : 'none',color:goal === g.key ? '#F5F0E8' : '#8A847C',fontSize:'0.8rem',cursor:'pointer',textAlign:'left' as const,display:'flex',gap:'0.8rem',alignItems:'center' as const,transition:'all 0.2s'}}>
              <span style={{fontSize:'1rem'}}>{g.icon}</span>{g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 2) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar}
      <div className={styles.screenInner}>
        <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,width:'100%',marginBottom:'1.5rem'}}>
          <button className={styles.backBtn} onClick={() => setStep(1)}>← back</button>
          <span style={{fontSize:'0.65rem',color:'#8A847C'}}>2 of 4</span>
        </div>
        <h2 className="serif" style={{fontSize:'1.3rem',color:'#F5F0E8',marginBottom:'0.5rem',fontWeight:400}}>How long have you been together?</h2>
        <p style={{fontSize:'0.78rem',color:'#8A847C',marginBottom:'1.5rem'}}>No judgment. Just helps us understand.</p>
        <div style={{width:'100%',display:'flex',flexDirection:'column' as const,gap:'0.5rem'}}>
          {lengths.map(l => (
            <button key={l.key} onClick={() => { setRelLength(l.key); setTimeout(() => setStep(3), 300) }}
              style={{width:'100%',padding:'0.8rem 1rem',border:`1px solid ${relLength === l.key ? 'rgba(232,165,152,0.35)' : 'rgba(255,255,255,0.08)'}`,background:relLength === l.key ? 'rgba(232,165,152,0.06)' : 'none',color:relLength === l.key ? '#F5F0E8' : '#8A847C',fontSize:'0.8rem',cursor:'pointer',textAlign:'left' as const,display:'flex',gap:'0.8rem',alignItems:'center' as const,transition:'all 0.2s'}}>
              <span style={{fontSize:'1rem'}}>{l.icon}</span>{l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 3) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar}
      <div className={styles.screenInner}>
        <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,width:'100%',marginBottom:'1.5rem'}}>
          <button className={styles.backBtn} onClick={() => setStep(2)}>← back</button>
          <span style={{fontSize:'0.65rem',color:'#8A847C'}}>3 of 4</span>
        </div>
        <div className={styles.logo} style={{marginBottom:'1rem'}}>u<em>Down</em></div>
        <h2 className="serif" style={{fontSize:'1.3rem',color:'#F5F0E8',marginBottom:'0.4rem',fontWeight:400}}>Create your account.</h2>
        <p style={{fontSize:'0.78rem',color:'#8A847C',marginBottom:'1.5rem'}}>Just the basics. We don&apos;t need much.</p>
        <div className={styles.authForm} style={{width:'100%'}}>
          <div className={styles.formGroup}><label className="label">Your first name</label><input className="input" placeholder="First name is fine" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className={styles.formGroup}><label className="label">Email</label><input className="input" type="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className={styles.formGroup}><label className="label">Password</label><input className="input" type="password" placeholder="6+ characters" value={password} onChange={e => setPassword(e.target.value)} /></div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-yes" onClick={handleSubmit} disabled={loading}>{loading ? 'One sec...' : 'Create account →'}</button>
          <p style={{fontSize:'0.65rem',color:'#8A847C',textAlign:'center' as const,marginTop:'0.8rem'}}>Private by design. We don&apos;t sell your data.</p>
        </div>
      </div>
    </div>
  )

  return null
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
  const [tab, setTab] = useState<'send'|'receive'>('send')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)
  const [partnerNameInput, setPartnerNameInput] = useState('')
  const [onboardNotifMinutes, setOnboardNotifMinutes] = useState(1140) // default 7pm
  const [timeWindow, setTimeWindow] = useState('evening')
  const [sameTime, setSameTime] = useState(false)

  // Poll for couple_id — fires after push notification confirms partner joined
  useEffect(() => {
    if (!generatedCode) return
    let cancelled = false

    const poll = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', userId)
        .single()
      if (data?.couple_id && !cancelled) {
        setConnected(true)
      }
    }

    // Poll every 3 seconds while waiting
    const interval = setInterval(poll, 3000)

    // Also try realtime as a backup
    const channel = supabase
      .channel('couple-watch-' + userId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, (payload: any) => {
        if (payload.new?.couple_id && !cancelled) {
          setConnected(true)
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [generatedCode, userId])

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
    if (data.error) { setError(data.error); setLoading(false) }
    else { setConnected(true) }
  }

  const requestNotifications = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const { registerPush } = await import('@/lib/push')
        const sub = await registerPush()
        if (sub) await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub, userId }) })
      }
    } catch (e) { console.error(e) }
    setOnboardStep(4)
  }

  // Progress bar for post-match onboarding
  const postMatchProgress = [20, 40, 60, 80, 100]

  const progressBar = (step: number) => (
    <div style={{position:'absolute' as const,top:0,left:0,right:0,height:'2px',background:'rgba(255,255,255,0.06)'}}>
      <div style={{height:'100%',background:'#E8A598',width:`${postMatchProgress[step]}%`,transition:'width 0.4s ease'}} />
    </div>
  )

  // Step 0 — Celebration
  if (connected && onboardStep === 0) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar(0)}
      <div className={styles.screenInner} style={{textAlign:'center' as const}}>
        <div style={{fontSize:'2.8rem',color:'#E8A598',marginBottom:'1rem',animation:'pulse 2s ease-in-out infinite'}}>✦</div>
        <h2 style={{fontSize:'2rem',color:'#F5F0E8',marginBottom:'0.5rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',fontWeight:400}}>It&apos;s a match!</h2>
        <p style={{fontSize:'1rem',color:'#E8A598',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',marginBottom:'1.5rem'}}>I think you&apos;re gonna be good at this 😉</p>
        <p style={{fontSize:'0.85rem',color:'#8A847C',lineHeight:1.85,marginBottom:'2rem'}}>Let&apos;s get you both set up. Takes two minutes.</p>
        <button className="btn btn-yes" onClick={() => setOnboardStep(1)}>Let&apos;s go →</button>
      </div>
    </div>
  )

  // Step 1 — Partner name
  if (connected && onboardStep === 1) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar(1)}
      <div className={styles.screenInner} style={{textAlign:'center' as const}}>
        <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,width:'100%',marginBottom:'1.5rem'}}>
          <button className={styles.backBtn} onClick={() => setOnboardStep(0)}>← back</button>
          <span style={{fontSize:'0.65rem',color:'#8A847C'}}>1 of 4</span>
        </div>
        <h2 style={{fontSize:'1.4rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',fontWeight:400,marginBottom:'0.5rem',color:'#F5F0E8'}}>What&apos;s your partner&apos;s name?</h2>
        <p style={{fontSize:'0.82rem',color:'#8A847C',marginBottom:'1.5rem',lineHeight:1.75}}>We&apos;ll use it to make your experience feel personal.</p>
        <div className={styles.formGroup} style={{width:'100%',marginBottom:'1rem'}}>
          <input className="input" placeholder="Their first name"
            value={partnerNameInput} onChange={e => setPartnerNameInput(e.target.value)}
            style={{textAlign:'center' as const,fontSize:'1rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic'}}
            onKeyDown={e => e.key === 'Enter' && partnerNameInput.trim() && setOnboardStep(2)}
            autoFocus />
        </div>
        <button className="btn btn-yes" onClick={() => setOnboardStep(2)} disabled={!partnerNameInput.trim()}>Continue →</button>
        <button className="btn btn-ghost" style={{marginTop:'0.5rem'}} onClick={() => setOnboardStep(2)}>Skip for now</button>
      </div>
    </div>
  )

  // Step 2 — Prompt time
  const timeWindowDefs = [
    { key: 'morning', label: 'Morning', sub: '7 – 10 am', min: 420, max: 600 },
    { key: 'afternoon', label: 'Afternoon', sub: '12 – 3 pm', min: 720, max: 900 },
    { key: 'evening', label: 'Evening', sub: '5 – 8 pm', min: 1020, max: 1200 },
    { key: 'custom', label: 'Custom', sub: 'You choose', min: 420, max: 1380 },
  ]
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h)
    return `${h12}:${String(m).padStart(2,'0')}${ampm}`
  }

  const randomInWindow = (min: number, max: number) => {
    const steps = Math.floor((max - min) / 5)
    return min + Math.floor(Math.random() * steps) * 5
  }

  const saveTimeAndContinue = async () => {
    const win = timeWindowDefs.find(t => t.key === timeWindow)!
    const minutes = timeWindow === 'custom' ? onboardNotifMinutes : randomInWindow(win.min, win.max)
    await fetch('/api/profile', { method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userId, custom_notif_hour: minutes, partner_name: partnerNameInput.trim() || null }) })
    if (sameTime) {
      await fetch('/api/couple', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'set_same_time', userId }) })
    }
    setOnboardStep(3)
  }

  if (connected && onboardStep === 2) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar(2)}
      <div className={styles.screenInner} style={{textAlign:'center' as const}}>
        <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,width:'100%',marginBottom:'1.5rem'}}>
          <button className={styles.backBtn} onClick={() => setOnboardStep(1)}>← back</button>
          <span style={{fontSize:'0.65rem',color:'#8A847C'}}>2 of 4</span>
        </div>
        <h2 style={{fontSize:'1.4rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',fontWeight:400,marginBottom:'0.5rem',color:'#F5F0E8'}}>When would you like to be prompted?</h2>
        <p style={{fontSize:'0.82rem',color:'#8A847C',marginBottom:'1.5rem',lineHeight:1.75}}>Your partner sets their own time independently.</p>

        <div style={{width:'100%',display:'flex',flexDirection:'column' as const,gap:'0.5rem',marginBottom:'1rem'}}>
          {timeWindowDefs.map(t => (
            <button key={t.key} onClick={() => { setTimeWindow(t.key); if (t.key !== 'custom') setOnboardNotifMinutes(randomInWindow(t.min, t.max)) }}
              style={{width:'100%',padding:'0.8rem 1rem',border:`1px solid ${timeWindow === t.key ? 'rgba(232,165,152,0.4)' : 'rgba(255,255,255,0.08)'}`,background:timeWindow === t.key ? 'rgba(232,165,152,0.08)' : 'none',cursor:'pointer',display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,transition:'all 0.2s'}}>
              <span style={{fontSize:'0.85rem',color:timeWindow === t.key ? '#F5F0E8' : '#8A847C'}}>{t.label}</span>
              <span style={{fontSize:'0.75rem',color:timeWindow === t.key ? '#E8A598' : '#8A847C'}}>{t.sub}</span>
            </button>
          ))}
        </div>

        {timeWindow === 'custom' && (
          <div style={{width:'100%',marginBottom:'1rem',padding:'1rem',border:'1px solid rgba(232,165,152,0.15)'}}>
            <div style={{display:'flex',alignItems:'center' as const,gap:'1rem',marginBottom:'0.5rem'}}>
              <input type="range" min={420} max={1380} step={5}
                value={onboardNotifMinutes}
                onChange={e => setOnboardNotifMinutes(parseInt(e.target.value))}
                style={{flex:1}} />
              <span style={{fontSize:'1rem',color:'#E8A598',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',minWidth:'55px'}}>{formatTime(onboardNotifMinutes)}</span>
            </div>
            <div style={{fontSize:'0.68rem',color:'#8A847C',display:'flex',justifyContent:'space-between' as const}}>
              <span>7:00am</span><span>11:00pm</span>
            </div>
          </div>
        )}

        <button onClick={() => setSameTime(!sameTime)}
          style={{width:'100%',padding:'0.8rem 1rem',border:`1px solid ${sameTime ? 'rgba(232,165,152,0.4)' : 'rgba(255,255,255,0.08)'}`,background:sameTime ? 'rgba(232,165,152,0.06)' : 'none',cursor:'pointer',display:'flex',alignItems:'center' as const,gap:'0.8rem',marginBottom:'1.2rem',transition:'all 0.2s'}}>
          <div style={{width:'16px',height:'16px',border:`1px solid ${sameTime ? '#E8A598' : 'rgba(255,255,255,0.2)'}`,background:sameTime ? 'rgba(232,165,152,0.2)' : 'none',flexShrink:0,display:'flex',alignItems:'center' as const,justifyContent:'center' as const}}>
            {sameTime && <span style={{fontSize:'10px',color:'#E8A598'}}>✓</span>}
          </div>
          <span style={{fontSize:'0.8rem',color:sameTime ? '#F5F0E8' : '#8A847C',textAlign:'left' as const,lineHeight:1.5}}>My partner and I want to be notified at the same time</span>
        </button>

        <button className="btn btn-yes" onClick={saveTimeAndContinue}>Save →</button>
      </div>
    </div>
  )

  // Step 3 — Notifications
  if (connected && onboardStep === 3) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar(3)}
      <div className={styles.screenInner} style={{textAlign:'center' as const}}>
        <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const,width:'100%',marginBottom:'1.5rem'}}>
          <button className={styles.backBtn} onClick={() => setOnboardStep(2)}>← back</button>
          <span style={{fontSize:'0.65rem',color:'#8A847C'}}>3 of 4</span>
        </div>
        <div style={{fontSize:'2.2rem',marginBottom:'1rem'}}>🔔</div>
        <h2 style={{fontSize:'1.4rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',fontWeight:400,marginBottom:'0.5rem',color:'#F5F0E8'}}>Don&apos;t miss your prompt.</h2>
        <p style={{fontSize:'0.82rem',color:'#8A847C',lineHeight:1.85,marginBottom:'2rem'}}>
          This is how we reach you each evening. Without it, the whole thing doesn&apos;t work. Enable it now — you can always adjust later.
        </p>
        <button className="btn btn-yes" style={{marginBottom:'0.6rem'}} onClick={requestNotifications}>Enable notifications →</button>
        <button className="btn btn-ghost" onClick={() => setOnboardStep(4)}>Maybe later</button>
        <p style={{fontSize:'0.65rem',color:'#8A847C',opacity:0.5,marginTop:'1rem'}}>You can enable this anytime from Settings.</p>
      </div>
    </div>
  )

  // Step 4 — All set
  if (connected && onboardStep === 4) return (
    <div className={styles.screen} style={{position:'relative' as const}}>
      {progressBar(4)}
      <div className={styles.screenInner} style={{textAlign:'center' as const}}>
        <div style={{fontSize:'2.2rem',color:'#E8A598',marginBottom:'1rem'}}>✦</div>
        <h2 style={{fontSize:'1.8rem',fontFamily:"'DM Serif Display',serif",fontStyle:'italic',fontWeight:400,marginBottom:'0.5rem',color:'#F5F0E8'}}>You&apos;re all set.</h2>
        <p style={{fontSize:'0.85rem',color:'#8A847C',lineHeight:1.85,marginBottom:'2rem'}}>
          Your first prompt arrives tonight. Both of you. At the same time.<br/>If you both say yes — you&apos;ll both know.
        </p>
        <div style={{width:'100%',border:'1px solid rgba(232,165,152,0.15)',padding:'1rem',marginBottom:'2rem'}}>
          <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.6rem'}}>Tonight you&apos;ll both receive</div>
          <div style={{background:'#2A2520',borderRadius:'8px',padding:'0.8rem',textAlign:'left' as const,border:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex',alignItems:'center' as const,gap:'6px',marginBottom:'4px'}}>
              <div style={{width:'18px',height:'18px',background:'#C4614A',borderRadius:'4px',display:'flex',alignItems:'center' as const,justifyContent:'center' as const,fontFamily:"'DM Serif Display',serif",fontStyle:'italic',fontSize:'8px',color:'#F5F0E8',flexShrink:0}}>u</div>
              <span style={{fontSize:'10px',color:'#F5F0E8',fontWeight:500}}>uDown</span>
            </div>
            <div style={{fontSize:'11px',color:'#F5F0E8',marginBottom:'2px'}}>Is tonight the night?</div>
            <div style={{fontSize:'10px',color:'#8A847C'}}>uDown? 🌙</div>
          </div>
        </div>
        <button className="btn btn-yes" onClick={onLinked}>Go to the app →</button>
      </div>
    </div>
  )

  // Done
  if (connected && onboardStep >= 5) {
    onLinked()
    return null
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
          ['✦','Couples goal','Set a shared monthly target and track it together'],
          ['✦','This week\'s spark','Weekly intimacy prompts — both answer, then reveal'],
          ['📅','Match history','See your connection over time with a private calendar'],
          ['⭐','Rate positions','Track what you loved, tried, and want to try next'],
          ['🛡','Streak protection','One grace day per month to protect your streak'],
          ['🏆','Milestone moments','Celebrate your 10th, 25th, 50th match together'],
          ['📝','Partner notes','Leave a private note after a match'],
          ['⏰','Custom timing','Set your own daily prompt window'],
        ].map(([icon, title, desc]) => (
          <div key={title as string} style={{display:'flex',gap:'0.8rem',alignItems:'flex-start'}}>
            <span style={{fontSize:'1rem',marginTop:'0.1rem',color:icon === '✦' ? '#E8A598' : 'inherit'}}>{icon}</span>
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

function Home({ profile, partnerName, todayResponse, todayMood, matched, partnerMood, yesCount, currentStreak, longestStreak, premiumData, coupleId, userId, coupleMeta, sparkData, goalData, setGoalData, onRespond, onRatePosition, onSaveNote, onUpgrade, onSettings, onSignOut }: any) {
  const [loading, setLoading] = useState(false)
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'unknown'|'granted'|'denied'|'dismissed'>('unknown')
  const [signalSent, setSignalSent] = useState<'none'|'onmyway'|'time'>('none')
  const [suggestedTime, setSuggestedTime] = useState('')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [myWord, setMyWord] = useState<string | null>(null)
  const [partnerWord, setPartnerWord] = useState<string | null>(null)
  const [wordInput, setWordInput] = useState('')
  const [wordSaving, setWordSaving] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const tapTimer = useRef<any>(null)
  const [sparkReflection, setSparkReflection] = useState('')
  const [sparkSaved, setSparkSaved] = useState(false)
  const [showGoalSetter, setShowGoalSetter] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : 'Good evening'
  const position = getTodayPosition()
  const isPremium = profile?.is_premium
  const inTrial = isInTrial(coupleMeta?.trial_started_at)

  useEffect(() => {
    if (matched && coupleId && userId) {
      fetch(`/api/word?coupleId=${coupleId}&userId=${userId}`)
        .then(r => r.json())
        .then(d => { setMyWord(d.myWord); setPartnerWord(d.partnerWord) })
        .catch(() => {})
    }
  }, [matched, coupleId, userId])
  const hasAccess = isPremium || inTrial
  const trialDaysLeft = daysLeftInTrial(coupleMeta?.trial_started_at)
  const posRating = premiumData?.ratings?.find((r: any) => r.position_name === position.name)?.rating

  const respond = async (r: 'yes' | 'no') => {
    setLoading(true)
    await onRespond(r, selectedMoods.length > 0 ? selectedMoods : null)
    setLoading(false)
  }

  useEffect(() => {
    if (!('Notification' in window)) { setNotifStatus('denied'); return }
    if (Notification.permission === 'granted') setNotifStatus('granted')
    else if (Notification.permission === 'denied') setNotifStatus('denied')
    else setNotifStatus('unknown')
  }, [])

  const requestNotifPermission = async () => {
    const permission = await Notification.requestPermission()
    setNotifStatus(permission === 'granted' ? 'granted' : 'denied')
    if (permission === 'granted') {
      // Re-register push subscription
      try {
        const { registerPush } = await import('@/lib/push')
        const sub = await registerPush()
        if (sub) await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub, userId }) })
      } catch (e) { console.error(e) }
    }
  }

  const sendSignal = async (type: string, time?: string) => {
    await fetch('/api/signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type, time }) })
    setSignalSent(type === 'on_my_way' ? 'onmyway' : 'time')
    setShowTimePicker(false)
    setSuggestedTime('')
  }

  const myMoods: string[] = Array.isArray(todayMood) ? todayMood : (todayMood ? [todayMood] : [])
  const partnerMoods: string[] = Array.isArray(partnerMood) ? partnerMood : (partnerMood ? [partnerMood] : [])
  const sharedMoods = myMoods.filter(m => partnerMoods.includes(m))
  const myMoodLabel = myMoods.map(k => MOODS.find(m => m.key === k)?.label).filter(Boolean).join(' · ')
  const matchedMoodLabel = sharedMoods.length > 0
    ? sharedMoods.map(k => MOODS.find(m => m.key === k)?.label).filter(Boolean).join(' · ')
    : partnerMoods.map(k => MOODS.find(m => m.key === k)?.label).filter(Boolean).join(' · ')

  const milestoneMsg = yesCount === 10 ? "✦ Ten nights together." : yesCount === 25 ? "✦ Twenty-five. That's something." : yesCount === 50 ? "✦ Fifty nights. Remarkable." : yesCount === 100 ? "✦ One hundred. Legendary." : null

  return (
    <div className={styles.screen}>
      <div className={styles.homeHeader}>
        <div className={styles.logo} onClick={() => {
          const next = tapCount + 1
          setTapCount(next)
          clearTimeout(tapTimer.current)
          if (next >= 5) { setTapCount(0); window.location.href = '/test' }
          else { tapTimer.current = setTimeout(() => setTapCount(0), 2000) }
        }}>u<em>Down</em></div>
        <div className={styles.homeHeaderRight}>
{!isPremium && <button onClick={onUpgrade} style={{fontSize:'0.6rem',letterSpacing:'0.08em',color:'#E8A598',background:'none',border:'1px solid rgba(232,165,152,0.3)',padding:'0.2rem 0.5rem',cursor:'pointer',textTransform:'uppercase'}}>Plus</button>}
          <button className={styles.settingsBtn} onClick={onSettings} style={{fontSize:"1.3rem",padding:"0 0.3rem"}}>⚙</button>
          <button className={styles.signOut} onClick={onSignOut}>sign out</button>
        </div>
      </div>

      <div className={styles.homeBody}>
        <div className={styles.homeGlow} />

        {notifStatus === 'unknown' && (
          <div style={{width:'100%',maxWidth:'340px',margin:'0 auto 1.5rem',border:'1px solid rgba(232,165,152,0.25)',padding:'1rem 1.2rem',display:'flex',flexDirection:'column' as const,gap:'0.6rem',background:'rgba(232,165,152,0.04)'}}>
            <div style={{fontSize:'0.7rem',color:'#F5F0E8',lineHeight:1.5}}>🔔 Enable notifications to get your daily prompt and match alerts.</div>
            <div style={{display:'flex',gap:'0.6rem'}}>
              <button onClick={requestNotifPermission} className="btn btn-yes" style={{flex:1,padding:'0.5rem',fontSize:'0.72rem'}}>Enable</button>
              <button onClick={() => setNotifStatus('dismissed')} className="btn btn-ghost" style={{flex:1,padding:'0.5rem',fontSize:'0.72rem'}}>Not now</button>
            </div>
          </div>
        )}

        {notifStatus === 'denied' && (
          <div style={{width:'100%',maxWidth:'340px',margin:'0 auto 1.5rem',border:'1px solid rgba(138,132,124,0.2)',padding:'0.8rem 1.2rem',fontSize:'0.68rem',color:'#8A847C',lineHeight:1.6}}>
            🔕 Notifications are blocked. Enable them in your browser settings to get daily prompts.
          </div>
        )}

        {matched ? (
          <div className={styles.matchState}>

            {/* Animated match moment */}
            <div style={{textAlign:'center' as const, marginBottom:'1.5rem'}}>
              <div style={{fontSize:'2.5rem',animation:'pulse 2s ease-in-out infinite',marginBottom:'0.8rem'}}>✦</div>
              <h2 className={`${styles.matchTitle} serif`} style={{marginBottom:'0.4rem'}}>You're both down.</h2>
              <p style={{fontSize:'0.8rem',color:'#8A847C',lineHeight:1.7,marginBottom: sharedMoods.length > 0 ? '1rem' : 0}}>
                {sharedMoods.length > 0
                  ? `You're both feeling it the same way.`
                  : `Tonight's the night.`}
              </p>

              {sharedMoods.length > 0 && (
                <div style={{width:'100%',maxWidth:'340px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}>
                  {sharedMoods.map(key => {
                    const m = MOODS.find(m => m.key === key)
                    if (!m) return null
                    return (
                      <div key={key} style={{
                        padding:'0.6rem',
                        border:'1px solid rgba(232,165,152,0.6)',
                        background:'rgba(232,165,152,0.12)',
                        position:'relative' as const,
                      }}>
                        <div style={{fontSize:'0.72rem',color:'#E8A598'}}>{m.label}</div>
                        <div style={{fontSize:'0.58rem',color:'#8A847C',marginTop:'2px',opacity:0.7}}>{m.desc}</div>
                        <div style={{position:'absolute' as const,top:'4px',right:'6px',fontSize:'0.55rem',color:'#E8A598'}}>✦</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Match counter + milestone */}
            <div style={{border:'1px solid rgba(232,165,152,0.2)',padding:'1.2rem 1.8rem',textAlign:'center' as const,marginBottom:'1.5rem',width:'100%',maxWidth:'340px',boxSizing:'border-box' as const}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'3rem',fontStyle:'italic',color:'#E8A598',lineHeight:1}}>{yesCount}</div>
              <div style={{fontSize:'0.6rem',letterSpacing:'0.15em',textTransform:'uppercase' as const,color:'#8A847C',marginTop:'0.4rem'}}>nights together</div>
              {milestoneMsg && (
                <div style={{marginTop:'0.8rem',paddingTop:'0.8rem',borderTop:'1px solid rgba(232,165,152,0.15)',fontSize:'0.72rem',color:'#E8A598',letterSpacing:'0.05em'}}>{milestoneMsg}</div>
              )}
            </div>

{/* Let them know */}
            <div style={{width:'100%',maxWidth:'340px',marginBottom:'1.5rem'}}>
              <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.8rem',textAlign:'center' as const}}>Let them know</div>
              {signalSent === 'none' ? (
                <button className="btn btn-yes" onClick={() => sendSignal('on_my_way')}
                  style={{width:'100%',padding:'0.9rem',fontSize:'0.82rem'}}>
                  🌙 On my way now
                </button>
              ) : (
                <div style={{textAlign:'center' as const,padding:'1rem',border:'1px solid rgba(232,165,152,0.15)'}}>
                  <div style={{fontSize:'0.78rem',color:'#F5F0E8'}}>🌙 They know you&apos;re on your way.</div>
                </div>
              )}
            </div>

            {/* Match counter in header already shown, just streaks here */}
            <div style={{width:'100%',maxWidth:'340px',fontSize:'0.65rem',color:'#8A847C',textAlign:'center' as const,lineHeight:1.8}}>
              {currentStreak > 1 && <div>🔥 {currentStreak} nights in a row</div>}
            </div>

          </div>

        ) : todayResponse ? (
          <div className={styles.respondedState}>
            <div className={styles.respondedIcon}>{todayResponse === 'yes' ? '👀' : '🌙'}</div>
            <h2 className={`${styles.respondedTitle} serif`}>{todayResponse === 'yes' ? 'Got it.' : 'No worries.'}</h2>
            <p className={styles.respondedSub}>{todayResponse === 'yes' ? `Waiting on ${partnerName}. If they're down too, you'll both know.` : "We'll check in again tomorrow."}</p>
            <div className={styles.responseTag}>You said <span className={todayResponse === 'yes' ? styles.tagYes : styles.tagNo}>{todayResponse === 'yes' ? 'yes' : 'no'}</span> today{myMoodLabel ? ` · ${myMoodLabel}` : ''}</div>

<Dashboard yesCount={yesCount} currentStreak={currentStreak} longestStreak={longestStreak} />

            {/* Couples Goal */}
            <CouplesGoal goalData={goalData} yesCount={yesCount} coupleId={coupleId} userId={userId}
              showGoalSetter={showGoalSetter} setShowGoalSetter={setShowGoalSetter}
              goalInput={goalInput} setGoalInput={setGoalInput} setGoalData={setGoalData}
              hasAccess={isPremium} onUpgrade={onUpgrade} trialDaysLeft={0} />

            {/* The Spark */}
            <SparkSection sparkData={sparkData} coupleId={coupleId} userId={userId} partnerName={partnerName}
              sparkReflection={sparkReflection} setSparkReflection={setSparkReflection}
              sparkSaved={sparkSaved} setSparkSaved={setSparkSaved}
              hasAccess={isPremium} onUpgrade={onUpgrade} trialDaysLeft={0} />

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

            <div style={{marginBottom:'1.5rem',width:'100%',maxWidth:'300px'}}>
                <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.6rem',textAlign:'center'}}>Set the vibe — select all that apply</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                  {MOODS.map(m => {
                    const selected = selectedMoods.includes(m.key)
                    return (
                    <button key={m.key} onClick={() => setSelectedMoods(prev => selected ? prev.filter(k => k !== m.key) : [...prev, m.key])}
                      style={{padding:'0.6rem',border:`1px solid ${selected ? '#E8A598' : 'rgba(232,165,152,0.15)'}`,background:selected ? 'rgba(232,165,152,0.1)' : 'none',color:selected ? '#E8A598' : '#8A847C',fontSize:'0.7rem',cursor:'pointer',textAlign:'left' as const}}>
                      <div>{m.label}</div>
                      <div style={{fontSize:'0.6rem',opacity:0.7,marginTop:'0.1rem'}}>{m.desc}</div>
                    </button>
                    )
                  })}
                </div>
              </div>

            <div className={styles.responseButtons}>
              <button className="btn btn-yes" onClick={() => respond('yes')} disabled={loading}>Yeah 👀</button>
              <button className="btn btn-no" onClick={() => respond('no')} disabled={loading}>Not tonight</button>
            </div>

            {!isPremium && (
              <button onClick={onUpgrade} style={{marginTop:'1.5rem',fontSize:'0.7rem',color:'#E8A598',background:'none',border:'1px solid rgba(232,165,152,0.2)',padding:'0.5rem 1.2rem',cursor:'pointer',letterSpacing:'0.06em'}}>✦ See what Plus unlocks</button>
            )}
          </div>
        )}
      </div>
      <div className={styles.homeFooter}>Private by design. {partnerName} can't see your answer.</div>
    </div>
  )
}


function SparkSection({ sparkData, coupleId, userId, partnerName, sparkReflection, setSparkReflection, sparkSaved, setSparkSaved, hasAccess, onUpgrade, trialDaysLeft }: any) {
  const [saving, setSaving] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [localSparkData, setLocalSparkData] = useState(sparkData)

  if (!localSparkData?.prompt) return null

  const myAnswer = localSparkData.myReflection || (sparkSaved ? sparkReflection : null)
  const partnerAnswer = localSparkData.partnerReflection
  const bothAnswered = myAnswer && partnerAnswer

  const saveAnswer = async () => {
    if (!sparkReflection.trim()) return
    setSaving(true)
    const res = await fetch('/api/spark', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-reflection', coupleId, userId, reflection: sparkReflection }) })
    const data = await res.json()
    setSaving(false)
    setSparkSaved(true)
    setShowInput(false)
    setLocalSparkData((prev: any) => ({ ...prev, myReflection: sparkReflection, partnerReflection: data.partnerReflection || null }))
  }

  return (
    <div style={{width:'100%',maxWidth:'340px',marginTop:'1.5rem',border:'1px solid rgba(232,165,152,0.2)',padding:'1.4rem',display:'flex',flexDirection:'column' as const,gap:'0.8rem'}}>
      <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const}}>
        <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#E8A598'}}>✦ This Week&apos;s Spark</div>
        {trialDaysLeft > 0 && !hasAccess && <div style={{fontSize:'0.55rem',color:'#8A847C'}}>{trialDaysLeft}d left</div>}
      </div>

      {!hasAccess ? (
        <div style={{textAlign:'center' as const}}>
          <div style={{fontSize:'0.75rem',color:'#8A847C',marginBottom:'0.8rem',lineHeight:1.6}}>Weekly intimacy prompts for you and your partner.</div>
          <button className="btn btn-ghost" onClick={onUpgrade} style={{fontSize:'0.72rem',padding:'0.5rem 1rem'}}>Unlock with Plus ✦</button>
        </div>
      ) : (
        <>
          <p style={{fontSize:'0.82rem',color:'#F5F0E8',lineHeight:1.7,fontStyle:'italic'}}>&ldquo;{localSparkData.prompt}&rdquo;</p>

          {/* Both answered — show side by side reveal */}
          {bothAnswered ? (
            <div style={{display:'flex',flexDirection:'column' as const,gap:'0.8rem',borderTop:'1px solid rgba(232,165,152,0.1)',paddingTop:'0.8rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.8rem'}}>
                <div>
                  <div style={{fontSize:'0.55rem',letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#E8A598',marginBottom:'0.4rem'}}>You</div>
                  <div style={{fontSize:'0.75rem',color:'#F5F0E8',lineHeight:1.6,background:'rgba(232,165,152,0.05)',padding:'0.7rem',border:'1px solid rgba(232,165,152,0.12)'}}>{myAnswer}</div>
                </div>
                <div>
                  <div style={{fontSize:'0.55rem',letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#8A847C',marginBottom:'0.4rem'}}>{partnerName || 'Them'}</div>
                  <div style={{fontSize:'0.75rem',color:'#F5F0E8',lineHeight:1.6,background:'rgba(138,132,124,0.05)',padding:'0.7rem',border:'1px solid rgba(138,132,124,0.12)'}}>{partnerAnswer}</div>
                </div>
              </div>
            </div>

          ) : myAnswer ? (
            <div style={{borderTop:'1px solid rgba(232,165,152,0.1)',paddingTop:'0.8rem',display:'flex',flexDirection:'column' as const,gap:'0.6rem'}}>
              <div>
                <div style={{fontSize:'0.55rem',letterSpacing:'0.1em',textTransform:'uppercase' as const,color:'#E8A598',marginBottom:'0.4rem'}}>Your answer</div>
                <div style={{fontSize:'0.75rem',color:'#F5F0E8',lineHeight:1.6,background:'rgba(232,165,152,0.05)',padding:'0.7rem',border:'1px solid rgba(232,165,152,0.12)'}}>{myAnswer}</div>
              </div>
              <div style={{fontSize:'0.68rem',color:'#8A847C',textAlign:'center' as const}}>
                Waiting on {partnerName || 'your partner'} to answer — their response will appear here ✦
              </div>
            </div>

          ) : showInput ? (
            <div style={{display:'flex',flexDirection:'column' as const,gap:'0.5rem'}}>
              <textarea value={sparkReflection} onChange={e => setSparkReflection(e.target.value)}
                placeholder="Your answer..."
                style={{width:'100%',background:'rgba(245,240,232,0.05)',border:'1px solid rgba(232,165,152,0.2)',color:'#F5F0E8',padding:'0.8rem',fontSize:'0.75rem',resize:'none' as const,height:'100px',boxSizing:'border-box' as const,fontFamily:'inherit'}} />
              <div style={{display:'flex',gap:'0.5rem'}}>
                <button className="btn btn-yes" style={{flex:1,padding:'0.5rem',fontSize:'0.72rem'}} onClick={saveAnswer} disabled={saving || !sparkReflection.trim()}>
                  {saving ? '...' : 'Submit ✦'}
                </button>
                <button className="btn btn-ghost" style={{flex:1,padding:'0.5rem',fontSize:'0.72rem'}} onClick={() => setShowInput(false)}>Cancel</button>
              </div>
              <div style={{fontSize:'0.62rem',color:'#8A847C',textAlign:'center' as const}}>
                {partnerAnswer ? `${partnerName || 'Your partner'} has already answered — submit yours to see theirs` : 'Your answer won&apos;t be visible until you both respond'}
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{fontSize:'0.75rem',padding:'0.6rem'}} onClick={() => setShowInput(true)}>
              Answer this week&apos;s prompt ✦
            </button>
          )}
        </>
      )}
    </div>
  )
}

function CouplesGoal({ goalData, yesCount, coupleId, userId, showGoalSetter, setShowGoalSetter, goalInput, setGoalInput, setGoalData, hasAccess, onUpgrade, trialDaysLeft }: any) {
  const [saving, setSaving] = useState(false)

  const saveGoal = async () => {
    if (!goalInput || isNaN(Number(goalInput))) return
    setSaving(true)
    try {
      const res = await fetch('/api/goal', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupleId, userId, target: Number(goalInput) }) })
      const data = await res.json()
if (data.success) {
        setGoalData({ goalTarget: Number(goalInput), matchCount: goalData?.matchCount || 0, goalMonth: goalData?.goalMonth })
        setShowGoalSetter(false)
      }
    } catch (e) {
      console.error('goal save error:', e)
    }
    setSaving(false)
  }

  const target = goalData?.goalTarget
  const count = goalData?.matchCount || 0
  const progress = target ? Math.min(count / target, 1) : 0
  const achieved = target && count >= target
  const currentMonth = new Date().toLocaleString('default', { month: 'long' })

  return (
    <div style={{width:'100%',maxWidth:'340px',marginTop:'1rem',border:'1px solid rgba(232,165,152,0.2)',padding:'1.4rem',display:'flex',flexDirection:'column' as const,gap:'0.8rem'}}>
      <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'center' as const}}>
        <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#E8A598'}}>✦ {currentMonth} Goal</div>
        {trialDaysLeft > 0 && !hasAccess && <div style={{fontSize:'0.55rem',color:'#8A847C'}}>{trialDaysLeft}d left</div>}
      </div>

      {!hasAccess ? (
        <div style={{textAlign:'center' as const}}>
          <div style={{fontSize:'0.75rem',color:'#8A847C',marginBottom:'0.8rem',lineHeight:1.6}}>Set a shared monthly goal and track it together.</div>
          <button className="btn btn-ghost" onClick={onUpgrade} style={{fontSize:'0.72rem',padding:'0.5rem 1rem'}}>Unlock with Plus ✦</button>
        </div>
      ) : !target || showGoalSetter ? (
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.6rem'}}>
          <div style={{fontSize:'0.75rem',color:'#8A847C'}}>How many nights together this month? (1–30)</div>
          <input type="number" min="1" max="30" placeholder="Enter a number..." value={goalInput}
            onChange={e => {
              const val = Math.min(30, Math.max(1, parseInt(e.target.value) || 0))
              setGoalInput(val > 0 ? String(val) : '')
            }}
            style={{background:'rgba(245,240,232,0.05)',border:'1px solid rgba(232,165,152,0.2)',color:'#F5F0E8',padding:'0.8rem',fontSize:'1.2rem',width:'100%',boxSizing:'border-box' as const,textAlign:'center' as const}} />
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button className="btn btn-yes" style={{flex:1,padding:'0.6rem',fontSize:'0.75rem'}} onClick={saveGoal} disabled={saving || !goalInput}>
              {saving ? '...' : 'Set goal ✦'}
            </button>
            {target && <button className="btn btn-ghost" style={{flex:1,padding:'0.6rem',fontSize:'0.75rem'}} onClick={() => setShowGoalSetter(false)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.6rem'}}>
          {achieved ? (
            <div style={{textAlign:'center' as const,padding:'0.5rem 0'}}>
              <div style={{fontSize:'1.5rem',marginBottom:'0.3rem'}}>✦</div>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.1rem',fontStyle:'italic',color:'#E8A598'}}>Goal reached.</div>
              <div style={{fontSize:'0.68rem',color:'#8A847C',marginTop:'0.2rem'}}>{count} of {target} nights this month</div>
            </div>
          ) : (
            <>
              <div style={{display:'flex',justifyContent:'space-between' as const,alignItems:'baseline' as const}}>
                <div style={{fontSize:'0.75rem',color:'#F5F0E8'}}>{count} <span style={{color:'#8A847C'}}>of {target} nights</span></div>
                <div style={{fontSize:'0.68rem',color:'#8A847C'}}>{target - count} to go</div>
              </div>
              <div style={{width:'100%',height:'3px',background:'rgba(232,165,152,0.15)',position:'relative' as const}}>
                <div style={{position:'absolute' as const,left:0,top:0,height:'100%',width:`${progress * 100}%`,background:'#E8A598',transition:'width 0.5s ease'}} />
              </div>
            </>
          )}
          <button onClick={() => { setShowGoalSetter(true); setGoalInput(String(target)) }}
            style={{fontSize:'0.62rem',color:'#8A847C',background:'none',border:'none',cursor:'pointer',textAlign:'left' as const,padding:0}}>
            Edit goal
          </button>
        </div>
      )}
    </div>
  )
}

function Dashboard({ yesCount, currentStreak, longestStreak }: any) {
  return (
    <div style={{marginTop:'2rem',width:'100%',maxWidth:'340px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
      <div style={{border:'1px solid rgba(232,165,152,0.2)',padding:'1.2rem',textAlign:'center' as const}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'2.2rem',fontStyle:'italic',color:'#E8A598',lineHeight:1}}>{yesCount}</div>
        <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginTop:'0.3rem'}}>Nights Together</div>
      </div>
      <div style={{border:'1px solid rgba(232,165,152,0.2)',padding:'1.2rem',textAlign:'center' as const}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'2.2rem',fontStyle:'italic',color:'#F5F0E8',lineHeight:1}}>
          {currentStreak > 0 ? <span>{currentStreak} 🔥</span> : longestStreak > 0 ? <span>{longestStreak} ⭐</span> : '—'}
        </div>
        <div style={{fontSize:'0.6rem',letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8A847C',marginTop:'0.3rem'}}>
          {currentStreak > 0 ? 'Current Streak' : 'Consecutive Night Record'}
        </div>
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

function Settings({ profile, partnerName, yesCount, currentStreak, longestStreak, coupleId, premiumData, onUpgrade, onRemovePartner, onBack, onSaveNotifHour, onSignOut, coupleMeta }: any) {
  const [notifMinutes, setNotifMinutes] = useState((profile?.custom_notif_hour ?? 17) * 60)
  const [hourSaved, setHourSaved] = useState(false)
  const isPremium = profile?.is_premium
  const inTrial = isInTrial(coupleMeta?.trial_started_at)
  const hasAccess = isPremium || inTrial
  const trialDaysLeft = daysLeftInTrial(coupleMeta?.trial_started_at)

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
            <input type="range" min={840} max={1260} step={5} value={notifMinutes} onChange={e => setNotifMinutes(parseInt(e.target.value))} style={{flex:1}} />
            <span style={{fontSize:'0.8rem',color:'#F5F0E8',minWidth:'55px'}}>
              {(() => {
                const h = Math.floor(notifMinutes / 60)
                const m = notifMinutes % 60
                const ampm = h >= 12 ? 'pm' : 'am'
                const h12 = h > 12 ? h - 12 : h
                return `${h12}:${String(m).padStart(2,'0')}${ampm}`
              })()}
            </span>
          </div>
          <button className="btn btn-ghost" style={{marginTop:'0.8rem',padding:'0.6rem',fontSize:'0.72rem'}} onClick={async () => { await onSaveNotifHour(notifMinutes); setHourSaved(true); setTimeout(() => setHourSaved(false), 2000) }}>{hourSaved ? 'Saved ✓' : 'Save time'}</button>
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
