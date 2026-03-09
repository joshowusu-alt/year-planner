import { useState, useEffect } from 'react'
import { X, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { fetchSharedPlannerData } from '../lib/sharing'
import type { PlannerStore, PlannerEvent, EventCategoryDef } from '../types'

interface Props {
  token: string
  onClose: () => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getCategoryColor(
  categoryId: string,
  categories: EventCategoryDef[],
): string {
  const cat = categories.find((c) => c.id === categoryId)
  return cat?.color ?? '#94a3b8'
}

function getEventsForMonth(
  events: PlannerEvent[],
  year: number,
  month: number,
): PlannerEvent[] {
  const mm = String(month).padStart(2, '0')
  const prefix = `${year}-${mm}`
  return events.filter((ev) => ev.date.startsWith(prefix))
}

interface MonthCardProps {
  year: number
  month: number
  events: PlannerEvent[]
  categories: EventCategoryDef[]
}

function ReadOnlyMonthCard({ year, month, events, categories }: MonthCardProps) {
  const monthEvents = getEventsForMonth(events, year, month)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
    >
      <h4
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: '#d4af37' }}
      >
        {MONTH_NAMES[month - 1]}
      </h4>
      {monthEvents.length === 0 ? (
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          No events
        </p>
      ) : (
        <ul className="space-y-1">
          {monthEvents.slice(0, 8).map((ev) => (
            <li key={ev.id} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: getCategoryColor(ev.category, categories) }}
              />
              <span
                className="text-xs truncate line-clamp-1"
                style={{ color: '#e2e8f0' }}
                title={ev.title}
              >
                <span className="font-mono text-slate-500 mr-1">
                  {ev.date.slice(8)}
                </span>
                {ev.title}
              </span>
            </li>
          ))}
          {monthEvents.length > 8 && (
            <li className="text-xs" style={{ color: '#94a3b8' }}>
              +{monthEvents.length - 8} more
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function SharedPlannerView({ token, onClose }: Props) {
  const [store, setStore] = useState<PlannerStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchSharedPlannerData(token).then((data) => {
      if (data) {
        setStore(data)
        // Try to detect the most relevant year from the data
        if (data.events.length > 0) {
          const firstYear = parseInt(data.events[0].date.slice(0, 4), 10)
          if (!isNaN(firstYear)) setYear(firstYear)
        }
      } else {
        setError(true)
      }
      setLoading(false)
    })
  }, [token])

  const plannerTitle = store?.plannerTitle
    ? `${store.plannerTitle} — Read Only`
    : store?.organizationName
    ? `${store.organizationName}'s Planner — Read Only`
    : 'Shared Planner — Read Only'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#0a0e1a' }}
    >
      {/* Top banner */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: '#1e2a3e', borderBottom: '1px solid #243447' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={16} style={{ color: '#d4af37' }} className="shrink-0" />
          <span
            className="text-sm font-bold truncate"
            style={{ color: '#d4af37' }}
          >
            📋 {plannerTitle}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors shrink-0 ml-3 min-w-11 min-h-11"
          style={{ color: '#e2e8f0', border: '1px solid #243447' }}
        >
          <X size={13} /> Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: '#d4af37' }} />
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Loading shared planner…
            </p>
          </div>
        ) : error || !store ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <p className="text-2xl">🔗</p>
            <p className="text-base font-bold" style={{ color: '#e2e8f0' }}>
              Share link not found
            </p>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              This link may have been revoked or is invalid.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37' }}
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                {store.organizationName && (
                  <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#94a3b8' }}>
                    {store.organizationName}
                  </p>
                )}
                <h2
                  className="text-xl font-black tracking-widest uppercase"
                  style={{ color: store.accentColor || '#d4af37' }}
                >
                  {store.plannerTitle || 'Planner'} {year}
                </h2>
              </div>

              {/* Year navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors min-w-11 min-h-11"
                  style={{ border: '1px solid #1e2d40', color: '#94a3b8' }}
                  aria-label="Previous year"
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  className="text-sm font-bold w-16 text-center"
                  style={{ color: '#e2e8f0' }}
                >
                  {year}
                </span>
                <button
                  onClick={() => setYear((y) => y + 1)}
                  className="flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors min-w-11 min-h-11"
                  style={{ border: '1px solid #1e2d40', color: '#94a3b8' }}
                  aria-label="Next year"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* 12-month grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <ReadOnlyMonthCard
                  key={month}
                  year={year}
                  month={month}
                  events={store.events}
                  categories={store.categories}
                />
              ))}
            </div>

            {/* Footer note */}
            <p
              className="text-xs text-center mt-8 pb-4"
              style={{ color: '#94a3b8' }}
            >
              This is a read-only view. Events cannot be edited from this link.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
