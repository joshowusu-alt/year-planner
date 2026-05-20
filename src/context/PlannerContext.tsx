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
  loadStoreFromSupabaseWithMeta,
  saveStoreToSupabaseChecked,
  createEvent,
  bulkCreateEvents,
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

export type PlannerSyncMode = 'local' | 'syncing' | 'synced' | 'conflict' | 'error'

interface PlannerContextValue {
  store: PlannerStore
  addEvent: (date: string, title: string, category: EventCategory, notes?: string, recurrence?: RecurrenceRule, startTime?: string, endTime?: string, reminder?: number | null, timezone?: string) => void
  bulkAddEvents: (events: Array<Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'>>) => void
  recategorizePrelateEvents: () => number
  editEvent: (id: string, patch: Partial<PlannerEvent>) => void
  removeEvent: (id: string) => void
  editEventInstance: (baseId: string, dateStr: string, patch: { title?: string; category?: string; notes?: string; startTime?: string; endTime?: string }) => void
  removeEventOccurrence: (baseId: string, dateStr: string) => void
  getEventsForDate: (dateStr: string) => PlannerEvent[]
  setMonthTheme: (month: number, year: number, theme: string) => void
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'milestones'>) => void
  editGoal: (id: string, patch: Partial<Goal>) => void
  removeGoal: (id: string) => void
  addMilestoneToGoal: (goalId: string, milestone: Omit<Milestone, 'id' | 'goalId' | 'createdAt'>) => void
  editMilestone: (goalId: string, milestoneId: string, patch: Partial<Milestone>) => void
  removeMilestone: (goalId: string, milestoneId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  editTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  toggleTask: (id: string) => void
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  editNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  updateSettings: (patch: Partial<Pick<PlannerStore, 'organizationName' | 'plannerTitle' | 'accentColor' | 'logoUrl'>>) => void
  addCategory: (cat: Omit<EventCategoryDef, 'id'>) => void
  updateCategory: (id: string, patch: Partial<EventCategoryDef>) => void
  removeCategory: (id: string) => void
  resetCategories: () => void
  addVitalFew: (item: Omit<VitalFew, 'id' | 'createdAt' | 'updatedAt'>) => void
  editVitalFew: (id: string, patch: Partial<VitalFew>) => void
  removeVitalFew: (id: string) => void
  addWeeklyReview: (item: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>) => void
  editWeeklyReview: (id: string, patch: Partial<WeeklyReview>) => void
  currentYear: number
  setCurrentYear: (y: number) => void
  currentMonth: number
  setCurrentMonth: (m: number) => void
  currentWeekStart: string
  setCurrentWeekStart: (d: string) => void
  lastSyncedAt: string | null
  syncError: string | null
  syncMode: PlannerSyncMode
  isSyncing: boolean
  forceSync: () => void
  conflictWarning: boolean
  dismissConflict: () => void
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const syncUserId = user?.id && user.id !== 'local-guest' ? user.id : null
  const [store, setStore] = useState<PlannerStore>(loadStore)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncMode, setSyncMode] = useState<PlannerSyncMode>('local')
  const [conflictWarning, setConflictWarning] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  })

  const isLoadedRef = useRef(!isSupabaseConfigured || !syncUserId)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedAtRef = useRef<string | null>(null)
  const conflictPauseRef = useRef(false)
  const storeRef = useRef(store)
  const userIdRef = useRef(syncUserId)

  useEffect(() => { storeRef.current = store }, [store])
  useEffect(() => { userIdRef.current = syncUserId }, [syncUserId])

  const dismissConflict = useCallback(() => {
    setConflictWarning(false)
  }, [])

  const forceSync = useCallback(() => {
    if (!syncUserId || !isSupabaseConfigured || isSyncing) return
    setConflictWarning(false)
    conflictPauseRef.current = false
    setIsSyncing(true)
    setSyncError(null)
    setSyncMode('syncing')
    loadStoreFromSupabaseWithMeta(syncUserId)
      .then((remote) => {
        if (remote) {
          setStore(remote.store)
          saveStore(remote.store)
          lastSyncedAtRef.current = remote.updatedAt
          setLastSyncedAt(remote.updatedAt)
        }
        setSyncError(null)
        setSyncMode('synced')
        setIsSyncing(false)
      })
      .catch(() => {
        setSyncError('Could not load latest planner data.')
        setSyncMode('error')
        setIsSyncing(false)
      })
  }, [syncUserId, isSyncing])

  useEffect(() => {
    const flush = () => {
      if (!userIdRef.current || !isSupabaseConfigured || !isLoadedRef.current) return
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      void saveStoreToSupabaseChecked(userIdRef.current, storeRef.current, lastSyncedAtRef.current).then((result) => {
        if (result.ok) {
          const syncedAt = new Date().toISOString()
          lastSyncedAtRef.current = syncedAt
          setLastSyncedAt(syncedAt)
          setSyncError(null)
          setSyncMode('synced')
        }
      })
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    if (!syncUserId || !isSupabaseConfigured) {
      isLoadedRef.current = true
      lastSyncedAtRef.current = null
      conflictPauseRef.current = false
      setConflictWarning(false)
      setLastSyncedAt(null)
      setSyncError(null)
      setSyncMode('local')
      setIsSyncing(false)
      return
    }

    conflictPauseRef.current = false
    isLoadedRef.current = false
    setConflictWarning(false)
    setSyncError(null)
    setSyncMode('syncing')
    setIsSyncing(true)
    loadStoreFromSupabaseWithMeta(syncUserId)
      .then((remote) => {
        if (remote) {
          setStore(remote.store)
          saveStore(remote.store)
          lastSyncedAtRef.current = remote.updatedAt
          setLastSyncedAt(remote.updatedAt)
        } else {
          lastSyncedAtRef.current = null
          setLastSyncedAt(null)
        }
        isLoadedRef.current = true
        setSyncError(null)
        setSyncMode('synced')
        setIsSyncing(false)
      })
      .catch(() => {
        lastSyncedAtRef.current = null
        setLastSyncedAt(null)
        isLoadedRef.current = true
        setSyncError('Could not load planner data from Supabase.')
        setSyncMode('error')
        setIsSyncing(false)
      })
  }, [syncUserId])

  useEffect(() => {
    saveStore(store)
    if (!isLoadedRef.current || !syncUserId || !isSupabaseConfigured) return
    if (conflictPauseRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSyncError(null)
    setSyncMode('syncing')
    setIsSyncing(true)
    saveTimerRef.current = setTimeout(() => {
      void saveStoreToSupabaseChecked(syncUserId, store, lastSyncedAtRef.current).then((result) => {
        saveTimerRef.current = null
        if (result.ok) {
          const syncedAt = new Date().toISOString()
          lastSyncedAtRef.current = syncedAt
          setLastSyncedAt(syncedAt)
          setSyncError(null)
          setSyncMode('synced')
          setIsSyncing(false)
          return
        }
        if (result.conflict) {
          conflictPauseRef.current = true
          setConflictWarning(true)
          setSyncError(null)
          setSyncMode('conflict')
          setIsSyncing(false)
          return
        }
        if (result.error) {
          console.error('Planner sync save failed:', result.error)
          setSyncError(result.error)
          setSyncMode('error')
          setIsSyncing(false)
        }
      })
    }, 1500)
  }, [store, syncUserId])

  const addEvent = useCallback((date: string, title: string, category: EventCategory, notes?: string, recurrence?: RecurrenceRule, startTime?: string, endTime?: string, reminder?: number | null, timezone?: string) => {
    setStore((s) => createEvent(s, { date, title, category, notes, recurrence, startTime, endTime, reminder, timezone }))
  }, [])

  const bulkAddEvents = useCallback((events: Array<Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setStore((s) => bulkCreateEvents(s, events))
  }, [])

  const recategorizePrelateEvents = useCallback((): number => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const pickCategoryId = (categories: EventCategoryDef[], label: string) =>
      categories.find((category) => normalize(category.label) === normalize(label))?.id

    const categoryForTitle = (title: string): string => {
      const text = title.toLowerCase()
      if (/\bph\b|public h|public holiday|good friday|easter|founders|republic day|farmers|christmas|boxing day/.test(text)) {
        return 'PH- PUBLIC HOLIDAY'
      }
      if (/\bbsg\b|bible society/.test(text)) return 'BIBLE SOCIETY GHANA-BSG'
      if (/sons|others/.test(text)) return 'SONS & OTHERS'
      return 'PEREZ DOME PROGRAMS'
    }

    const categoryIds = new Map(
      [
        'PEREZ DOME PROGRAMS',
        'SONS & OTHERS',
        'BIBLE SOCIETY GHANA-BSG',
        'PH- PUBLIC HOLIDAY',
      ].map((label) => [label, pickCategoryId(store.categories, label)]),
    )

    let updatedCount = 0
    const updatedEvents = store.events.map((event) => {
      if (!event.notes?.includes('Source: PRELATE 2026 Planner')) return event

      const targetLabel = categoryForTitle(event.title)
      const categoryId = categoryIds.get(targetLabel)
      if (!categoryId || event.category === categoryId) return event

      updatedCount++
      return {
        ...event,
        category: categoryId,
        updatedAt: new Date().toISOString(),
      }
    })

    if (updatedCount > 0) {
      setStore((s) => ({ ...s, events: updatedEvents }))
    }

    return updatedCount
  }, [store.categories, store.events])

  const editEvent = useCallback((id: string, patch: Partial<PlannerEvent>) => {
    setStore((s) => updateEvent(s, getBaseEventId(id), patch))
  }, [])

  const removeEvent = useCallback((id: string) => {
    setStore((s) => deleteEvent(s, getBaseEventId(id)))
  }, [])

  const editEventInstance = useCallback((
    baseId: string,
    dateStr: string,
    patch: { title?: string; category?: string; notes?: string; startTime?: string; endTime?: string }
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
        if (!ev.recurrence?.type || ev.recurrence.type === 'none') return ev
        const override = ev.instanceOverrides?.[dateStr]
        return { ...ev, ...(override ?? {}), id: `${ev.id}__${dateStr}`, date: dateStr }
      })
  }, [store.events])

  const setMonthTheme = useCallback((month: number, year: number, theme: string) => {
    setStore((s) => updateMonthMeta(s, month, year, { theme }))
  }, [])

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'milestones'>) => {
    const goalWithOwner = user?.id ? { ...goal, userId: user.id } : goal
    setStore((s) => createGoal(s, goalWithOwner))
  }, [user])

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

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const taskWithOwner = user?.id ? { ...task, userId: user.id } : task
    setStore((s) => createTask(s, taskWithOwner))
  }, [user])

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

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createNote(s, note))
  }, [])

  const editNote = useCallback((id: string, patch: Partial<Note>) => {
    setStore((s) => updateNote(s, id, patch))
  }, [])

  const removeNote = useCallback((id: string) => {
    setStore((s) => deleteNote(s, id))
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<Pick<PlannerStore, 'organizationName' | 'plannerTitle' | 'accentColor' | 'logoUrl'>>) => {
      setStore((s) => ({ ...s, ...patch }))
    },
    []
  )

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

  const addVitalFew = useCallback((item: Omit<VitalFew, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createVitalFew(s, item))
  }, [])

  const editVitalFew = useCallback((id: string, patch: Partial<VitalFew>) => {
    setStore((s) => updateVitalFew(s, id, patch))
  }, [])

  const removeVitalFew = useCallback((id: string) => {
    setStore((s) => deleteVitalFew(s, id))
  }, [])

  const addWeeklyReview = useCallback((item: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    setStore((s) => createWeeklyReview(s, item))
  }, [])

  const editWeeklyReview = useCallback((id: string, patch: Partial<WeeklyReview>) => {
    setStore((s) => updateWeeklyReview(s, id, patch))
  }, [])

  return (
    <PlannerContext.Provider value={{
      store,
      addEvent, bulkAddEvents, recategorizePrelateEvents, editEvent, removeEvent, editEventInstance, removeEventOccurrence, getEventsForDate, setMonthTheme,
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
      lastSyncedAt,
      syncError,
      syncMode,
      isSyncing,
      forceSync,
      conflictWarning,
      dismissConflict,
    }}>
      {children}
    </PlannerContext.Provider>
  )
}

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used inside PlannerProvider')
  return ctx
}
