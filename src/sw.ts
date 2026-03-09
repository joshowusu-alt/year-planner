/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Precache all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Push notification handler ──────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title: string; body: string; icon?: string; tag?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'STRATUM', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icon.svg',
      badge: '/apple-touch-icon.png',
      tag: payload.tag ?? 'stratum-reminder',
      requireInteraction: false,
      silent: false,
    })
  )
})

// ── Notification click — open/focus the app ────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing tab if open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return (client as WindowClient).focus()
          }
        }
        // Otherwise open a new tab
        return self.clients.openWindow('/')
      })
  )
})

// ── Skip waiting so new SW activates immediately ───────────────────────────
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
