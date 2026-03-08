/**
 * Local-storage data layer.
 * Supabase sync is layered on top when credentials are configured.
 */
import type { PlannerStore, MonthMeta, Goal, Task, Note, Milestone, EventCategoryDef, VitalFew, WeeklyReview } from '../types'
import { DEFAULT_CATEGORIES } from '../types'
import { format } from 'date-fns'
import { supabase, isSupabaseConfigured } from './supabase'

const SUPABASE_TABLE = 'planner_data'

const STORAGE_KEY = 'yearplanner_data'

// ─── Default month meta ───────────────────────────────────────────────────────

function defaultMonthMeta(): MonthMeta[] {
  const year = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    theme: '',
  }))
}

// ─── Default store ────────────────────────────────────────────────────────────

function defaultStore(): PlannerStore {
  return {
    events: [],
    monthMeta: defaultMonthMeta(),
    goals: [],
    tasks: [],
    notes: [],
    vitalFew: [],
    weeklyReviews: [],
    categories: DEFAULT_CATEGORIES,
    organizationName: '',
    plannerTitle: '',
    accentColor: '#d4af37',
  }
}

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function loadStore(): PlannerStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    return { ...defaultStore(), ...JSON.parse(raw) }
  } catch {
    return defaultStore()
  }
}

export function saveStore(store: PlannerStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

/**
 * Load a user's planner from Supabase.
 * Returns null if not found or Supabase is not configured.
 */
export async function loadStoreFromSupabase(userId: string): Promise<PlannerStore | null> {
  if (!supabase || !isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select('store')
    .eq('user_id', userId)
    .single()
  if (error || !data?.store) return null
  return { ...defaultStore(), ...(data.store as Partial<PlannerStore>) }
}

/**
 * Upsert a user's planner to Supabase.
 */
export async function saveStoreToSupabase(userId: string, store: PlannerStore): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return
  await supabase
    .from(SUPABASE_TABLE)
    .upsert(
      { user_id: userId, store, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
}

// ─── Event CRUD ───────────────────────────────────────────────────────────────

export function createEvent(
  store: PlannerStore,
  event: Omit<PlannerStore['events'][0], 'id' | 'createdAt' | 'updatedAt'>
): PlannerStore {
  const now = new Date().toISOString()
  return {
    ...store,
    events: [...store.events, { ...event, id: crypto.randomUUID(), createdAt: now, updatedAt: now }],
  }
}

export function updateEvent(
  store: PlannerStore,
  id: string,
  patch: Partial<PlannerStore['events'][0]>
): PlannerStore {
  return {
    ...store,
    events: store.events.map((e) =>
      e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
    ),
  }
}

export function deleteEvent(store: PlannerStore, id: string): PlannerStore {
  return { ...store, events: store.events.filter((e) => e.id !== id) }
}

/** Save overrides for a single occurrence of a recurring event. */
export function updateEventInstance(
  store: PlannerStore,
  baseId: string,
  dateStr: string,
  patch: { title?: string; category?: string; notes?: string }
): PlannerStore {
  return {
    ...store,
    events: store.events.map((e) =>
      e.id === baseId
        ? {
            ...e,
            instanceOverrides: {
              ...e.instanceOverrides,
              [dateStr]: { ...e.instanceOverrides?.[dateStr], ...patch },
            },
            updatedAt: new Date().toISOString(),
          }
        : e
    ),
  }
}

/** Suppress a single occurrence of a recurring event on a specific date. */
export function deleteEventOccurrence(
  store: PlannerStore,
  baseId: string,
  dateStr: string
): PlannerStore {
  return {
    ...store,
    events: store.events.map((e) =>
      e.id === baseId
        ? {
            ...e,
            deletedDates: [...(e.deletedDates ?? []), dateStr],
            updatedAt: new Date().toISOString(),
          }
        : e
    ),
  }
}

export function updateMonthMeta(
  store: PlannerStore,
  month: number,
  year: number,
  patch: Partial<MonthMeta>
): PlannerStore {
  return {
    ...store,
    monthMeta: store.monthMeta.map((m) =>
      m.month === month && m.year === year ? { ...m, ...patch } : m
    ),
  }
}

// ─── Goal CRUD ────────────────────────────────────────────────────────────────

export function createGoal(
  store: PlannerStore,
  goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'milestones'>
): PlannerStore {
  const now = new Date().toISOString()
  return {
    ...store,
    goals: [...store.goals, { ...goal, id: crypto.randomUUID(), milestones: [], createdAt: now, updatedAt: now }],
  }
}

export function updateGoal(store: PlannerStore, id: string, patch: Partial<Goal>): PlannerStore {
  return {
    ...store,
    goals: store.goals.map((g) =>
      g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g
    ),
  }
}

export function deleteGoal(store: PlannerStore, id: string): PlannerStore {
  return { ...store, goals: store.goals.filter((g) => g.id !== id) }
}

export function addMilestone(
  store: PlannerStore,
  goalId: string,
  milestone: Omit<Milestone, 'id' | 'goalId' | 'createdAt'>
): PlannerStore {
  const now = new Date().toISOString()
  const newMilestone: Milestone = { ...milestone, id: crypto.randomUUID(), goalId, createdAt: now }
  return {
    ...store,
    goals: store.goals.map((g) =>
      g.id === goalId ? { ...g, milestones: [...g.milestones, newMilestone] } : g
    ),
  }
}

export function updateMilestone(
  store: PlannerStore,
  goalId: string,
  milestoneId: string,
  patch: Partial<Milestone>
): PlannerStore {
  return {
    ...store,
    goals: store.goals.map((g) =>
      g.id === goalId
        ? { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, ...patch } : m)) }
        : g
    ),
  }
}

