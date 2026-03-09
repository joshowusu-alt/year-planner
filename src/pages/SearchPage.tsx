import { useState, useMemo } from 'react'
import { Search, CalendarDays, Target, CheckSquare, FileText, X } from 'lucide-react'
import { format, parseISO, isAfter, isBefore, isEqual } from 'date-fns'
import { usePlanner } from '../context/PlannerContext'
import { getCategoryStyle, GOAL_STATUS_LABELS } from '../types'
import type { GoalStatus } from '../types'
import type { Page } from '../components/layout/Sidebar'
import { useBreakpoint } from '../hooks/useMediaQuery'

interface Props {
  onNavigate: (p: Page) => void
}

type ResultTab = 'all' | 'events' | 'goals' | 'tasks' | 'notes'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function highlight(text: string, query: string) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: '#d4af3740', color: '#d4af37', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

const GOAL_STATUS_BADGE: Record<GoalStatus, { bg: string; color: string }> = {
  'not-started': { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
  'in-progress':  { bg: 'rgba(245,158,11,0.2)',  color: '#f59e0b' },
  'completed':    { bg: 'rgba(52,211,153,0.2)',   color: '#34d399' },
  'deferred':     { bg: 'rgba(239,68,68,0.2)',    color: '#ef4444' },
}

const PILL_ACTIVE: React.CSSProperties = {
  background: '#d4af37',
  color: '#0a0e1a',
  fontWeight: 600,
  borderRadius: '9999px',
  padding: '6px 16px',
  fontSize: '0.8rem',
  border: '1px solid #d4af37',
  cursor: 'pointer',
  minHeight: '36px',
  whiteSpace: 'nowrap',
}

const PILL_INACTIVE: React.CSSProperties = {
  background: 'transparent',
  color: '#94a3b8',
  fontWeight: 400,
  borderRadius: '9999px',
  padding: '6px 16px',
  fontSize: '0.8rem',
  border: '1px solid #1e2d40',
  cursor: 'pointer',
  minHeight: '36px',
  whiteSpace: 'nowrap',
}

const SCROLL_ROW: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '8px',
  overflowX: 'auto',
  paddingBottom: '4px',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  flexWrap: 'nowrap',
  alignItems: 'center',
}

const DATE_INPUT_STYLE: React.CSSProperties = {
  background: '#0d1224',
  border: '1px solid #1e2d40',
  color: '#e2e8f0',
  borderRadius: '8px',
  padding: '6px 10px',
  minHeight: '40px',
  fontSize: '0.875rem',
  colorScheme: 'dark',
}

const GOAL_STATUS_OPTIONS: Array<GoalStatus | 'all'> = [
  'all', 'not-started', 'in-progress', 'completed', 'deferred',
]
const GOAL_STATUS_TAB_LABELS: Record<GoalStatus | 'all', string> = {
  all: 'All',
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
}

