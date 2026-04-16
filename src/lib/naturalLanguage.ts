import { addDays, addWeeks, format, getDay, setDay } from 'date-fns'
import type { EventCategoryDef, RecurrenceRule, RecurrenceType } from '../types/index.ts'

export interface ParsedEvent {
  title: string
  date: string
  startTime?: string
  endTime?: string
  recurrence?: RecurrenceRule
  category: string
  confidence: 'high' | 'medium' | 'low'
  _dateFound: boolean
  _dateAmbiguous?: boolean
  _titleFound: boolean
}

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function toHHMM(h: number, m: number): string {
  return `${padTwo(h)}:${padTwo(m)}`
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return toHHMM(Math.floor(total / 60) % 24, total % 60)
}

function getNextWeekdayAfter(from: Date, dayIndex: number): Date {
  const current = getDay(from)
  const diff = (dayIndex - current + 7) % 7
  return addDays(from, diff === 0 ? 7 : diff)
}

function getThisWeekday(from: Date, dayIndex: number): Date {
  return setDay(from, dayIndex, { weekStartsOn: 0 })
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function parseNaturalLanguage(
  input: string,
  today: Date,
  categories: EventCategoryDef[],
): ParsedEvent | null {
  if (input.trim().length < 3) return null

  const raw = input.trim()
  const text = raw.toLowerCase()
  const toRemove: Array<[number, number]> = []

  let parsedDate = today
  let dateFound = false
  let dateAmbiguous = false

  const markRemove = (match: RegExpMatchArray) => {
    const start = match.index ?? 0
    toRemove.push([start, start + match[0].length])
  }

  const todayRe = /\btoday\b/
  const todayM = text.match(todayRe)
  if (todayM) { parsedDate = today; dateFound = true; markRemove(todayM) }

  if (!dateFound) {
    const m = text.match(/\btomorrow\b/)
    if (m) { parsedDate = addDays(today, 1); dateFound = true; markRemove(m) }
  }

  if (!dateFound) {
    const m = text.match(/\byesterday\b/)
    if (m) { parsedDate = addDays(today, -1); dateFound = true; markRemove(m) }
  }

  if (!dateFound) {
    const m = text.match(/\bin\s+(\d+)\s+(days?|weeks?)\b/)
    if (m) {
      const n = Number.parseInt(m[1], 10)
      const baseDate = m[2].startsWith('week') ? addWeeks(today, n) : addDays(today, n)
      parsedDate = baseDate
      dateFound = true
      markRemove(m)
      if (m[2].startsWith('week')) {
        const days = Object.keys(WEEKDAY_MAP).join('|')
        const wdM = text.match(new RegExp(`\\b(${days})\\b`))
        if (wdM) {
          const dayIdx = WEEKDAY_MAP[wdM[1]]
          const baseDayIdx = getDay(baseDate)
          const diff = (dayIdx - baseDayIdx + 7) % 7
          parsedDate = addDays(baseDate, diff)
          markRemove(wdM)
        }
      }
    }
  }

  if (!dateFound) {
    const m = text.match(/\bnext\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/)
    if (m) {
      const dayIdx = WEEKDAY_MAP[m[1]]
      const thisWeek = getThisWeekday(today, dayIdx)
      parsedDate = addDays(thisWeek, 7)
      dateFound = true
      markRemove(m)
    }
  }

  if (!dateFound) {
    const m = text.match(/\bthis\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/)
    if (m) {
      parsedDate = getThisWeekday(today, WEEKDAY_MAP[m[1]])
      dateFound = true
      markRemove(m)
    }
  }

  if (!dateFound) {
    const days = Object.keys(WEEKDAY_MAP).join('|')
    const m = text.match(new RegExp(`\\b(${days})\\b`))
    if (m) {
      parsedDate = getNextWeekdayAfter(today, WEEKDAY_MAP[m[1]])
      dateFound = true
      markRemove(m)
    }
  }

  if (!dateFound) {
    const months = Object.keys(MONTH_MAP).join('|')
    const ordinal = '(?:st|nd|rd|th)?'
    const m =
      text.match(new RegExp(`\\b(${months})\\s+(\\d{1,2})${ordinal}\\b`)) ||
      text.match(new RegExp(`\\b(\\d{1,2})${ordinal}\\s+(${months})\\b`))
    if (m) {
      let monthStr: string
      let dayStr: string
      if (MONTH_MAP[m[1]] !== undefined) {
        monthStr = m[1]
        dayStr = m[2]
      } else {
        dayStr = m[1]
        monthStr = m[2]
      }
      const month = MONTH_MAP[monthStr.toLowerCase()]
      const day = Number.parseInt(dayStr, 10)
      const candidate = new Date(today.getFullYear(), month, day)
      if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
      parsedDate = candidate
      dateFound = true
      markRemove(m)
    }
  }

  if (!dateFound) {
    const m = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
    if (m) {
      const a = Number.parseInt(m[1], 10)
      const b = Number.parseInt(m[2], 10)
      let candidate: Date
      if (a > 12) {
        candidate = new Date(today.getFullYear(), b - 1, a)
      } else if (b > 12) {
        candidate = new Date(today.getFullYear(), a - 1, b)
      } else {
        const mmdd = new Date(today.getFullYear(), a - 1, b)
        const ddmm = new Date(today.getFullYear(), b - 1, a)
        const daysUntilMmdd = (mmdd.getTime() - today.getTime()) / 86400000
        const daysUntilDdmm = (ddmm.getTime() - today.getTime()) / 86400000
        dateAmbiguous = true
        candidate =
          daysUntilMmdd >= 0 && (daysUntilDdmm < 0 || daysUntilMmdd <= daysUntilDdmm)
            ? mmdd
            : ddmm
      }
      if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
      parsedDate = candidate
      dateFound = true
      markRemove(m)
    }
  }

  let startTime: string | undefined
  let endTime: string | undefined

  const noonM = text.match(/\bat\s+noon\b/)
  if (noonM) { startTime = '12:00'; markRemove(noonM) }

  const midnightM = text.match(/\bat\s+midnight\b/)
  if (midnightM && !startTime) { startTime = '00:00'; markRemove(midnightM) }

  if (!startTime) {
    const m = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
    if (m) {
      let h = Number.parseInt(m[1], 10)
      const min = m[2] ? Number.parseInt(m[2], 10) : 0
      const ampm = m[3]
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      startTime = toHHMM(h, min)
      markRemove(m)
    }
  }

  if (!startTime) {
    const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
    if (m) {
      let h = Number.parseInt(m[1], 10)
      const min = m[2] ? Number.parseInt(m[2], 10) : 0
      const ampm = m[3]
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      startTime = toHHMM(h, min)
      markRemove(m)
    }
  }

  if (!startTime) {
    const m = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
    if (m) {
      startTime = toHHMM(Number.parseInt(m[1], 10), Number.parseInt(m[2], 10))
      markRemove(m)
    }
  }

  const untilNoonM = text.match(/\buntil\s+noon\b/)
  if (untilNoonM) { endTime = '12:00'; markRemove(untilNoonM) }

  const untilMidnightM = text.match(/\buntil\s+midnight\b/)
  if (untilMidnightM && !endTime) { endTime = '00:00'; markRemove(untilMidnightM) }

  if (!endTime) {
    const m = text.match(/\buntil\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
    if (m) {
      let h = Number.parseInt(m[1], 10)
      const min = m[2] ? Number.parseInt(m[2], 10) : 0
      const ampm = m[3]
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      endTime = toHHMM(h, min)
      markRemove(m)
    }
  }

  if (!endTime && startTime) {
    const m = text.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/)
    if (m) {
      const mins = Math.round(Number.parseFloat(m[1]) * 60)
      endTime = addMinutesToTime(startTime, mins)
      markRemove(m)
    }
  }

  if (!endTime && startTime) {
    const m = text.match(/\bfor\s+(\d+)\s*(?:minutes?|mins?)\b/)
    if (m) {
      endTime = addMinutesToTime(startTime, Number.parseInt(m[1], 10))
      markRemove(m)
    }
  }

  if (!endTime && startTime) {
    const m = text.match(/\bfor\s+(\d+)\s*h\s+(\d+)\s*m\b/)
    if (m) {
      const mins = Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10)
      endTime = addMinutesToTime(startTime, mins)
      markRemove(m)
    }
  }

  let recurrence: RecurrenceRule | undefined

  const recurrenceMatchers: Array<[RegExp, RecurrenceType]> = [
    [/\b(?:every\s+year|annually|yearly)\b/, 'annually'],
    [/\b(?:every\s+month|monthly)\b/, 'monthly'],
    [/\b(?:every\s+2\s+weeks?|biweekly|bi-weekly|fortnightly|every\s+other\s+week)\b/, 'biweekly'],
    [/\b(?:every\s+week|weekly)\b/, 'weekly'],
    [/\b(?:every\s+day|daily)\b/, 'weekly'],
    [/\bevery\s+(?:sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)\b/, 'weekly'],
  ]

  for (const [re, rtype] of recurrenceMatchers) {
    const m = text.match(re)
    if (m) {
      recurrence = { type: rtype }
      markRemove(m)
      break
    }
  }

  const defaultCategory = categories[0]?.id ?? 'general'
  let categoryId = defaultCategory

  const categoryKeywords: Array<[RegExp, string]> = [
    [/\b(?:meeting|standup|stand-up|sync|call|interview|zoom|teams|conference)\b/, 'meeting'],
    [/\b(?:doctor|dentist|gym|workout|yoga|haircut|personal|barber|appointment|therapy)\b/, 'personal'],
    [/\b(?:holiday|vacation|birthday|anniversary|christmas|xmas|halloween|easter|thanksgiving)\b/, 'holiday'],
  ]

  for (const [re, catId] of categoryKeywords) {
    if (re.test(text)) {
      const exists = categories.find((c) => c.id === catId)
      categoryId = exists ? catId : defaultCategory
      break
    }
  }

  toRemove.sort((a, b) => a[0] - b[0])
  let titleText = raw
  const reversedRemove = [...toRemove].reverse()
  for (const [start, end] of reversedRemove) {
    titleText = (titleText.slice(0, start) + ' ' + titleText.slice(end)).trim()
  }

  titleText = titleText
    .replace(/\s{2,}/g, ' ')
    .replace(/^(?:at|on|for|in|the|a|an)\s+/i, '')
    .replace(/\s+(?:at|on|for|in)$/i, '')
    .trim()

  const title = titleText.length > 0
    ? titleText.charAt(0).toUpperCase() + titleText.slice(1)
    : raw.charAt(0).toUpperCase() + raw.slice(1)

  const titleFound = titleText.length >= 2

  let confidence: 'high' | 'medium' | 'low'
  if (dateFound && titleFound) confidence = 'high'
  else if (dateFound || titleFound) confidence = 'medium'
  else confidence = 'low'

  return {
    title,
    date: toDateStr(parsedDate),
    startTime,
    endTime,
    recurrence,
    category: categoryId,
    confidence,
    _dateFound: dateFound,
    _dateAmbiguous: dateAmbiguous,
    _titleFound: titleFound,
  }
}
