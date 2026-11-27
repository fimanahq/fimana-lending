import type { DashboardKpis } from '@/lib/types/lending'

type CachedKpis = {
  userId: string
  manilaDate: string
  savedAt: number
  data: DashboardKpis
}

const MAX_BROWSER_CACHE_AGE_MS = 5 * 60 * 1000
const listeners = new Set<() => void>()
let cached: CachedKpis | null = null

function getManilaDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Manila',
    year: 'numeric',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function notify() {
  listeners.forEach((listener) => listener())
}

const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('fimana-dashboard-kpis')
  : null

if (channel) {
  channel.onmessage = () => {
    cached = null
    notify()
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      cached = null
      notify()
    }
  })
}

export function subscribeDashboardKpis(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getCachedDashboardKpis(userId: string | null) {
  if (!userId || !cached || cached.userId !== userId) {
    return null
  }
  if (cached.manilaDate !== getManilaDate() || Date.now() - cached.savedAt > MAX_BROWSER_CACHE_AGE_MS) {
    return null
  }
  return cached.data
}

export function saveDashboardKpis(userId: string, data: DashboardKpis) {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return
  }
  cached = { userId, data, manilaDate: getManilaDate(), savedAt: Date.now() }
  notify()
}

export function invalidateDashboardKpis() {
  cached = null
  notify()
  channel?.postMessage('invalidate')
}
