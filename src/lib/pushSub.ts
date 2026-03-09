/** Converts a base64url VAPID public key to a Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)))
}

type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

export async function getPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  return existing ? 'subscribed' : 'unsubscribed'
}

export async function subscribeToPush(userId?: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const applicationServerKey = urlBase64ToUint8Array(
      import.meta.env.VITE_VAPID_PUBLIC_KEY as string
    )
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    // Send to server
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
    })
    return res.ok
  } catch (e) {
    console.error('Push subscribe failed:', e)
    return false
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
