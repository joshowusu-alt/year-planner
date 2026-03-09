import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Zap,
  Calendar,
  Clock,
  RefreshCw,
  Tag,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit3,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { addDays, addWeeks, format, setDay, getDay } from 'date-fns'
import type { RecurrenceRule, RecurrenceType, EventCategoryDef } from '../types'
import { RECURRENCE_LABELS } from '../types'
import { usePlanner } from '../context/PlannerContext'
import { useBreakpoint } from '../hooks/useMediaQuery'
import { EventModal } from './planner/EventModal'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Parser Helpers ───────────────────────────────────────────────────────────

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

/** Convert hours + minutes to HH:mm string */
function toHHMM(h: number, m: number): string {
  return `${padTwo(h)}:${padTwo(m)}`
}

/** Add minutes to a HH:mm string, return HH:mm */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return toHHMM(Math.floor(total / 60) % 24, total % 60)
}

/** Get next upcoming occurrence of a weekday (never the same day) */
function getNextWeekdayAfter(from: Date, dayIndex: number): Date {
  const current = getDay(from)
  const diff = (dayIndex - current + 7) % 7
  return addDays(from, diff === 0 ? 7 : diff)
}

/** Get the Monday–Sunday occurrence for "this <day>" */
function getThisWeekday(from: Date, dayIndex: number): Date {
  return setDay(from, dayIndex, { weekStartsOn: 0 })
}

/** Format Date → yyyy-MM-dd */
function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// ─── Core Parser ──────────────────────────────────────────────────────────────

