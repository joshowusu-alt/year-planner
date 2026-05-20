/**
 * Local-storage data layer.
 * Supabase sync is layered on top when credentials are configured.
 */
import type { PlannerStore, MonthMeta } from '../types/index.ts'
import { DEFAULT_CATEGORIES } from '../types/index.ts'
import { supabase, isSupabaseConfigured } from './supabase'
export {
  createEvent, bulkCreateEvents, updateEvent, deleteEvent, updateEventInstance, deleteEventOccurrence,
  updateMonthMeta,
  createGoal, updateGoal, deleteGoal, addMilestone, updateMilestone, deleteMilestone,
  createTask, updateTask, deleteTask,
  createNote, updateNote, deleteNote,
  getEventsForDate, getTasksForPeriod, getGoalsByQuarter, getNotesByPeriod,
  addCategory, updateCategory, removeCategory, resetCategories,
  createVitalFew, updateVitalFew, deleteVitalFew,
  createWeeklyReview, updateWeeklyReview,
} from './store-ops.ts'

const SUPABASE_TABLE = 'planner_data'
const STRUCTURED_SYNC_ENABLED = import.meta.env.VITE_USE_STRUCTURED_SYNC === 'true'
const LARGE_STORE_WARNING_BYTES = 500_000

const STRUCTURED_TABLES = {
  events: 'planner_events',
  tasks: 'planner_tasks',
  goals: 'planner_goals',
  notes: 'planner_notes',
  categories: 'planner_categories',
  monthMeta: 'planner_month_meta',
  vitalFew: 'planner_vital_few',
  weeklyReviews: 'planner_weekly_reviews',
} as const

const STRUCTURED_KEYS = Object.keys(STRUCTURED_TABLES) as Array<keyof typeof STRUCTURED_TABLES>

type StructuredSelectResult<T> = Promise<{ data: T[] | null; error: { message: string } | null }>

type StructuredTableClient = {
  select: (columns: string) => {
    eq: (column: string, value: string) => StructuredSelectResult<Record<string, unknown>>
  }
  upsert: (rows: Record<string, unknown>[], options: { onConflict: string }) => Promise<{ error: { message: string } | null }>
  update: (patch: Record<string, unknown>) => {
    eq: (column: string, value: string) => {
      in: (column: string, values: string[]) => Promise<{ error: { message: string } | null }>
    }
  }
}

type StructuredSupabaseClient = {
  from: (table: string) => StructuredTableClient
}

const STORAGE_KEY = 'yearplanner_data'

export interface SupabaseLoadResult {
  store: PlannerStore
  updatedAt: string | null
}

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
    schemaVersion: 1,
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

function normalizeStore(store?: Partial<PlannerStore> | null): PlannerStore {
  const normalized = { ...defaultStore(), ...(store ?? {}) }
  normalized.schemaVersion = typeof store?.schemaVersion === 'number' ? store.schemaVersion : 1
  return normalized
}

export function estimateStoreSizeBytes(store: PlannerStore): number {
  return new TextEncoder().encode(JSON.stringify(store)).length
}

function warnIfStoreLarge(store: PlannerStore) {
  const sizeBytes = estimateStoreSizeBytes(store)
  if (sizeBytes > LARGE_STORE_WARNING_BYTES) {
    console.warn(`Planner store is ${Math.round(sizeBytes / 1024)} KB. Consider enabling structured sync before it grows much further.`)
  }
}

function getStructuredRowId(key: keyof typeof STRUCTURED_TABLES, item: unknown): string {
  if (key === 'monthMeta') {
    const value = item as MonthMeta
    return `${value.year}-${String(value.month).padStart(2, '0')}`
  }

  return (item as { id: string }).id
}

function getStructuredUpdatedAt(item: unknown): string {
  const value = item as { updatedAt?: string; createdAt?: string }
  return value.updatedAt ?? value.createdAt ?? new Date().toISOString()
}

function getStructuredCreatedAt(item: unknown, fallbackIso: string): string {
  const value = item as { createdAt?: string }
  return value.createdAt ?? fallbackIso
}

async function loadStructuredStoreFromSupabase(userId: string, snapshotStore: PlannerStore | null): Promise<PlannerStore | null> {
  if (!supabase || !STRUCTURED_SYNC_ENABLED) return snapshotStore

  try {
    const structuredClient = supabase as unknown as StructuredSupabaseClient
    const rowsByKey = Object.fromEntries(
      await Promise.all(
        STRUCTURED_KEYS.map(async (key) => {
          const { data, error } = await structuredClient
            .from(STRUCTURED_TABLES[key])
            .select('payload, deleted_at')
            .eq('user_id', userId)

          if (error) throw new Error(error.message)
          return [key, (data ?? []) as Array<{ payload: unknown; deleted_at: string | null }>]
        }),
      ),
    ) as Record<keyof typeof STRUCTURED_TABLES, Array<{ payload: unknown; deleted_at: string | null }>>

    const hasStructuredData = Object.values(rowsByKey).some((rows) => rows.some((row) => !row.deleted_at))
    if (!hasStructuredData) return snapshotStore

    const base = normalizeStore(snapshotStore)
    base.events = rowsByKey.events.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['events'][number])
    base.tasks = rowsByKey.tasks.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['tasks'][number])
    base.goals = rowsByKey.goals.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['goals'][number])
    base.notes = rowsByKey.notes.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['notes'][number])
    base.categories = rowsByKey.categories.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['categories'][number])
    base.monthMeta = rowsByKey.monthMeta.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['monthMeta'][number])
    base.vitalFew = rowsByKey.vitalFew.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['vitalFew'][number])
    base.weeklyReviews = rowsByKey.weeklyReviews.filter((row) => !row.deleted_at).map((row) => row.payload as PlannerStore['weeklyReviews'][number])
    return base
  } catch (error) {
    console.warn('Structured sync load failed, falling back to planner_data snapshot.', error)
    return snapshotStore
  }
}

