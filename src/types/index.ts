// ─── Event Categories ────────────────────────────────────────────────────────
// Categories are fully user-defined; stored in PlannerStore.categories.

export type EventCategory = string   // dynamic id matching EventCategoryDef.id

export interface EventCategoryDef {
  id: string
  label: string
  color: string    // hex – used for text and ring
  bgColor: string  // hex / rgba – used for fill background
}

export function getCategoryStyle(
  categoryId: string,
  categories: EventCategoryDef[],
): { color: string; bgColor: string } {
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return { color: '#94a3b8', bgColor: 'rgba(100,116,139,0.1)' }
  return { color: cat.color, bgColor: cat.bgColor }
}

export const DEFAULT_CATEGORIES: EventCategoryDef[] = [
  { id: 'meeting',  label: 'Meetings',       color: '#7eb8d4', bgColor: 'rgba(126,184,212,0.13)' },
  { id: 'personal', label: 'Personal',       color: '#5aaa8c', bgColor: 'rgba(90,170,140,0.12)'  },
  { id: 'holiday',  label: 'Public Holiday', color: '#c8956a', bgColor: 'rgba(200,149,106,0.13)' },
  { id: 'general',  label: 'General',        color: '#9b8ec4', bgColor: 'rgba(155,142,196,0.12)' },
]

// ─── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'annually'

export interface RecurrenceRule {
  type: RecurrenceType
  until?: string   // yyyy-MM-dd — if omitted the event repeats indefinitely
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none:      'Does not repeat',
  weekly:    'Every week',
  biweekly:  'Every 2 weeks',
  monthly:   'Every month',
  annually:  'Every year',
}

/**
 * Returns true if the event (base or recurring) should appear on dateStr.
 */
export function isRecurringOnDate(ev: PlannerEvent, dateStr: string): boolean {
  if (ev.deletedDates?.includes(dateStr)) return false
  if (!ev.recurrence || ev.recurrence.type === 'none') return ev.date === dateStr
  if (dateStr < ev.date) return false
  if (ev.recurrence.until && dateStr > ev.recurrence.until) return false
  const msPerDay = 86_400_000
  const base   = new Date(ev.date  + 'T00:00:00').getTime()
  const target = new Date(dateStr  + 'T00:00:00').getTime()
  const diffDays = Math.round((target - base) / msPerDay)
  switch (ev.recurrence.type) {
    case 'weekly':   return diffDays % 7  === 0
    case 'biweekly': return diffDays % 14 === 0
    case 'monthly': {
      const b = new Date(ev.date + 'T00:00:00')
      const t = new Date(dateStr  + 'T00:00:00')
      return t.getDate() === b.getDate()
    }
    case 'annually': {
      const b = new Date(ev.date + 'T00:00:00')
      const t = new Date(dateStr  + 'T00:00:00')
      return t.getDate() === b.getDate() && t.getMonth() === b.getMonth()
    }
    default: return ev.date === dateStr
  }
}

/**
 * Virtual occurrences have ids like "baseId__yyyy-MM-dd".
 * Returns the original stored event id.
 */
export function getBaseEventId(id: string): string {
  const i = id.indexOf('__')
  return i >= 0 ? id.substring(0, i) : id
}

// ─── Planner Event ───────────────────────────────────────────────────────────

export interface PlannerEvent {
  id: string
  userId?: string
  date: string        // ISO: "2026-01-15"
  title: string
  category: EventCategory
  notes?: string
  recurrence?: RecurrenceRule   // if absent or type === 'none', event is one-time
  /** Optional start/end times in HH:mm format, e.g. "09:00" */
  startTime?: string
  endTime?: string
  /** Minutes before event start to show a reminder; null = disabled */
  reminder?: number | null
  /** Optional IANA timezone name, e.g. "America/New_York". Defaults to local when absent. */
  timezone?: string
  /** Overrides for individual recurring occurrences, keyed by dateStr */
  instanceOverrides?: Record<string, { title?: string; category?: string; notes?: string; startTime?: string; endTime?: string }>
  /** Dates on which this recurring event is suppressed */
  deletedDates?: string[]
  createdAt: string
  updatedAt: string
}

// ─── Month Meta ──────────────────────────────────────────────────────────────

export interface MonthMeta {
  year: number
  month: number   // 1–12
  theme: string   // free-form label (optional – user-defined)
}

// ─── Goal ────────────────────────────────────────────────────────────────────

export type GoalStatus = 'not-started' | 'in-progress' | 'completed' | 'deferred'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

export interface Milestone {
  id: string
  goalId: string
  title: string
  dueDate?: string
  completed: boolean
  createdAt: string
}

export interface Goal {
  id: string
  userId?: string
  title: string
  description?: string
  quarter?: 1 | 2 | 3 | 4   // which quarter
  month?: number              // optional month pinning
  year: number
  progress: number            // 0–100
  status: GoalStatus
  priority: PriorityLevel
  milestones: Milestone[]
  color?: string
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskPeriod = 'day' | 'week' | 'month'

export interface Task {
  id: string
  userId?: string
  title: string
  description?: string
  date?: string               // ISO date (for day tasks)
  week?: string               // ISO week start date
  month?: number
  year: number
  period: TaskPeriod
  priority: PriorityLevel
  completed: boolean
  goalId?: string             // optional link to a goal
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export type NotePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface Note {
  id: string
  userId?: string
  title: string
  content: string             // rich text (HTML or markdown)
  periodType: NotePeriod
  periodRef: string           // e.g. "2026-01" for month, "2026-Q1" for quarter
  year: number
  pinned: boolean
  priority?: PriorityLevel
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
}

// ─── Strategic Planning ──────────────────────────────────────────────────────

export interface VitalFew {
  id: string
  title: string
  weekStart: string    // yyyy-MM-dd (Monday)
  year: number
  completed: boolean
  goalId?: string      // optional link to a Goal
  createdAt: string
  updatedAt: string
}

export interface WeeklyReview {
  id: string
  weekStart: string    // yyyy-MM-dd
  year: number
  answers: {
    movedForward: string
    wastedTime: string
    nextVitalFew: string
  }
  createdAt: string
  updatedAt: string
}

// ─── Planner Store ───────────────────────────────────────────────────────────

export interface PlannerStore {
  schemaVersion: number
  events: PlannerEvent[]
  monthMeta: MonthMeta[]
  goals: Goal[]
  tasks: Task[]
  notes: Note[]
  vitalFew: VitalFew[]
  weeklyReviews: WeeklyReview[]
  categories: EventCategoryDef[]   // user-defined event categories
  organizationName: string
  plannerTitle: string
  accentColor: string
  logoUrl?: string
  yearTheme?: string               // optional high-level year vision/theme
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: '#94a3b8',
  medium: '#60a5fa',
  high: '#f97316',
  critical: '#ef4444',
}

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
}

export const ORDINALS = [
  '', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th',
  '11th', '12th',
]

export const DAY_ABBR = ['SUN', 'MON', 'TUES', 'WED', 'THU', 'FRI', 'SAT']

export const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

