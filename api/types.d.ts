// Browser Push API types for use in Node API handlers
interface PushSubscriptionJSON {
  endpoint: string
  expirationTime?: number | null
  keys?: {
    p256dh: string
    auth: string
    [key: string]: string
  }
}
