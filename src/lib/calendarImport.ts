import type { PlannerEvent, RecurrenceRule } from '../types/index.ts'
import {
  buildImportEventKey,
  buildImportNotes,
  normalizeImportText,
  type ImportablePlannerEvent,
  type CalendarImportIssue,
  type CalendarImportResult,
} from './importUtils.ts'

interface IcsRecurLike {
  freq: string
  interval?: number
  until?: {
    year: number
    month: number
    day: number
  } | null
  count?: number | null
  parts: {
    BYDAY?: string[]
  }
}

export type { CalendarImportIssue, CalendarImportResult, ImportablePlannerEvent } from './importUtils.ts'

let icalPromise: Promise<typeof import('ical.js')> | null = null

function loadIcal() {
  if (!icalPromise) {
    icalPromise = import('ical.js')
  }
  return icalPromise
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function formatTimeParts(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

function mapRecurrence(rrule: IcsRecurLike | null): { recurrence?: RecurrenceRule; issue?: string } {
  if (!rrule) return {}

  const until = rrule.until
    ? formatDateParts(rrule.until.year, rrule.until.month, rrule.until.day)
    : undefined

  if (rrule.count) {
    return { issue: 'Imported as a one-time event because COUNT-based recurrence is not supported.' }
  }

  switch (rrule.freq) {
    case 'WEEKLY': {
      const byDay = rrule.parts.BYDAY
      if (Array.isArray(byDay) && byDay.length > 1) {
        return { issue: 'Imported as a one-time event because multi-day weekly recurrence is not supported.' }
      }
      if (rrule.interval === 2) {
        return { recurrence: { type: 'biweekly', ...(until ? { until } : {}) } }
      }
      if (!rrule.interval || rrule.interval === 1) {
        return { recurrence: { type: 'weekly', ...(until ? { until } : {}) } }
      }
      return { issue: 'Imported as a one-time event because this weekly interval is not supported.' }
    }
    case 'MONTHLY':
      return { recurrence: { type: 'monthly', ...(until ? { until } : {}) } }
    case 'YEARLY':
      return { recurrence: { type: 'annually', ...(until ? { until } : {}) } }
    default:
      return { issue: `Imported as a one-time event because ${rrule.freq.toLowerCase()} recurrence is not supported.` }
  }
}

export async function importCalendarEventsFromIcs(
  text: string,
  existingEvents: PlannerEvent[],
  defaultCategory: string,
): Promise<CalendarImportResult> {
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('Invalid calendar file. No VCALENDAR block found.')
  }

  const ICAL = (await loadIcal()).default
  const root = new ICAL.Component(ICAL.parse(text))
  const vevents = root.getAllSubcomponents('vevent')

  if (vevents.length === 0) {
    throw new Error('No calendar events were found in this file.')
  }

  const existingKeys = new Set(existingEvents.map(buildImportEventKey))
  const events: ImportablePlannerEvent[] = []
  const issues: CalendarImportIssue[] = []
  let duplicateCount = 0
  let skippedCount = 0
  let unsupportedRecurrenceCount = 0

  for (const component of vevents) {
    const event = new ICAL.Event(component)
    const title = event.summary?.trim() || 'Untitled event'

    try {
      if (event.isRecurrenceException()) {
        skippedCount++
        issues.push({ title, reason: 'Skipped recurrence exception.' })
        continue
      }

      const status = String(component.getFirstPropertyValue('status') ?? '').toUpperCase()
      if (status === 'CANCELLED') {
        skippedCount++
        issues.push({ title, reason: 'Skipped cancelled event.' })
        continue
      }

      if (!event.startDate || !event.summary?.trim()) {
        skippedCount++
        issues.push({ title, reason: 'Skipped event because it is missing a start date or title.' })
        continue
      }

      const date = formatDateParts(event.startDate.year, event.startDate.month, event.startDate.day)
      const startTime = event.startDate.isDate
        ? undefined
        : formatTimeParts(event.startDate.hour, event.startDate.minute)

      let endTime: string | undefined
      let trailingNote: string | undefined

      if (event.endDate) {
        const endDate = formatDateParts(event.endDate.year, event.endDate.month, event.endDate.day)
        if (!event.endDate.isDate && endDate === date) {
          endTime = formatTimeParts(event.endDate.hour, event.endDate.minute)
        } else if (endDate !== date) {
          trailingNote = `Imported calendar event ends on ${endDate}.`
        }
      }

      const rrule = component.getFirstPropertyValue('rrule') as IcsRecurLike | null
      const { recurrence, issue } = mapRecurrence(rrule)
      if (issue) {
        unsupportedRecurrenceCount++
        issues.push({ title, reason: issue })
      }

      const nextEvent: ImportablePlannerEvent = {
        date,
        title: event.summary.trim(),
        category: defaultCategory,
        notes: buildImportNotes(normalizeImportText(event.description), trailingNote),
        recurrence,
        startTime,
        endTime,
        reminder: null,
      }

      const key = buildImportEventKey(nextEvent)
      if (existingKeys.has(key)) {
        duplicateCount++
        issues.push({ title, reason: 'Skipped duplicate event already in your planner.' })
        continue
      }

      existingKeys.add(key)
      events.push(nextEvent)
    } catch (error) {
      skippedCount++
      issues.push({
        title,
        reason: error instanceof Error ? error.message : 'Could not parse this event.',
      })
    }
  }

  return {
    events,
    issues,
    totalFound: vevents.length,
    duplicateCount,
    skippedCount,
    unsupportedRecurrenceCount,
  }
}