export function SearchPage({ onNavigate }: Props) {
  const { store } = usePlanner()
  const { isMobile } = useBreakpoint()

  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ResultTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [goalStatus, setGoalStatus] = useState<GoalStatus | 'all'>('all')

  const q = query.trim().toLowerCase()

  // ── base text-search results ─────────────────────────────────────────────
  const baseResults = useMemo(() => {
    if (!q) return { events: [], goals: [], tasks: [], notes: [] }

    const events = store.events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q)),
    )
    const goals = store.goals.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)),
    )
    const tasks = store.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    )
    const notes = store.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q),
    )
    return { events, goals, tasks, notes }
  }, [q, store.events, store.goals, store.tasks, store.notes])

  // ── apply additional filters ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let events = baseResults.events
    let goals  = baseResults.goals
    let tasks  = baseResults.tasks
    let notes  = baseResults.notes

    // category filter (events only)
    if (categoryFilter) {
      events = events.filter((e) => e.category === categoryFilter)
    }

    // date range filter (events only)
    if (dateFrom || dateTo) {
      events = events.filter((e) => {
        const d = parseISO(e.date)
        if (dateFrom) {
          const from = parseISO(dateFrom)
          if (isBefore(d, from) && !isEqual(d, from)) return false
        }
        if (dateTo) {
          const to = parseISO(dateTo)
          if (isAfter(d, to) && !isEqual(d, to)) return false
        }
        return true
      })
    }

    // goal status filter
    if (goalStatus !== 'all') {
      goals = goals.filter((g) => g.status === goalStatus)
    }

    return { events, goals, tasks, notes }
  }, [baseResults, categoryFilter, dateFrom, dateTo, goalStatus])

  // ── visible results based on active tab ─────────────────────────────────
  const visible = useMemo(() => ({
    events: activeTab === 'all' || activeTab === 'events' ? filtered.events : [],
    goals:  activeTab === 'all' || activeTab === 'goals'  ? filtered.goals  : [],
    tasks:  activeTab === 'all' || activeTab === 'tasks'  ? filtered.tasks  : [],
    notes:  activeTab === 'all' || activeTab === 'notes'  ? filtered.notes  : [],
  }), [activeTab, filtered])

  const totalFiltered = visible.events.length + visible.goals.length + visible.tasks.length + visible.notes.length
  const totalBase     = baseResults.events.length + baseResults.goals.length + baseResults.tasks.length + baseResults.notes.length

  const showEventFilters = activeTab === 'all' || activeTab === 'events'
  const showGoalFilter   = activeTab === 'all' || activeTab === 'goals'

  const hasActiveFilter =
    categoryFilter !== null || dateFrom !== '' || dateTo !== '' || goalStatus !== 'all'

  function clearAllFilters() {
    setCategoryFilter(null)
    setDateFrom('')
    setDateTo('')
    setGoalStatus('all')
  }

  const TABS: Array<{ id: ResultTab; label: string }> = [
    { id: 'all',    label: 'All'    },
    { id: 'events', label: 'Events' },
    { id: 'goals',  label: 'Goals'  },
    { id: 'tasks',  label: 'Tasks'  },
    { id: 'notes',  label: 'Notes'  },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0e1a', minHeight: '100%' }}>
      {/* ── Sticky header: search + filters ─────────────────────────────── */}
      <div
        className="shrink-0 px-4 pt-4 pb-2"
        style={{ borderBottom: '1px solid #1e2d40', position: 'sticky', top: 0, zIndex: 10, background: '#0a0e1a' }}
      >
        <h1 className="text-lg font-black tracking-widest uppercase mb-3" style={{ color: '#d4af37' }}>
          Search
        </h1>

        {/* Search input */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, goals, tasks, notes…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:ring-2"
            style={{
              background: '#1e2d40',
              border: '1px solid #243447',
              color: '#e2e8f0',
              fontSize: 'max(16px, 0.875rem)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-slate-500 hover:text-slate-300 transition-colors" />
            </button>
          )}
        </div>

        {/* ── Type tabs ───────────────────────────────────────────────── */}
        <div style={SCROLL_ROW} className="mb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? PILL_ACTIVE : PILL_INACTIVE}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Event filters: categories + date range ───────────────────── */}
        {showEventFilters && (
          <>
            {/* Category pills */}
            <div style={{ ...SCROLL_ROW, marginBottom: '8px' }}>
              <button
                aria-pressed={categoryFilter === null}
                onClick={() => setCategoryFilter(null)}
                style={categoryFilter === null ? PILL_ACTIVE : PILL_INACTIVE}
              >
                All categories
              </button>
              {store.categories.map((cat) => {
                const catStyle = getCategoryStyle(cat.id, store.categories)
                const isActive = categoryFilter === cat.id
                return (
                  <button
                    key={cat.id}
                    aria-pressed={isActive}
                    onClick={() => setCategoryFilter(isActive ? null : cat.id)}
                    style={isActive ? PILL_ACTIVE : { ...PILL_INACTIVE, paddingLeft: '10px' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span
                        aria-label={cat.label}
                        title={cat.label}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isActive ? '#0a0e1a' : catStyle.color,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Date range */}
            <div
              className="mb-2"
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '8px',
                alignItems: isMobile ? 'stretch' : 'center',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ ...DATE_INPUT_STYLE, flex: 1, width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ ...DATE_INPUT_STYLE, flex: 1, width: '100%' }}
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    background: 'transparent',
                    border: '1px solid #1e2d40',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: '40px',
                  }}
                >
                  Clear dates
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Goal status filter ───────────────────────────────────────── */}
        {showGoalFilter && (
          <div style={{ ...SCROLL_ROW, marginBottom: '8px' }}>
            {GOAL_STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                aria-pressed={goalStatus === s}
                onClick={() => setGoalStatus(s)}
                style={goalStatus === s ? PILL_ACTIVE : PILL_INACTIVE}
              >
                {GOAL_STATUS_TAB_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        {/* ── Clear all filters ────────────────────────────────────────── */}
        {hasActiveFilter && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <button
              onClick={clearAllFilters}
              style={{
                color: '#94a3b8',
                fontSize: '0.8rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <X size={12} />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Empty query placeholder */}
        {!q && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-slate-700 mb-3" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Search events, goals, tasks, and notes...</p>
            <p className="text-slate-600 text-xs mt-1">Type a keyword to get started</p>
          </div>
        )}

        {/* Has query, no base results */}
        {q && totalBase === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-slate-700 mb-3" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No results found for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Has base results but filters reduce to 0 */}
        {q && totalBase > 0 && totalFiltered === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search size={28} className="text-slate-700 mb-3" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No results for the current filters.</p>
            <button
              onClick={clearAllFilters}
              style={{ color: '#d4af37', fontSize: '0.8rem', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '8px' }}
            >
              Try clearing filters
            </button>
          </div>
        )}

        {/* ── Events ────────────────────────────────────────────────────── */}
        {visible.events.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Events ({visible.events.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {visible.events.map((ev) => {
                const catStyle = getCategoryStyle(ev.category, store.categories)
                const catDef   = store.categories.find((c) => c.id === ev.category)
                const catName  = catDef?.label ?? ev.category
                let dateLabel: string
                try {
                  dateLabel = format(parseISO(ev.date), 'MMM d, yyyy')
                } catch {
                  dateLabel = ev.date
                }
                return (
                  <button
                    key={ev.id}
                    onClick={() => {
                      sessionStorage.setItem('pendingOpenEventId', ev.id)
                      onNavigate('planner')
                    }}
                    className="w-full text-left rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                    style={{
                      background: '#0d1224',
                      border: '1px solid #1e2d40',
                      padding: '12px 16px',
                      minHeight: '56px',
                    }}
                  >
                    <p className="text-sm font-semibold text-white">
                      {highlight(ev.title, query.trim())}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{dateLabel}</span>
                      {ev.startTime && (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>· {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}</span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          aria-label={catName}
                          title={catName}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: catStyle.color,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{catName}</span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Goals ─────────────────────────────────────────────────────── */}
        {visible.goals.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Goals ({visible.goals.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {visible.goals.map((g) => {
                const badge = GOAL_STATUS_BADGE[g.status]
                return (
                  <button
                    key={g.id}
                    onClick={() => onNavigate('goals')}
                    className="w-full text-left rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                    style={{
                      background: '#0d1224',
                      border: '1px solid #1e2d40',
                      padding: '12px 16px',
                      minHeight: '56px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <p className="text-sm font-semibold text-white">
                        {highlight(g.title, query.trim())}
                      </p>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          borderRadius: '9999px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {GOAL_STATUS_LABELS[g.status]}
                      </span>
                    </div>
                    {g.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {highlight(g.description.slice(0, 80), query.trim())}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">
                      {g.quarter ? `Q${g.quarter} ` : ''}{g.year}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        {visible.tasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tasks ({visible.tasks.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {visible.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onNavigate('tasks')}
                  className="w-full text-left rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                  style={{
                    background: '#0d1224',
                    border: '1px solid #1e2d40',
                    padding: '12px 16px',
                    minHeight: '56px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Display-only checkbox */}
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '4px',
                        border: '2px solid',
                        borderColor: t.completed ? '#34d399' : '#1e2d40',
                        background: t.completed ? 'rgba(52,211,153,0.2)' : 'transparent',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {t.completed && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: t.completed ? '#64748b' : '#e2e8f0', textDecoration: t.completed ? 'line-through' : 'none' }}
                    >
                      {highlight(t.title, query.trim())}
                    </p>
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" style={{ paddingLeft: '24px' }}>
                      {highlight(t.description.slice(0, 80), query.trim())}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5" style={{ paddingLeft: '24px' }}>{t.priority} · {t.period}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        {visible.notes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notes ({visible.notes.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {visible.notes.map((n) => {
                const plain = stripHtml(n.content)
                return (
                  <button
                    key={n.id}
                    onClick={() => onNavigate('notes')}
                    className="w-full text-left rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                    style={{
                      background: '#0d1224',
                      border: '1px solid #1e2d40',
                      padding: '12px 16px',
                      minHeight: '56px',
                    }}
                  >
                    <p className="text-sm font-semibold text-white">
                      {highlight(n.title, query.trim())}
                    </p>
                    {plain && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {plain.slice(0, 60)}{plain.length > 60 ? '…' : ''}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">{n.periodType} · {n.periodRef}</p>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