async function saveStructuredStoreToSupabase(userId: string, store: PlannerStore): Promise<void> {
  if (!supabase || !STRUCTURED_SYNC_ENABLED) return

  const now = new Date().toISOString()
  const structuredClient = supabase as unknown as StructuredSupabaseClient

  await Promise.all(
    STRUCTURED_KEYS.map(async (key) => {
      const tableName = STRUCTURED_TABLES[key]
      const items = (store[key] as unknown[]).map((item) => ({
        id: getStructuredRowId(key, item),
        user_id: userId,
        payload: item,
        created_at: getStructuredCreatedAt(item, now),
        updated_at: getStructuredUpdatedAt(item),
        deleted_at: null,
      }))

      const { data: existingRows, error: selectError } = await structuredClient
        .from(tableName)
        .select('id')
        .eq('user_id', userId)

      if (selectError) throw new Error(selectError.message)

      if (items.length > 0) {
        const { error: upsertError } = await structuredClient
          .from(tableName)
          .upsert(items, { onConflict: 'user_id,id' })

        if (upsertError) throw new Error(upsertError.message)
      }

      const activeIds = new Set(items.map((item) => item.id))
      const idsToSoftDelete = ((existingRows ?? []) as Array<{ id: string }>)
        .map((row) => row.id)
        .filter((id) => !activeIds.has(id))

      if (idsToSoftDelete.length > 0) {
        const { error: deleteError } = await structuredClient
          .from(tableName)
          .update({ deleted_at: now, updated_at: now })
          .eq('user_id', userId)
          .in('id', idsToSoftDelete)

        if (deleteError) throw new Error(deleteError.message)
      }
    }),
  )
}

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function loadStore(): PlannerStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStore()
    return normalizeStore(JSON.parse(raw) as Partial<PlannerStore>)
  } catch {
    return defaultStore()
  }
}

export function saveStore(store: PlannerStore): void {
  warnIfStoreLarge(store)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

/**
 * Load a user's planner from Supabase.
 * Returns null if not found or Supabase is not configured.
 */
export async function loadStoreFromSupabase(userId: string): Promise<PlannerStore | null> {
  const result = await loadStoreFromSupabaseWithMeta(userId)
  return result?.store ?? null
}

/**
 * Load a user's planner from Supabase, also returning the DB's updated_at timestamp.
 * Use this when you want to detect remote conflicts before saving.
 */
export async function loadStoreFromSupabaseWithMeta(userId: string): Promise<SupabaseLoadResult | null> {
  if (!supabase || !isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select('store, updated_at')
    .eq('user_id', userId)
    .single()

  const snapshotStore = !error && data?.store
    ? normalizeStore(data.store as Partial<PlannerStore>)
    : null

  const store = await loadStructuredStoreFromSupabase(userId, snapshotStore)
  if (!store) return null

  return {
    store,
    updatedAt: (data?.updated_at as string | undefined) ?? null,
  }
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
  try {
    await saveStructuredStoreToSupabase(userId, store)
  } catch (e) {
    console.warn('Structured sync write failed (blob save succeeded):', e)
  }
}

/**
 * Upsert a user's planner to Supabase, checking for remote conflicts first.
 * Returns { ok: true } on success, { ok: false, conflict: true } if remote was modified
 * after lastKnownUpdatedAt, { ok: false, error: string } on DB error.
 */
export async function saveStoreToSupabaseChecked(
  userId: string,
  store: PlannerStore,
  lastKnownUpdatedAt: string | null,
): Promise<{ ok: boolean; conflict?: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) return { ok: true }

  if (lastKnownUpdatedAt) {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('updated_at')
      .eq('user_id', userId)
      .single()

    if (!error && data?.updated_at) {
      const remoteTs = new Date(data.updated_at as string).getTime()
      const localTs  = new Date(lastKnownUpdatedAt).getTime()
      if (remoteTs > localTs + 5000) {
        return { ok: false, conflict: true }
      }
    }
  }

  const newUpdatedAt = new Date().toISOString()
  const { error } = await supabase
    .from(SUPABASE_TABLE)
    .upsert(
      { user_id: userId, store, updated_at: newUpdatedAt },
      { onConflict: 'user_id' }
    )

  if (error) return { ok: false, error: error.message }
  try {
    await saveStructuredStoreToSupabase(userId, store)
  } catch (e) {
    console.warn('Structured sync write failed (blob save succeeded):', e)
  }
  return { ok: true }
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export function exportToCSV(store: PlannerStore): void {
  const categoryLabels = new Map(store.categories.map((category) => [category.id, category.label]))
  const rows = [
    ['Date', 'Day', 'Title', 'Category', 'Start Time', 'End Time', 'Recurrence', 'Reminder', 'Notes'],
    ...store.events.map((e) => {
      const d = new Date(e.date)
      return [
        e.date,
        d.toLocaleDateString('en-US', { weekday: 'long' }),
        e.title,
        categoryLabels.get(e.category) ?? e.category,
        e.startTime ?? '',
        e.endTime ?? '',
        e.recurrence?.type && e.recurrence.type !== 'none' ? e.recurrence.type : '',
        e.reminder != null ? String(e.reminder) : '',
        e.notes ?? '',
      ]
    }),
  ]
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'planner-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}
