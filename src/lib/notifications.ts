/**
 * Schedules browser Notification-based reminders for upcoming events.
 * Since there is no push server, setTimeout is used for in-session reminders,
 * and reminders are re-checked on page visibility change.
 *
 * Strategy:
 *  1. On each call to scheduleReminders(), cancel all existing timers.
 *  2. For every event that has a reminder (event.reminder >= 0) and a startTime:
 *     a. Compute the event's datetime: event.date + 'T' + event.startTime
 *     b. Compute the notification time: eventDateTime - reminder minutes
 *     c. If notificationTime is in the future and within the next 48 hours,
 *        set a setTimeout.
 *  3. The setTimeout fires: new Notification(title, {body, icon, tag})
 *  4. A module-level Map deduplicates scheduled timers (key = eventId + dateStr)
 */

import type { PlannerEvent } from '../types'
import { isRecurringOnDate } from '../types'

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function canShowNotifications(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.requestPermission()
}

function buildReminderText(reminder: number): string {
  if (reminder === 0) return 'Starting now'
  if (reminder < 60) return `In ${reminder} minutes`
  if (reminder === 60) return 'In 1 hour'
  return `In ${reminder / 60} hours`
}

function scheduleForDate(ev: PlannerEvent, dateStr: string): void {
  if (ev.reminder == null || ev.reminder < 0 || !ev.startTime) return
  const eventDateTime = new Date(`${dateStr}T${ev.startTime}`)
  if (isNaN(eventDateTime.getTime())) return
  const fireAt = eventDateTime.getTime() - ev.reminder * 60_000
  const now = Date.now()
  const delay = fireAt - now
  if (delay <= 0 || delay > 48 * 3600 * 1000) return
  const key = `${ev.id}__${dateStr}`
  if (activeTimers.has(key)) return // already scheduled
  const timer = setTimeout(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(ev.title, {
        body: buildReminderText(ev.reminder as number),
        icon: '/icon.svg',
        tag: key,
        silent: false,
      })
    }
    activeTimers.delete(key)
  }, delay)
  activeTimers.set(key, timer)
}

export function scheduleReminders(events: PlannerEvent[]): void {
  if (typeof Notification === 'undefined') return
  cancelAllReminders()
  const eligible = events.filter(
    (ev) => ev.reminder != null && ev.reminder >= 0 && ev.startTime,
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const ev of eligible) {
    // Always try the event's own base date
    scheduleForDate(ev, ev.date)
    // For recurring events, also schedule for each of the next 7 days
    if (ev.recurrence && ev.recurrence.type !== 'none') {
      for (let i = 0; i <= 7; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        const ds = d.toISOString().split('T')[0]
        if (ds !== ev.date && isRecurringOnDate(ev, ds)) {
          scheduleForDate(ev, ds)
        }
      }
    }
  }
}

export function cancelAllReminders(): void {
  for (const timer of activeTimers.values()) {
    clearTimeout(timer)
  }
  activeTimers.clear()
}
