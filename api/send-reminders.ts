import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { parseISO, format, getDay, getDate, getMonth } from 'date-fns'

webpush.setVapidDetails(
  'mailto:admin@stratum.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PlannerEvent {
  id: string
  title: string
  date: string
  startTime?: string
  reminder?: number | null
  recurrence?: { type: string }
}

function isEventActiveToday(ev: PlannerEvent, todayStr: string): boolean {
  if (ev.date === todayStr) return true
  if (!ev.recurrence || ev.recurrence.type === 'none') return false
  const base = parseISO(ev.date)
  const today = parseISO(todayStr)
  if (today < base) return false
  switch (ev.recurrence.type) {
    case 'daily': return true
    case 'weekly': return getDay(today) === getDay(base)
    case 'monthly': return getDate(today) === getDate(base)
    case 'yearly': return getDate(today) === getDate(base) && getMonth(today) === getMonth(base)
    default: return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET (for cron) and POST (for manual trigger)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = Date.now()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Get all planner data rows
  const { data: plannerRows, error: plannerErr } = await supabase
    .from('planner_data')
    .select('user_id, data')

  if (plannerErr) return res.status(500).json({ error: plannerErr.message })

  // Get all push subscriptions
  const { data: subscriptions, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (subErr) return res.status(500).json({ error: subErr.message })

  let sent = 0
  let errors = 0

  for (const row of (plannerRows ?? [])) {
    const events: PlannerEvent[] = row.data?.events ?? []
    const userId: string = row.user_id

    // Find subscriptions for this user (or all if userId is not stored per subscription)
    const userSubs = subscriptions?.filter(s =>
      s.user_id === userId || s.user_id === null
    ) ?? []

    if (userSubs.length === 0) continue

    for (const ev of events) {
      if (!ev.startTime || ev.reminder == null || ev.reminder < 0) continue
      if (!isEventActiveToday(ev, todayStr)) continue

      const eventDateTime = new Date(`${todayStr}T${ev.startTime}`)
      if (isNaN(eventDateTime.getTime())) continue

      const fireAt = eventDateTime.getTime() - ev.reminder * 60_000
      // Fire if within this minute's window (now to now+60s)
      if (fireAt < now || fireAt > now + 60_000) continue

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
          await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
          sent++
        } catch (e: unknown) {
          // 410 Gone = subscription expired, remove it
          if ((e as { statusCode?: number }).statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          errors++
        }
      }
    }
  }

  return res.status(200).json({ sent, errors, checked: plannerRows?.length ?? 0 })
}
