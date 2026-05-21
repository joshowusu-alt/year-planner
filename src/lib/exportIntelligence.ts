import { format, getDay, getDaysInMonth, startOfWeek } from 'date-fns'
import type { EventCategoryDef, Goal, PlannerEvent, PlannerStore } from '../types'
import { getCategoryStyle, isRecurringOnDate, MONTH_NAMES, MONTH_SHORT, RECURRENCE_LABELS } from '../types'

export type ExportMode = 'executive-report' | 'forward-planner'
export type ExportDensity = 'compact' | 'comfortable'
export type ExportColourMode = 'full' | 'economy'

export interface ExportOptions {
  includeGoals: boolean
  includeTasks: boolean
  includeNotes: boolean
  includeThemes: boolean
  includeLegend: boolean
  includeAppendix: boolean
  pageIds?: string[]
  density: ExportDensity
  colourMode: ExportColourMode
}

export interface ExportConfig {
  mode: ExportMode
  year: number
  months: number[]
  options: ExportOptions
}

export interface PrintEvent {
  event: PlannerEvent
  title: string
  shortTitle: string
  category: EventCategoryDef
  color: string
  bgColor: string
  timeLabel: string
  recurring: boolean
}

export interface DayPlan {
  date: Date
  dateStr: string
  day: number
  weekday: string
  weekend: boolean
  events: PrintEvent[]
  visibleEvents: PrintEvent[]
  overflow: number
}

export interface MonthSummary {
  month: number
  name: string
  shortName: string
  theme: string
  days: DayPlan[]
  eventCount: number
  topCategories: Array<{ category: EventCategoryDef; count: number }>
  highlights: PrintEvent[]
  busiestWeek: string
}

export interface QuarterSummary {
  quarter: 1 | 2 | 3 | 4
  months: MonthSummary[]
  eventCount: number
  topCategories: Array<{ category: EventCategoryDef; count: number }>
  highlights: PrintEvent[]
  heavyPeriods: string[]
}

export interface YearIntelligence {
  months: MonthSummary[]
  quarters: QuarterSummary[]
  goals: Goal[]
  goalsByQuarter: Record<1 | 2 | 3 | 4, Goal[]>
  vitalFewGoals: Goal[]
  categoryLegend: Array<{ category: EventCategoryDef; count: number; share: number }>
  totalEvents: number
  activeGoals: number
  themesSet: number
  busiestMonth: MonthSummary | null
  busiestQuarter: QuarterSummary | null
  recurringRhythms: Array<{ title: string; shortTitle: string; recurrence: string; count: number; category: EventCategoryDef }>
  majorHighlights: PrintEvent[]
  emptyPeriods: string[]
}

const FALLBACK_CATEGORY: EventCategoryDef = {
  id: 'uncategorised',
  label: 'Uncategorised',
  color: '#64748b',
  bgColor: 'rgba(100,116,139,0.12)',
}

const DAY3 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function categoryFor(id: string, categories: EventCategoryDef[]): EventCategoryDef {
  return categories.find((category) => category.id === id) ?? { ...FALLBACK_CATEGORY, id, label: id }
}

function monthTheme(store: PlannerStore, year: number, month: number): string {
  return store.monthMeta.find((meta) => meta.year === year && meta.month === month)?.theme?.trim() ?? ''
}

export function getEventsForDate(events: PlannerEvent[], dateStr: string): PlannerEvent[] {
  return events
    .filter((event) => {
      if (event.deletedDates?.includes(dateStr)) return false
      if (!event.recurrence || event.recurrence.type === 'none') return event.date === dateStr
      return isRecurringOnDate(event, dateStr)
    })
    .sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99') || a.title.localeCompare(b.title))
}

function abbreviateTitle(title: string): string {
  const cleaned = title.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 24) return cleaned
  const words = cleaned.split(' ')
  if (words.length > 2) {
    const abbreviated = words
      .map((word, index) => (index < 2 ? word : `${word.slice(0, 1)}.`))
      .join(' ')
    if (abbreviated.length <= 24) return abbreviated
  }
  return `${cleaned.slice(0, 21).trim()}...`
}

function formatTime(event: PlannerEvent): string {
  if (!event.startTime) return ''
  return event.endTime ? `${event.startTime}-${event.endTime}` : event.startTime
}

export function formatEventForPrint(event: PlannerEvent, dateStr: string, categories: EventCategoryDef[]): PrintEvent {
  const override = event.instanceOverrides?.[dateStr]
  const categoryId = override?.category ?? event.category
  const category = categoryFor(categoryId, categories)
  const style = getCategoryStyle(categoryId, categories)
  const title = override?.title?.trim() || event.title
  return {
    event,
    title,
    shortTitle: abbreviateTitle(title),
    category,
    color: style.color,
    bgColor: style.bgColor,
    timeLabel: formatTime({ ...event, ...override }),
    recurring: Boolean(event.recurrence && event.recurrence.type !== 'none'),
  }
}

function categoryCounts(events: PrintEvent[]): Array<{ category: EventCategoryDef; count: number }> {
  const byId = new Map<string, { category: EventCategoryDef; count: number }>()
  events.forEach((event) => {
    const existing = byId.get(event.category.id)
    if (existing) existing.count += 1
    else byId.set(event.category.id, { category: event.category, count: 1 })
  })
  return [...byId.values()].sort((a, b) => b.count - a.count || a.category.label.localeCompare(b.category.label))
}

