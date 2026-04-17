import type { EventCategoryDef, PlannerEvent } from '../types/index.ts'
import {
  buildImportEventKey,
  buildImportNotes,
  mapTextRecurrence,
  normalizeImportText,
  type CalendarImportIssue,
  type CalendarImportResult,
  type ImportablePlannerEvent,
} from './importUtils.ts'

type SpreadsheetRow = Record<string, unknown>

interface XlsxModule {
  read: (data: ArrayBuffer, options: Record<string, unknown>) => {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  utils: {
    sheet_to_json: <T>(worksheet: unknown, options: Record<string, unknown>) => T[]
  }
}

const TEMPLATE_HEADERS = ['Date', 'Title', 'Category', 'Start Time', 'End Time', 'Notes', 'Recurrence', 'Reminder']
const REQUIRED_TEMPLATE_HEADERS = ['Date', 'Title']

const COLUMN_ALIASES = {
  date: ['date', 'day', 'event date', 'calendar date'],
  title: ['title', 'event', 'event title', 'activity', 'name', 'subject'],
  category: ['category', 'type', 'event category'],
  startTime: ['start time', 'start', 'time', 'from', 'begins'],
  endTime: ['end time', 'end', 'finish', 'to'],
  notes: ['notes', 'description', 'details', 'comments', 'comment'],
  recurrence: ['recurrence', 'repeat', 'repeats', 'frequency'],
  reminder: ['reminder', 'reminder minutes', 'reminder (minutes)', 'remind me'],
} as const

let xlsxPromise: Promise<XlsxModule> | null = null

function loadXlsx() {
  if (!xlsxPromise) {
    xlsxPromise = import('xlsx') as Promise<XlsxModule>
  }
  return xlsxPromise
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function formatTimeParts(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

function formatDateFromDateObject(date: Date): string {
  return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function formatTimeFromDateObject(date: Date): string {
  return formatTimeParts(date.getHours(), date.getMinutes())
}

function parseExcelSerialDate(value: number): string | null {
  if (!Number.isFinite(value)) return null
  const wholeDays = Math.floor(value)
  if (wholeDays <= 0) return null
  const utcDays = wholeDays - 25569
  const date = new Date(utcDays * 86_400_000)
  if (Number.isNaN(date.getTime())) return null
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function parseExcelSerialTime(value: number): string | null {
  if (!Number.isFinite(value)) return null
  const fraction = value % 1
  const safeFraction = fraction < 0 ? 0 : fraction
  const totalMinutes = Math.round(safeFraction * 24 * 60)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return formatTimeParts(hours, minutes)
}

function getCellValue(row: SpreadsheetRow, field: keyof typeof COLUMN_ALIASES): unknown {
  const aliases = COLUMN_ALIASES[field] as readonly string[]

  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeHeader(key))) {
      return value
    }
  }

  return undefined
}

function hasRequiredHeaders(rows: SpreadsheetRow[]): boolean {
  const headers = new Set(
    rows.flatMap((row) => Object.keys(row).map(normalizeHeader)),
  )

  return REQUIRED_TEMPLATE_HEADERS.every((requiredHeader) => headers.has(normalizeHeader(requiredHeader)))
}

function parseDateValue(value: unknown): string | null {
  if (value instanceof Date) {
    return formatDateFromDateObject(value)
  }

  if (typeof value === 'number') {
    return parseExcelSerialDate(value)
  }

  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return formatDateFromDateObject(parsed)
}

function parseTimeValue(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined

  if (value instanceof Date) {
    return formatTimeFromDateObject(value)
  }

  if (typeof value === 'number') {
    return parseExcelSerialTime(value) ?? undefined
  }

  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  const match24Hour = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (match24Hour) {
    const hours = Number(match24Hour[1])
    const minutes = Number(match24Hour[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return formatTimeParts(hours, minutes)
    }
  }

  const match12Hour = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (match12Hour) {
    const rawHours = Number(match12Hour[1])
    const minutes = Number(match12Hour[2] ?? '0')
    const meridiem = match12Hour[3].toLowerCase()
    if (rawHours >= 1 && rawHours <= 12 && minutes >= 0 && minutes <= 59) {
      const hours = (rawHours % 12) + (meridiem === 'pm' ? 12 : 0)
      return formatTimeParts(hours, minutes)
    }
  }

  return undefined
}

function parseReminderValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed)
    }
  }

  return null
}

