import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import type {
  PlannerStore,
  PlannerEvent,
  EventCategory,
  EventCategoryDef,
  RecurrenceRule,
  Goal,
  Task,
  Note,
  Milestone,
  VitalFew,
  WeeklyReview,
} from '../types'
import { isRecurringOnDate, getBaseEventId } from '../types'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  loadStore,
  saveStore,
  loadStoreFromSupabase,
  saveStoreToSupabase,
  createEvent,
  updateEvent,
  deleteEvent,
  updateMonthMeta,
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  createTask,
  updateTask,
  deleteTask,
  createNote,
  updateNote,
  deleteNote,
  addCategory as storageAddCategory,
  updateCategory as storageUpdateCategory,
  removeCategory as storageRemoveCategory,
  resetCategories as storageResetCategories,
  createVitalFew,
  updateVitalFew,
  deleteVitalFew,
  createWeeklyReview,
  updateWeeklyReview,
  updateEventInstance,
  deleteEventOccurrence,
} from '../lib/storage'

// ─── Context type ─────────────────────────────────────────────────────────────

interface PlannerContextValue {
  store: PlannerStore
  // Events
  addEvent: (date: string, title: string, category: EventCategory, notes?: string, recurrence?: RecurrenceRule) => void
  editEvent: (id: string, patch: Partial<PlannerEvent>) => void
  removeEvent: (id: string) => void
  editEventInstance: (baseId: string, dateStr: string, patch: { title?: string; category?: string; notes?: string }) => void
  removeEventOccurrence: (baseId: string, dateStr: string) => void
  getEventsForDate: (dateStr: string) => PlannerEvent[]
  // Month themes
  setMonthTheme: (month: number, year: number, theme: string) => void
  // Goals
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'milestones'>) => void
  editGoal: (id: string, patch: Partial<Goal>) => void
  removeGoal: (id: string) => void
  addMilestoneToGoal: (goalId: string, milestone: Omit<Milestone, 'id' | 'goalId' | 'createdAt'>) => void
  editMilestone: (goalId: string, milestoneId: string, patch: Partial<Milestone>) => void
  removeMilestone: (goalId: string, milestoneId: string) => void
  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  editTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  toggleTask: (id: string) => void
  // Notes
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  editNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  // Settings
  updateSettings: (patch: Partial<Pick<PlannerStore, 'organizationName' | 'plannerTitle' | 'accentColor' | 'logoUrl'>>) => void
  // Categories
  addCategory: (cat: Omit<EventCategoryDef, 'id'>) => void
  updateCategory: (id: string, patch: Partial<EventCategoryDef>) => void
  removeCategory: (id: string) => void
  resetCategories: () => void
  // Vital Few
  addVitalFew: (item: Omit<VitalFew, 'id' | 'createdAt' | 'updatedAt'>) => void
  editVitalFew: (id: string, patch: Partial<VitalFew>) => void
  removeVitalFew: (id: string) => void
  // Weekly Reviews
  addWeeklyReview: (item: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>) => void
  editWeeklyReview: (id: string, patch: Partial<WeeklyReview>) => void
  // Navigation state
  currentYear: number
  setCurrentYear: (y: number) => void
  currentMonth: number
  setCurrentMonth: (m: number) => void
  currentWeekStart: string
  setCurrentWeekStart: (d: string) => void
  isSyncing: boolean
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [store, setStore] = useState<PlannerStore>(loadStore)
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Monday of current week
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  })

  // Tracks whether we've finished the initial Supabase load so we don't
  // write stale localStorage data back to the server before it arrives.
  const isLoadedRef = useRef(!isSupabaseConfigured || !user?.id)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs used in beforeunload to avoid stale closures
  const storeRef  = useRef(store)
  const userIdRef = useRef(user?.id)
  useEffect(() => { storeRef.current = store }, [store])
  useEffect(() => { userIdRef.current = user?.id }, [user?.id])

  // ── Flush to Supabase immediately on tab close (fix #2) ──
  useEffect(() => {
    const flush = () => {
      if (!userIdRef.current || !isSupabaseConfigured || !isLoadedRef.current) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      // Best-effort — modern browsers give async calls a short grace period
      saveStoreToSupabase(userIdRef.current, storeRef.current)
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  // ── Load from Supabase whenever the signed-in user changes ──
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      isLoadedRef.current = true
      return
    }
    isLoadedRef.current = false
    setIsSyncing(true)
    loadStoreFromSupabase(user.id)
      .then((remote) => {
        if (remote) {
          setStore(remote)
          saveStore(remote) // update local cache
        }
        isLoadedRef.current = true
        setIsSyncing(false)
      })
      .catch(() => {
        // Network error — fall through and use localStorage data
        isLoadedRef.current = true
        setIsSyncing(false)
      })
  }, [user?.id])

  // ── Persist on every store change ──
  useEffect(() => {
    saveStore(store) // always update localStorage cache
    if (!isLoadedRef.current || !user?.id || !isSupabaseConfigured) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveStoreToSupabase(user.id!, store)
    }, 1500)
  }, [store, user?.id])

  // ── Events ──
  const addEvent = useCallback((date: string, title: string, category: EventCategory, notes?: string, recurrence?: RecurrenceRule) => {
    setStore((s) => createEvent(s, { date, title, category, notes, recurrence }))
  }, [])

  const editEvent = useCallback((id: string, patch: Partial<PlannerEvent>) => {
    setStore((s) => updateEvent(s, getBaseEventId(id), patch))
  }, [])

  const removeEvent = useCallback((id: string) => {
    setStore((s) => deleteEvent(s, getBaseEventId(id)))
  }, [])

  const editEventInstance = useCallback((
    baseId: string,
    dateStr: string,
    patch: { title?: string; category?: string; notes?: string }
  ) => {
    setStore((s) => updateEventInstance(s, baseId, dateStr, patch))
  }, [])

  const removeEventOccurrence = useCallback((baseId: string, dateStr: string) => {
    setStore((s) => deleteEventOccurrence(s, baseId, dateStr))
  }, [])

  const getEventsForDate = useCallback((dateStr: string): PlannerEvent[] => {
    return store.events
      .filter((ev) => isRecurringOnDate(ev, dateStr))
      .map((ev) => {
        // Mark EVERY occurrence of a recurring event as virtual (including the
        // base date) so the scope toggle always shows when editing.
        if (!ev.recurrence?.type || ev.recurrence.type === 'none') return ev
        const override = ev.instanceOverrides?.[dateStr]
        return { ...ev, ...(override ?? {}), id: `${ev.id}__${dateStr}`, date: dateStr }
      })
  }, [store.events])

  const setMonthTheme = useCallback((month: number, year: number, theme: string) => {
    setStore((s) => updateMonthMeta(s, month, year, { theme }))
  }, [])

  // ── Goals ──
  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'milestones'>) => {
    setStore((s) => createGoal(s, goal))
  }, [])

  const editGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setStore((s) => updateGoal(s, id, patch))
  }, [])

  const removeGoal = useCallback((id: string) => {
    setStore((s) => deleteGoal(s, id))
  }, [])

  const addMilestoneToGoal = useCallback((goalId: string, milestone: Omit<Milestone, 'id' | 'goalId' | 'createdAt'>) => {
    setStore((s) => addMilestone(s, goalId, milestone))
  }, [])

  const editMilestone = useCallback((goalId: string, milestoneId: string, patch: Partial<Milestone>) => {
    setStore((s) => updateMilestone(s, goalId, milestoneId, patch))
  }, [])

  const removeMilestone = useCallback((goalId: string, milestoneId: string) => {
    setStore((s) => deleteMilestone(s, goalId, milestoneId))
  }, [])

  // ── Tasks ──
  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createTask(s, task))
  }, [])

  const editTask = useCallback((id: string, patch: Partial<Task>) => {
    setStore((s) => updateTask(s, id, patch))
  }, [])

  const removeTask = useCallback((id: string) => {
    setStore((s) => deleteTask(s, id))
  }, [])

  const toggleTask = useCallback((id: string) => {
    setStore((s) => {
      const task = s.tasks.find((t) => t.id === id)
      if (!task) return s
      return updateTask(s, id, { completed: !task.completed })
    })
  }, [])

  // ── Notes ──
  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createNote(s, note))
  }, [])

  const editNote = useCallback((id: string, patch: Partial<Note>) => {
    setStore((s) => updateNote(s, id, patch))
  }, [])

  const removeNote = useCallback((id: string) => {
    setStore((s) => deleteNote(s, id))
  }, [])

  // ── Settings ──
  const updateSettings = useCallback(
    (patch: Partial<Pick<PlannerStore, 'organizationName' | 'plannerTitle' | 'accentColor' | 'logoUrl'>>) => {
      setStore((s) => ({ ...s, ...patch }))
    }, [])

  // ── Categories ──
  const addCategory = useCallback((cat: Omit<EventCategoryDef, 'id'>) => {
    setStore((s) => storageAddCategory(s, cat))
  }, [])

  const updateCategory = useCallback((id: string, patch: Partial<EventCategoryDef>) => {
    setStore((s) => storageUpdateCategory(s, id, patch))
  }, [])

  const removeCategory = useCallback((id: string) => {
    setStore((s) => storageRemoveCategory(s, id))
  }, [])

  const resetCategories = useCallback(() => {
    setStore((s) => storageResetCategories(s))
  }, [])

  // ── Vital Few ──
  const addVitalFew = useCallback((item: Omit<VitalFew, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createVitalFew(s, item))
  }, [])

  const editVitalFew = useCallback((id: string, patch: Partial<VitalFew>) => {
    setStore((s) => updateVitalFew(s, id, patch))
  }, [])

  const removeVitalFew = useCallback((id: string) => {
    setStore((s) => deleteVitalFew(s, id))
  }, [])

  // ── Weekly Reviews ──
  const addWeeklyReview = useCallback((item: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createWeeklyReview(s, item))
  }, [])

  const editWeeklyReview = useCallback((id: string, patch: Partial<WeeklyReview>) => {
    setStore((s) => updateWeeklyReview(s, id, patch))
  }, [])

  return (
    <PlannerContext.Provider value={{
      store,
      addEvent, editEvent, removeEvent, editEventInstance, removeEventOccurrence, getEventsForDate, setMonthTheme,
      addGoal, editGoal, removeGoal,
      addMilestoneToGoal, editMilestone, removeMilestone,
      addTask, editTask, removeTask, toggleTask,
      addNote, editNote, removeNote,
      updateSettings,
      addCategory, updateCategory, removeCategory, resetCategories,
      addVitalFew, editVitalFew, removeVitalFew,
      addWeeklyReview, editWeeklyReview,
      currentYear, setCurrentYear,
      currentMonth, setCurrentMonth,
      currentWeekStart, setCurrentWeekStart,
      isSyncing,
    }}>
      {children}
    </PlannerContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used inside PlannerProvider')
  return ctx
}