function buildMonth(store: PlannerStore, year: number, month: number): MonthSummary {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))
  const days: DayPlan[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const date = new Date(year, month - 1, day)
    const dateStr = format(date, 'yyyy-MM-dd')
    const printEvents = getEventsForDate(store.events, dateStr).map((event) =>
      formatEventForPrint(event, dateStr, store.categories),
    )
    return {
      date,
      dateStr,
      day,
      weekday: DAY3[getDay(date)],
      weekend: [0, 6].includes(getDay(date)),
      events: printEvents,
      visibleEvents: printEvents.slice(0, 2),
      overflow: Math.max(0, printEvents.length - 2),
    }
  })
  const allEvents = days.flatMap((day) => day.events)
  const weekCounts = new Map<string, number>()
  days.forEach((day) => {
    const key = format(startOfWeek(day.date, { weekStartsOn: 1 }), 'd MMM')
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + day.events.length)
  })
  const busiestWeek = [...weekCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    month,
    name: MONTH_NAMES[month - 1],
    shortName: MONTH_SHORT[month - 1],
    theme: monthTheme(store, year, month),
    days,
    eventCount: allEvents.length,
    topCategories: categoryCounts(allEvents).slice(0, 3),
    highlights: allEvents.filter((event) => event.event.notes || event.category.id === 'holiday').slice(0, 5),
    busiestWeek: busiestWeek && busiestWeek[1] > 0 ? `Week of ${busiestWeek[0]} (${busiestWeek[1]} events)` : 'No busy week identified',
  }
}

function buildQuarter(quarter: 1 | 2 | 3 | 4, months: MonthSummary[]): QuarterSummary {
  const quarterMonths = months.filter((month) => Math.ceil(month.month / 3) === quarter)
  const events = quarterMonths.flatMap((month) => month.days.flatMap((day) => day.events))
  return {
    quarter,
    months: quarterMonths,
    eventCount: events.length,
    topCategories: categoryCounts(events).slice(0, 4),
    highlights: events.filter((event) => event.event.notes || event.category.id === 'holiday').slice(0, 6),
    heavyPeriods: quarterMonths
      .filter((month) => month.eventCount >= Math.max(8, Math.ceil(events.length / Math.max(1, quarterMonths.length))))
      .map((month) => `${month.shortName}: ${month.eventCount} events`),
  }
}

function recurringRhythms(store: PlannerStore, months: MonthSummary[]) {
  const occurrences = months.flatMap((month) => month.days.flatMap((day) => day.events.filter((event) => event.recurring)))
  const byId = new Map<string, { sample: PrintEvent; count: number }>()
  occurrences.forEach((event) => {
    const key = event.event.id
    const current = byId.get(key)
    if (current) current.count += 1
    else byId.set(key, { sample: event, count: 1 })
  })
  return [...byId.values()]
    .map(({ sample, count }) => ({
      title: sample.title,
      shortTitle: sample.shortTitle,
      recurrence: sample.event.recurrence ? RECURRENCE_LABELS[sample.event.recurrence.type] : 'Recurring',
      count,
      category: categoryFor(sample.event.category, store.categories),
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 8)
}

export function buildYearIntelligence(store: PlannerStore, year: number, selectedMonths: number[]): YearIntelligence {
  const months = selectedMonths.map((month) => buildMonth(store, year, month))
  const quarters = ([1, 2, 3, 4] as const)
    .map((quarter) => buildQuarter(quarter, months))
    .filter((quarter) => quarter.months.length > 0)
  const allEvents = months.flatMap((month) => month.days.flatMap((day) => day.events))
  const goals = store.goals.filter((goal) => goal.year === year)
  const goalsByQuarter = {
    1: goals.filter((goal) => goal.quarter === 1),
    2: goals.filter((goal) => goal.quarter === 2),
    3: goals.filter((goal) => goal.quarter === 3),
    4: goals.filter((goal) => goal.quarter === 4),
  } as Record<1 | 2 | 3 | 4, Goal[]>
  const legendCounts = categoryCounts(allEvents)
  const totalEvents = allEvents.length

  return {
    months,
    quarters,
    goals,
    goalsByQuarter,
    vitalFewGoals: goals
      .filter((goal) => goal.priority === 'critical' || goal.priority === 'high')
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 6),
    categoryLegend: legendCounts.map((entry) => ({
      ...entry,
      share: totalEvents > 0 ? Math.round((entry.count / totalEvents) * 100) : 0,
    })),
    totalEvents,
    activeGoals: goals.filter((goal) => goal.status !== 'completed' && goal.status !== 'deferred').length,
    themesSet: months.filter((month) => month.theme).length,
    busiestMonth: months.length ? [...months].sort((a, b) => b.eventCount - a.eventCount)[0] : null,
    busiestQuarter: quarters.length ? [...quarters].sort((a, b) => b.eventCount - a.eventCount)[0] : null,
    recurringRhythms: recurringRhythms(store, months),
    majorHighlights: allEvents.filter((event) => event.event.notes || event.category.id === 'holiday').slice(0, 10),
    emptyPeriods: months.filter((month) => month.eventCount === 0).map((month) => month.name),
  }
}

export function defaultExportOptions(): ExportOptions {
  return {
    includeGoals: true,
    includeTasks: false,
    includeNotes: false,
    includeThemes: true,
    includeLegend: true,
    includeAppendix: true,
    density: 'compact',
    colourMode: 'full',
  }
}
