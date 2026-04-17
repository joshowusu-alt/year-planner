import type { PlannerEvent, RecurrenceRule } from '../types/index.ts'

export type ImportablePlannerEvent = Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'>

export interface CalendarImportIssue {
  title: string
  reason: string
}

export interface CalendarImportResult {
  events: ImportablePlannerEvent[]
  issues: CalendarImportIssue[]
  totalFound: number
  duplicateCount: number
  skippedCount: number
  unsupportedRecurrenceCount: number
}

export function buildImportEventKey(event: Pick<ImportablePlannerEvent, 'date' | 'title' | 'startTime' | 'endTime'>): string {
  return [
    event.date,
    event.title.trim().toLowerCase(),
    event.startTime ?? '',
    event.endTime ?? '',
  ].join('|')
}

export function normalizeImportText(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/\r\n/g, '\n').trim()
  return normalized ? normalized : undefined
}

export function buildImportNotes(...parts: Array<string | undefined>): string | undefined {
  const filtered = parts.filter(Boolean)
  return filtered.length > 0 ? filtered.join('\n\n') : undefined
}

export function mapTextRecurrence(rawValue: string | null | undefined): { recurrence?: RecurrenceRule; issue?: string } {
  const value = rawValue?.trim().toLowerCase()

  if (!value || value === 'none' || value === 'one-time' || value === 'one time' || value === 'once') {
    return {}
  }

  if (value === 'weekly' || value === 'every week') {
    return { recurrence: { type: 'weekly' } }
  }

  if (
    value === 'biweekly'
    || value === 'bi-weekly'
    || value === 'fortnightly'
    || value === 'every 2 weeks'
    || value === 'every two weeks'
  ) {
    return { recurrence: { type: 'biweekly' } }
  }

  if (value === 'monthly' || value === 'every month') {
    return { recurrence: { type: 'monthly' } }
  }

  if (value === 'annually' || value === 'annual' || value === 'yearly' || value === 'every year') {
    return { recurrence: { type: 'annually' } }
  }

  return {
    issue: `Imported as a one-time event because "${rawValue}" recurrence is not supported.`,
  }
}