function resolveCategory(
  rawValue: unknown,
  categories: EventCategoryDef[],
  defaultCategory: string,
): { category: string; issue?: string } {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return { category: defaultCategory }
  }

  const normalizedValue = normalizeHeader(rawValue)
  const match = categories.find((category) =>
    normalizeHeader(category.id) === normalizedValue || normalizeHeader(category.label) === normalizedValue,
  )

  if (match) {
    return { category: match.id }
  }

  return {
    category: defaultCategory,
    issue: `Used "${defaultCategory}" because category "${rawValue}" does not exist in your planner.`,
  }
}

function formatCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function downloadPlannerImportTemplate(): void {
  const rows = [
    TEMPLATE_HEADERS,
    ['2026-01-15', 'Team Sync', 'Meetings', '09:00', '10:00', 'Weekly planning call', 'weekly', '30'],
  ]
  const csv = rows.map((row) => row.map((cell) => formatCsvCell(cell)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'stratum-import-template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function importCalendarEventsFromRows(
  rows: SpreadsheetRow[],
  existingEvents: PlannerEvent[],
  categories: EventCategoryDef[],
  defaultCategory: string,
): CalendarImportResult {
  if (rows.length === 0) {
    throw new Error('No spreadsheet rows were found. Add at least one event row and try again.')
  }

  if (!hasRequiredHeaders(rows)) {
    throw new Error('Spreadsheet must include Date and Title columns. Download the STRATUM template for the quickest setup.')
  }

  const existingKeys = new Set(existingEvents.map(buildImportEventKey))
  const events: ImportablePlannerEvent[] = []
  const issues: CalendarImportIssue[] = []
  let duplicateCount = 0
  let skippedCount = 0
  let unsupportedRecurrenceCount = 0

  for (const row of rows) {
    const rawTitle = getCellValue(row, 'title')
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
    const label = title || 'Untitled row'
    const date = parseDateValue(getCellValue(row, 'date'))

    if (!title || !date) {
      skippedCount++
      issues.push({
        title: label,
        reason: 'Skipped row because it is missing a valid Date or Title.',
      })
      continue
    }

    const { category, issue: categoryIssue } = resolveCategory(getCellValue(row, 'category'), categories, defaultCategory)
    if (categoryIssue) {
      issues.push({ title, reason: categoryIssue })
    }

    const { recurrence, issue: recurrenceIssue } = mapTextRecurrence(
      typeof getCellValue(row, 'recurrence') === 'string' ? String(getCellValue(row, 'recurrence')) : undefined,
    )
    if (recurrenceIssue) {
      unsupportedRecurrenceCount++
      issues.push({ title, reason: recurrenceIssue })
    }

    const reminder = parseReminderValue(getCellValue(row, 'reminder'))
    const nextEvent: ImportablePlannerEvent = {
      date,
      title,
      category,
      notes: buildImportNotes(normalizeImportText(String(getCellValue(row, 'notes') ?? ''))),
      recurrence,
      startTime: parseTimeValue(getCellValue(row, 'startTime')),
      endTime: parseTimeValue(getCellValue(row, 'endTime')),
      reminder,
    }

    const key = buildImportEventKey(nextEvent)
    if (existingKeys.has(key)) {
      duplicateCount++
      issues.push({ title, reason: 'Skipped duplicate event already in your planner.' })
      continue
    }

    existingKeys.add(key)
    events.push(nextEvent)
  }

  return {
    events,
    issues,
    totalFound: rows.length,
    duplicateCount,
    skippedCount,
    unsupportedRecurrenceCount,
  }
}

export async function importCalendarEventsFromTableFile(
  file: File,
  existingEvents: PlannerEvent[],
  categories: EventCategoryDef[],
  defaultCategory: string,
): Promise<CalendarImportResult> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('This spreadsheet has no sheets to import.')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, {
    defval: '',
    raw: true,
  })

  return importCalendarEventsFromRows(rows, existingEvents, categories, defaultCategory)
}