export function deleteMilestone(store: PlannerStore, goalId: string, milestoneId: string): PlannerStore {
  return {
    ...store,
    goals: store.goals.map((g) =>
      g.id === goalId ? { ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) } : g
    ),
  }
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export function createTask(
  store: PlannerStore,
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): PlannerStore {
  const now = new Date().toISOString()
  return {
    ...store,
    tasks: [...store.tasks, { ...task, id: crypto.randomUUID(), createdAt: now, updatedAt: now }],
  }
}

export function updateTask(store: PlannerStore, id: string, patch: Partial<Task>): PlannerStore {
  return {
    ...store,
    tasks: store.tasks.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
    ),
  }
}

export function deleteTask(store: PlannerStore, id: string): PlannerStore {
  return { ...store, tasks: store.tasks.filter((t) => t.id !== id) }
}

// ─── Note CRUD ────────────────────────────────────────────────────────────────

export function createNote(
  store: PlannerStore,
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
): PlannerStore {
  const now = new Date().toISOString()
  return {
    ...store,
    notes: [...store.notes, { ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now }],
  }
}

export function updateNote(store: PlannerStore, id: string, patch: Partial<Note>): PlannerStore {
  return {
    ...store,
    notes: store.notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
    ),
  }
}

export function deleteNote(store: PlannerStore, id: string): PlannerStore {
  return { ...store, notes: store.notes.filter((n) => n.id !== id) }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getEventsForDate(
  store: PlannerStore,
  date: Date
): PlannerStore['events'] {
  const key = format(date, 'yyyy-MM-dd')
  return store.events.filter((e) => e.date === key)
}

export function getTasksForPeriod(
  store: PlannerStore,
  periodRef: string,
  type: 'day' | 'week' | 'month'
): Task[] {
  if (type === 'day') return store.tasks.filter((t) => t.period === 'day' && t.date === periodRef)
  if (type === 'week') return store.tasks.filter((t) => t.period === 'week' && t.week === periodRef)
  const [year, month] = periodRef.split('-').map(Number)
  return store.tasks.filter((t) => t.period === 'month' && t.month === month && t.year === year)
}

export function getGoalsByQuarter(store: PlannerStore, quarter: 1 | 2 | 3 | 4, year: number): Goal[] {
  return store.goals.filter((g) => g.year === year && g.quarter === quarter)
}

export function getNotesByPeriod(store: PlannerStore, periodRef: string, type: Note['periodType']): Note[] {
  return store.notes.filter((n) => n.periodType === type && n.periodRef === periodRef)
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export function addCategory(store: PlannerStore, cat: Omit<EventCategoryDef, 'id'>): PlannerStore {
  const id = `cat_${Date.now()}`
  return { ...store, categories: [...store.categories, { id, ...cat }] }
}

export function updateCategory(store: PlannerStore, id: string, patch: Partial<EventCategoryDef>): PlannerStore {
  return {
    ...store,
    categories: store.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }
}

export function removeCategory(store: PlannerStore, id: string): PlannerStore {
  return { ...store, categories: store.categories.filter((c) => c.id !== id) }
}

/** Restore built-in defaults, preserving their original static IDs so existing events resolve correctly. */
export function resetCategories(store: PlannerStore): PlannerStore {
  return { ...store, categories: DEFAULT_CATEGORIES }
}

// ─── VitalFew CRUD ─────────────────────────────────────────────────────────────

export function createVitalFew(
  store: PlannerStore,
  item: Omit<VitalFew, 'id' | 'createdAt' | 'updatedAt'>
): PlannerStore {
  const now = new Date().toISOString()
  return {
    ...store,
    vitalFew: [...(store.vitalFew ?? []), { ...item, id: crypto.randomUUID(), createdAt: now, updatedAt: now }],
  }
}

export function updateVitalFew(store: PlannerStore, id: string, patch: Partial<VitalFew>): PlannerStore {
  return {
    ...store,
    vitalFew: (store.vitalFew ?? []).map((v) =>
      v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v
    ),
  }
}

export function deleteVitalFew(store: PlannerStore, id: string): PlannerStore {
  return { ...store, vitalFew: (store.vitalFew ?? []).filter((v) => v.id !== id) }
}

// ─── WeeklyReview CRUD ─────────────────────────────────────────────────────────

export function createWeeklyReview(
  store: PlannerStore,
  item: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>
): PlannerStore {
  const now = new Date().toISOString()
  return {
    ...store,
    weeklyReviews: [...(store.weeklyReviews ?? []), { ...item, id: crypto.randomUUID(), createdAt: now, updatedAt: now }],
  }
}

export function updateWeeklyReview(store: PlannerStore, id: string, patch: Partial<WeeklyReview>): PlannerStore {
  return {
    ...store,
    weeklyReviews: (store.weeklyReviews ?? []).map((r) =>
      r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
    ),
  }
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export function exportToCSV(store: PlannerStore): void {
  const rows = [
    ['Date', 'Day', 'Title', 'Category', 'Notes'],
    ...store.events.map((e) => {
      const d = new Date(e.date)
      return [
        e.date,
        d.toLocaleDateString('en-US', { weekday: 'long' }),
        e.title,
        e.category,
        e.notes ?? '',
      ]
    }),
  ]
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'planner-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}