export function parseNaturalLanguage(
  input: string,
  today: Date,
  categories: EventCategoryDef[],
): ParsedEvent | null {
  if (input.trim().length < 3) return null

  const raw = input.trim()
  let text = raw.toLowerCase()

  // Track which spans to remove from the string for title extraction
  const toRemove: Array<[number, number]> = [] // [start, end] in `text`

  // ── Step 1: Date ────────────────────────────────────────────────────────────
  let parsedDate = today
  let dateFound = false
  let dateAmbiguous = false

  const markRemove = (match: RegExpMatchArray) => {
    const start = match.index ?? 0
    toRemove.push([start, start + match[0].length])
  }

  // "today"
  const todayRe = /\btoday\b/
  const todayM = text.match(todayRe)
  if (todayM) { parsedDate = today; dateFound = true; markRemove(todayM) }

  // "tomorrow"
  if (!dateFound) {
    const m = text.match(/\btomorrow\b/)
    if (m) { parsedDate = addDays(today, 1); dateFound = true; markRemove(m) }
  }

  // "yesterday"
  if (!dateFound) {
    const m = text.match(/\byesterday\b/)
    if (m) { parsedDate = addDays(today, -1); dateFound = true; markRemove(m) }
  }

  // "in N days/weeks"
  if (!dateFound) {
    const m = text.match(/\bin\s+(\d+)\s+(days?|weeks?)\b/)
    if (m) {
      const n = parseInt(m[1])
      const baseDate = m[2].startsWith('week') ? addWeeks(today, n) : addDays(today, n)
      parsedDate = baseDate
      dateFound = true
      markRemove(m)
      // Compound: "in N weeks on <weekday>" / "meeting Tuesday in 2 weeks"
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

  // "next <weekday>"
  if (!dateFound) {
    const m = text.match(/\bnext\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/)
    if (m) {
      const dayIdx = WEEKDAY_MAP[m[1]]
      // "next" always means next week's occurrence
      const thisWeek = getThisWeekday(today, dayIdx)
      parsedDate = addDays(thisWeek, 7)
      dateFound = true
      markRemove(m)
    }
  }

  // "this <weekday>"
  if (!dateFound) {
    const m = text.match(/\bthis\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/)
    if (m) {
      parsedDate = getThisWeekday(today, WEEKDAY_MAP[m[1]])
      dateFound = true
      markRemove(m)
    }
  }

  // bare weekday (e.g. "monday", "friday")
  if (!dateFound) {
    const days = Object.keys(WEEKDAY_MAP).join('|')
    const m = text.match(new RegExp(`\\b(${days})\\b`))
    if (m) {
      parsedDate = getNextWeekdayAfter(today, WEEKDAY_MAP[m[1]])
      dateFound = true
      markRemove(m)
    }
  }

  // "jan 5", "january 5", "5th jan", "5 jan", "jan 5th", etc.
  if (!dateFound) {
    const months = Object.keys(MONTH_MAP).join('|')
    const ordinal = '(?:st|nd|rd|th)?'
    // "month day" — "jan 5" / "january 5th"
    const m =
      text.match(new RegExp(`\\b(${months})\\s+(\\d{1,2})${ordinal}\\b`)) ||
      text.match(new RegExp(`\\b(\\d{1,2})${ordinal}\\s+(${months})\\b`))
    if (m) {
      let monthStr: string
      let dayStr: string
      // Detect which capture is month vs day
      if (MONTH_MAP[m[1]] !== undefined) {
        monthStr = m[1]; dayStr = m[2]
      } else {
        dayStr = m[1]; monthStr = m[2]
      }
      const month = MONTH_MAP[monthStr.toLowerCase()]
      const day = parseInt(dayStr)
      const candidate = new Date(today.getFullYear(), month, day)
      // If already passed, use next year
      if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
      parsedDate = candidate
      dateFound = true
      markRemove(m)
    }
  }

  // "DD/MM" or "MM/DD" — pick closest upcoming
  if (!dateFound) {
    const m = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
    if (m) {
      const a = parseInt(m[1])
      const b = parseInt(m[2])
      let candidate: Date
      if (a > 12) {
        // must be DD/MM
        candidate = new Date(today.getFullYear(), b - 1, a)
      } else if (b > 12) {
        // must be MM/DD
        candidate = new Date(today.getFullYear(), a - 1, b)
      } else {
        // ambiguous: try MM/DD (US default)
        const mmdd = new Date(today.getFullYear(), a - 1, b)
        const ddmm = new Date(today.getFullYear(), b - 1, a)
        // Pick closest upcoming
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

  // ── Step 2: Time ────────────────────────────────────────────────────────────
  let startTime: string | undefined
  let endTime: string | undefined

  // "at noon" / "at midnight"
  const noonM = text.match(/\bat\s+noon\b/)
  if (noonM) { startTime = '12:00'; markRemove(noonM) }

  const midnightM = text.match(/\bat\s+midnight\b/)
  if (midnightM && !startTime) { startTime = '00:00'; markRemove(midnightM) }

  // "at H:MM am/pm" or "at Hampm"
  if (!startTime) {
    const m = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
    if (m) {
      let h = parseInt(m[1])
      const min = m[2] ? parseInt(m[2]) : 0
      const ampm = m[3]
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      startTime = toHHMM(h, min)
      markRemove(m)
    }
  }

  // Bare time at end: e.g. "meeting 3pm" / "call 14:30"
  if (!startTime) {
    const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
    if (m) {
      let h = parseInt(m[1])
      const min = m[2] ? parseInt(m[2]) : 0
      const ampm = m[3]
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      startTime = toHHMM(h, min)
      markRemove(m)
    }
  }

  // 24h bare time like "14:30" (only if explicit colon)
  if (!startTime) {
    const m = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
    if (m) {
      startTime = toHHMM(parseInt(m[1]), parseInt(m[2]))
      markRemove(m)
    }
  }

  // "until HH:MMam/pm" or "until noon/midnight"
  const untilNoonM = text.match(/\buntil\s+noon\b/)
  if (untilNoonM) { endTime = '12:00'; markRemove(untilNoonM) }

  const untilMidnightM = text.match(/\buntil\s+midnight\b/)
  if (untilMidnightM && !endTime) { endTime = '00:00'; markRemove(untilMidnightM) }

  if (!endTime) {
    const m = text.match(/\buntil\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
    if (m) {
      let h = parseInt(m[1])
      const min = m[2] ? parseInt(m[2]) : 0
      const ampm = m[3]
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      endTime = toHHMM(h, min)
      markRemove(m)
    }
  }

  // "for N hours / Nh / Nhr" → endTime = startTime + N*60
  if (!endTime && startTime) {
    const m = text.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/)
    if (m) {
      const mins = Math.round(parseFloat(m[1]) * 60)
      endTime = addMinutesToTime(startTime, mins)
      markRemove(m)
    }
  }

  // "for N minutes / N mins"
  if (!endTime && startTime) {
    const m = text.match(/\bfor\s+(\d+)\s*(?:minutes?|mins?)\b/)
    if (m) {
      endTime = addMinutesToTime(startTime, parseInt(m[1]))
      markRemove(m)
    }
  }

  // "for Xh Ym" (e.g. "for 1h 30m")
  if (!endTime && startTime) {
    const m = text.match(/\bfor\s+(\d+)\s*h\s+(\d+)\s*m\b/)
    if (m) {
      const mins = parseInt(m[1]) * 60 + parseInt(m[2])
      endTime = addMinutesToTime(startTime, mins)
      markRemove(m)
    }
  }

  // ── Step 3: Recurrence ──────────────────────────────────────────────────────
  let recurrence: RecurrenceRule | undefined

  const recurrenceMatchers: Array<[RegExp, RecurrenceType]> = [
    [/\b(?:every\s+year|annually|yearly)\b/, 'annually'],
    [/\b(?:every\s+month|monthly)\b/, 'monthly'],
    [/\b(?:every\s+2\s+weeks?|biweekly|bi-weekly|fortnightly|every\s+other\s+week)\b/, 'biweekly'],
    [/\b(?:every\s+week|weekly)\b/, 'weekly'],
    [/\b(?:every\s+day|daily)\b/, 'weekly'], // daily → weekly (closest supported)
    // "every <weekday>" → weekly
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

  // ── Step 4: Category ────────────────────────────────────────────────────────
  const defaultCategory = categories[0]?.id ?? 'general'
  let categoryId = defaultCategory

  const categoryKeywords: Array<[RegExp, string]> = [
    [/\b(?:meeting|standup|stand-up|sync|call|interview|zoom|teams|conference)\b/, 'meeting'],
    [/\b(?:doctor|dentist|gym|workout|yoga|haircut|personal|barber|appointment|therapy)\b/, 'personal'],
    [/\b(?:holiday|vacation|birthday|anniversary|christmas|xmas|halloween|easter|thanksgiving)\b/, 'holiday'],
  ]

  for (const [re, catId] of categoryKeywords) {
    if (re.test(text)) {
      // Use the id if it exists in categories, else fallback
      const exists = categories.find((c) => c.id === catId)
      categoryId = exists ? catId : defaultCategory
      break
    }
  }

  // ── Step 5: Title Extraction ────────────────────────────────────────────────
  // Sort remove ranges by start, merge overlapping, then remove from the raw string
  toRemove.sort((a, b) => a[0] - b[0])

  // Build the title from the raw input by removing the detected spans
  // We operate on the lowercase version to get positions, then use those to remove from raw
  let titleText = raw
  // Remove spans in reverse order so positions stay valid
  const reversedRemove = [...toRemove].reverse()
  for (const [start, end] of reversedRemove) {
    titleText = (titleText.slice(0, start) + ' ' + titleText.slice(end)).trim()
  }

  // Clean up: remove leftover prepositions / conjunctions at start/end
  titleText = titleText
    .replace(/\s{2,}/g, ' ')
    .replace(/^(?:at|on|for|in|the|a|an)\s+/i, '')
    .replace(/\s+(?:at|on|for|in)$/i, '')
    .trim()

  // Capitalize first letter
  const title = titleText.length > 0
    ? titleText.charAt(0).toUpperCase() + titleText.slice(1)
    : raw.charAt(0).toUpperCase() + raw.slice(1)

  const titleFound = titleText.length >= 2

  // ── Step 6: Confidence ──────────────────────────────────────────────────────
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

// ─── Confidence colours ───────────────────────────────────────────────────────

function confidenceBorder(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return '#34d399'
  if (c === 'medium') return '#d4af37'
  return '#f87171'
}

function ConfidenceIcon({ c }: { c: 'high' | 'medium' | 'low' }) {
  if (c === 'high') return <CheckCircle2 size={14} color="#34d399" />
  if (c === 'medium') return <AlertCircle size={14} color="#d4af37" />
  return <XCircle size={14} color="#f87171" />
}

// ─── Parsed Preview Card ──────────────────────────────────────────────────────

function PreviewCard({
  parsed,
  categories,
  inputLen,
}: {
  parsed: ParsedEvent
  categories: EventCategoryDef[]
  inputLen: number
}) {
  const cat = categories.find((c) => c.id === parsed.category)
  const border = confidenceBorder(parsed.confidence)

  return (
    <div
      style={{
        background: '#0a0e1a',
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Confidence row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ConfidenceIcon c={parsed.confidence} />
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {parsed.confidence === 'high' ? 'Parsed successfully' : parsed.confidence === 'medium' ? 'Partial match' : 'Low confidence'}
        </span>
      </div>

      {/* Low-confidence hint */}
      {parsed.confidence === 'low' && inputLen > 3 && (
        <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
          Could not parse a clear date or title. Try: &quot;Team meeting tomorrow at 3pm&quot;
        </span>
      )}

      {/* Title */}
      <Row icon={<Tag size={13} color="#94a3b8" />} label="Title">
        <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{parsed.title}</span>
      </Row>

      {/* Date */}
      <Row icon={<Calendar size={13} color="#94a3b8" />} label="Date">
        <span style={{ color: '#e2e8f0', fontSize: 14 }}>
          {format(new Date(parsed.date + 'T00:00:00'), 'EEE, MMM d yyyy')}
        </span>
      </Row>
      {!parsed._dateFound && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 22 }}>
          <AlertTriangle size={10} color="#f59e0b" />
          <span style={{ fontSize: 11, color: '#f59e0b' }}>No date detected — defaulting to today</span>
        </div>
      )}
      {parsed._dateAmbiguous && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 22 }}>
          <Info size={10} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Ambiguous date — interpreted as {format(new Date(parsed.date + 'T00:00:00'), 'EEE, MMM d yyyy')}
          </span>
        </div>
      )}

      {/* Time */}
      {parsed.startTime && (
        <Row icon={<Clock size={13} color="#94a3b8" />} label="Time">
          <span style={{ color: '#e2e8f0', fontSize: 14 }}>
            {parsed.startTime}
            {parsed.endTime && <> → {parsed.endTime}</>}
          </span>
        </Row>
      )}

      {/* Recurrence */}
      {parsed.recurrence && parsed.recurrence.type !== 'none' && (
        <Row icon={<RefreshCw size={13} color="#94a3b8" />} label="Repeat">
          <span style={{ color: '#e2e8f0', fontSize: 14 }}>
            {RECURRENCE_LABELS[parsed.recurrence.type]}
          </span>
        </Row>
      )}

      {/* Category */}
      <Row
        icon={
          <span
            style={{
              width: 10, height: 10, borderRadius: 3,
              background: cat?.color ?? '#94a3b8',
              display: 'inline-block', flexShrink: 0,
            }}
          />
        }
        label="Category"
      >
        <span style={{ color: cat?.color ?? '#94a3b8', fontSize: 14 }}>{cat?.label ?? parsed.category}</span>
      </Row>
    </div>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', width: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#94a3b8', width: 56, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{children}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function NaturalLanguageInput({ onClose }: Props) {
  const { store, addEvent } = usePlanner()
  const { categories } = store
  const { isMobile } = useBreakpoint()

  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedEvent | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Autofocus
  useEffect(() => {
    if (!showEditModal) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showEditModal])

  // Parse on input change
  useEffect(() => {
    if (input.trim().length >= 3) {
      setParsed(parseNaturalLanguage(input, new Date(), categories))
    } else {
      setParsed(null)
    }
  }, [input, categories])

  const handleClose = useCallback(() => {
    setMounted(false)
    setTimeout(onClose, 300)
  }, [onClose])

  const handleCreate = useCallback(() => {
    if (!parsed) return
    addEvent(
      parsed.date,
      parsed.title,
      parsed.category,
      undefined,
      parsed.recurrence?.type !== 'none' ? parsed.recurrence : undefined,
      parsed.startTime,
      parsed.endTime,
      parsed.startTime ? undefined : null,
    )
    handleClose()
  }, [parsed, addEvent, handleClose])

  // Keyboard handler for the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!parsed) return
      if (parsed.confidence === 'high' || parsed.confidence === 'medium') {
        handleCreate()
      } else {
        setShowEditModal(true)
      }
      return
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      setShowEditModal(true)
    }
  }

  // Focus trap
  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const focusableEls = containerRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusableEls || focusableEls.length === 0) return
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

  // ── Overlay click to close ────────────────────────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose()
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#0d1224',
        border: '1px solid #1e2d40',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        padding: '20px 16px 32px',
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 300ms ease',
        zIndex: 51,
        maxHeight: '90vh',
        overflowY: 'auto',
      }
    : {
        position: 'relative',
        background: '#0d1224',
        border: '1px solid #1e2d40',
        borderRadius: 16,
        padding: '20px 20px 20px',
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        marginTop: 80,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(-16px)',
        transition: 'opacity 250ms ease, transform 250ms ease',
        zIndex: 51,
      }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.7)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick add event"
        style={cardStyle}
        onKeyDown={handleContainerKeyDown}
      >
        {/* Handle bar on mobile */}
        {isMobile && (
          <div
            style={{
              width: 36, height: 4, borderRadius: 2,
              background: '#1e2d40',
              margin: '0 auto 16px',
            }}
          />
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#d4af37" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.03em' }}>
              Quick Add
            </span>
            <span
              style={{
                fontSize: 10, color: '#94a3b8', background: '#0a0e1a',
                border: '1px solid #1e2d40', borderRadius: 4,
                padding: '2px 6px', fontFamily: 'monospace',
              }}
            >
              /
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Try: "Team meeting tomorrow at 3pm for 1h"'
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            background: '#0a0e1a',
            border: '1px solid #1e2d40',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 15,
            fontWeight: 500,
            color: '#e2e8f0',
            outline: 'none',
            caretColor: '#d4af37',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#d4af37'
            e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#1e2d40'
            e.target.style.boxShadow = 'none'
          }}
        />

        {/* Hint chips */}
        {input.length < 3 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {['tomorrow at 9am', 'next Monday', 'every week', 'in 3 days', 'Jan 15 at 2pm for 1h'].map((chip) => (
              <button
                key={chip}
                tabIndex={-1}
                onClick={() => setInput(chip)}
                style={{
                  background: '#0a0e1a', border: '1px solid #1e2d40',
                  borderRadius: 20, padding: '4px 10px',
                  fontSize: 11, color: '#94a3b8', cursor: 'pointer',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#d4af37')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2d40')}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        {parsed && input.trim().length >= 3 && (
          <div style={{ marginTop: 12 }}>
            <PreviewCard
              parsed={parsed}
              categories={categories}
              inputLen={input.trim().length}
            />
          </div>
        )}

        {/* Actions */}
        {parsed && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleCreate}
              style={{
                flex: 1,
                background: '#d4af37',
                color: '#111827',
                border: 'none',
                borderRadius: 10,
                padding: '11px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Create Event
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid #1e2d40',
                borderRadius: 10,
                padding: '11px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'border-color 150ms, color 150ms',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d4af37'
                e.currentTarget.style.color = '#d4af37'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e2d40'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              <Edit3 size={13} />
              Edit
            </button>
          </div>
        )}

        {/* Keyboard hints */}
        {!isMobile && (
          <div style={{ marginTop: 12, display: 'flex', gap: 14 }}>
            {[['↵', 'Create'], ['⇧↵', 'Edit in modal'], ['Esc', 'Close']].map(([key, label]) => (
              <span key={key} style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd
                  style={{
                    background: '#0a0e1a', border: '1px solid #1e2d40',
                    borderRadius: 4, padding: '1px 5px',
                    fontFamily: 'monospace', fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal overlay */}
      {showEditModal && parsed && (
        <EventModal
          defaultDate={parsed.date}
          defaultStartTime={parsed.startTime}
          onSave={(data) => {
            addEvent(data.date, data.title, data.category, data.notes, data.recurrence, data.startTime, data.endTime, data.reminder)
            setShowEditModal(false)
            handleClose()
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  )
}
