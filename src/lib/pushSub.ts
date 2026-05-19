import { supabase } from './supabase'

/** Converts a base64url VAPID public key to a Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const clean = base64String.trim().replace(/^"|"$/g, '')
  const padding = '='.repeat((4 - (clean.length % 4)) % 4)
  const base64 = (clean + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)))
}

/** navigator.serviceWorker.ready with a timeout so it never hangs forever */
function swReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SW_TIMEOUT')), timeoutMs)
    ),
  ])
}

/** True when running as an installed PWA (standalone) */
export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

/** True on any iOS device */
export function isIOS(): boolean {
  return /iP(hone|od|ad)/.test(navigator.userAgent)
}

type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

export async function getPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await swReady()
    const existing = await reg.pushManager.getSubscription()
    return existing ? 'subscribed' : 'unsubscribed'
  } catch {
    return 'unsubscribed'
  }
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return { ok: false, error: 'SUPABASE_REQUIRED' }
    }
    const vapidKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim()
    if (!vapidKey) {
      console.error('VITE_VAPID_PUBLIC_KEY is not set')
      return { ok: false, error: 'VAPID key not configured — contact support.' }
    }
    const reg = await swReady()
    const applicationServerKey = urlBase64ToUint8Array(vapidKey)
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })
    if (!res.ok) return { ok: false, error: `Server error ${res.status}` }
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Push subscribe failed:', msg)
    if (msg.includes('NotAllowedError') || msg.includes('not allowed')) {
      return { ok: false, error: 'PERMISSION_DENIED' }
    }
    if (msg === 'SW_TIMEOUT') {
      return { ok: false, error: 'SW_TIMEOUT' }
    }
    return { ok: false, error: msg }
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    const accessToken = await getAccessToken()
    await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    return sub.unsubscribe()
  } catch (e) {
    console.error('Push unsubscribe failed:', e)
    return false
  }
}

export type { PushStatus }
