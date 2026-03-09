/** Converts a base64url VAPID public key to a Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
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

export async function subscribeToPush(userId?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const reg = await swReady()
    const applicationServerKey = urlBase64ToUint8Array(
      import.meta.env.VITE_VAPID_PUBLIC_KEY as string
    )
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
    })
    if (!res.ok) return { ok: false, error: `Server error ${res.status}` }
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Push subscribe failed:', msg)
    // NotAllowedError = permission denied by user or iOS non-PWA
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
    await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    return sub.unsubscribe()
  } catch (e) {
    console.error('Push unsubscribe failed:', e)
    return false
  }
}

export type { PushStatus }
