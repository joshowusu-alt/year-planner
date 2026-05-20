import type { VercelRequest, VercelResponse } from '@vercel/node'
import { format } from 'date-fns'

type ReminderSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => Promise<{ data: Array<{ user_id: string; store?: { events?: PlannerEvent[] } }> | Array<{ user_id: string; endpoint: string; subscription: unknown }> | null; error: { message: string } | null }>
    delete: () => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  }
}

type ReminderDeps = {
  createSupabaseClient: (url: string, key: string) => ReminderSupabaseClient
  webpushClient: {
    setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
    sendNotification: (subscription: unknown, payload: string) => Promise<unknown>
  }
  now: () => Date
  reminderLookbackMs: number
  reminderLookaheadMs: number
}

const DEFAULT_REMINDER_LOOKBACK_MS = 5 * 60_000
const DEFAULT_REMINDER_LOOKAHEAD_MS = 30_000

interface PlannerEvent {
  id: string
  title: string
  date: string
  startTime?: string
  reminder?: number | null
  recurrence?: { type: string; until?: string }
  deletedDates?: string[]
}

function isEventActiveToday(ev: PlannerEvent, todayStr: string): boolean {
  if (ev.deletedDates?.includes(todayStr)) return false

  if (!ev.recurrence || ev.recurrence.type === 'none') return ev.date === todayStr
  if (todayStr < ev.date) return false
  if (ev.recurrence.until && todayStr > ev.recurrence.until) return false

  const msPerDay = 86_400_000
  const base   = new Date(ev.date   + 'T00:00:00').getTime()
  const target = new Date(todayStr  + 'T00:00:00').getTime()
  const diffDays = Math.round((target - base) / msPerDay)

  switch (ev.recurrence.type) {
    case 'daily':    return true
    case 'weekly':   return diffDays % 7  === 0
    case 'biweekly': return diffDays % 14 === 0
    case 'monthly': {
      const b = new Date(ev.date   + 'T00:00:00')
      const t = new Date(todayStr  + 'T00:00:00')
      return t.getDate() === b.getDate()
    }
    case 'annually':
    case 'yearly': {
      const b = new Date(ev.date   + 'T00:00:00')
      const t = new Date(todayStr  + 'T00:00:00')
      return t.getDate() === b.getDate() && t.getMonth() === b.getMonth()
    }
    default: return false
  }
}

function getProvidedSecret(req: VercelRequest): string | undefined {
  const authHeader = req.headers['authorization']
  const querySecret = req.query['secret']
  if (authHeader) {
    return authHeader.toString().replace(/^Bearer\s+/i, '')
  }
  if (Array.isArray(querySecret)) {
    return querySecret[0]?.toString()
  }
  return querySecret?.toString()
}

export function createSendRemindersHandler(overrides: Partial<ReminderDeps> = {}) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end()

    const secret = process.env.CRON_SECRET
    if (!secret) {
      return res.status(500).json({ error: 'Missing CRON_SECRET' })
    }

    const provided = getProvidedSecret(req)
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const createSupabaseClient = overrides.createSupabaseClient ?? await loadSupabaseClientFactory()
      const webpushClient = overrides.webpushClient ?? await loadWebpushClient()
      const nowFactory = overrides.now ?? (() => new Date())
      const reminderLookbackMs = overrides.reminderLookbackMs ?? DEFAULT_REMINDER_LOOKBACK_MS
      const reminderLookaheadMs = overrides.reminderLookaheadMs ?? DEFAULT_REMINDER_LOOKAHEAD_MS

      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const vapidPublic = process.env.VAPID_PUBLIC_KEY
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY
      if (!supabaseUrl || !supabaseKey || !vapidPublic || !vapidPrivate) {
        return res.status(500).json({ error: 'Missing env vars', supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey, vapidPublic: !!vapidPublic, vapidPrivate: !!vapidPrivate })
      }

      webpushClient.setVapidDetails(
        'mailto:admin@stratum.app',
        vapidPublic.trim().replace(/=+$/, ''),
        vapidPrivate.trim().replace(/=+$/, '')
      )

      const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

      const nowDate = nowFactory()
      const now = nowDate.getTime()
      const todayStr = format(nowDate, 'yyyy-MM-dd')

      const { data: plannerRows, error: plannerErr } = await supabase
        .from('planner_data')
        .select('user_id, store')
      const { data: subscriptions, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('*')

      if (plannerErr) return res.status(500).json({ error: plannerErr.message })
      if (subErr) return res.status(500).json({ error: subErr.message })

      let sent = 0
      let errors = 0

      for (const row of (plannerRows ?? [])) {
        const events: PlannerEvent[] = row.store?.events ?? []
        const userId: string = row.user_id
        const userSubs = subscriptions?.filter((s) => s.user_id === userId) ?? []

        if (userSubs.length === 0) continue

        for (const ev of events) {
          if (!ev.startTime || ev.reminder == null || ev.reminder < 0) continue
          if (!isEventActiveToday(ev, todayStr)) continue

          const eventDateTime = new Date(`${todayStr}T${ev.startTime}`)
          if (isNaN(eventDateTime.getTime())) continue

          const fireAt = eventDateTime.getTime() - ev.reminder * 60_000
          if (fireAt <= now - reminderLookbackMs || fireAt > now + reminderLookaheadMs) continue

          const body = ev.reminder === 0
            ? 'Starting now'
            : ev.reminder < 60
              ? `In ${ev.reminder} minutes`
              : ev.reminder === 60 ? 'In 1 hour'
                : `In ${ev.reminder / 60} hours`

          const payload = JSON.stringify({
            title: ev.title,
            body,
            icon: '/icon.svg',
            tag: `reminder-${ev.id}-${todayStr}`,
          })

          for (const sub of userSubs) {
            try {
              await webpushClient.sendNotification(sub.subscription, payload)
              sent++
            } catch (e: unknown) {
              if ((e as { statusCode?: number }).statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
              }
              errors++
            }
          }
        }
      }

      return res.status(200).json({ sent, errors, checked: plannerRows?.length ?? 0 })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('send-reminders crash:', msg)
      return res.status(500).json({ error: msg })
    }
  }
}

async function loadSupabaseClientFactory(): Promise<ReminderDeps['createSupabaseClient']> {
  const module = await import('@supabase/supabase-js')
  return ((url: string, key: string) => module.createClient(url, key) as unknown as ReminderSupabaseClient)
}

async function loadWebpushClient(): Promise<ReminderDeps['webpushClient']> {
  const module = await import('web-push')
  return (module.default ?? module) as ReminderDeps['webpushClient']
}

const handler = createSendRemindersHandler()

export default handler
