import { useMemo } from 'react'
import { usePlanner } from '../../context/PlannerContext'
import { getCategoryStyle } from '../../types'
import type { EventCategoryDef, PlannerEvent } from '../../types'
import { addDays, format, parseISO } from 'date-fns'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(weekStart: string): string[] {
  const start = parseISO(weekStart)
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

interface CategoryCount {
  category: EventCategoryDef
  count: number
}

function getRecommendation(counts: CategoryCount[], total: number): string {
  if (total === 0) return 'No events scheduled this week — plan some focus blocks'

  const meetingEntry = counts.find((c) => c.category.id === 'meeting')
  const personalEntry = counts.find((c) => c.category.id === 'personal')

  const meetingPct = meetingEntry ? meetingEntry.count / total : 0
  const personalPct = personalEntry ? personalEntry.count / total : 0

  if (meetingPct > 0.5) return 'Consider protecting more focus blocks'
  if (personalPct < 0.1) return 'Consider scheduling personal growth time'
  return 'Good balance this week'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TimeAnalysis() {
  const { store, currentWeekStart } = usePlanner()

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart])

  const weekEvents: PlannerEvent[] = useMemo(
    () => store.events.filter((ev) => weekDates.includes(ev.date)),
    [store.events, weekDates],
  )

  const { counts, total, maxCount } = useMemo(() => {
    const map = new Map<string, number>()
    for (const ev of weekEvents) {
      map.set(ev.category, (map.get(ev.category) || 0) + 1)
    }

    const result: CategoryCount[] = store.categories.map((cat) => ({
      category: cat,
      count: map.get(cat.id) ?? 0,
    }))

    // Include any categories present in events but not in store.categories
    for (const [catId, count] of map.entries()) {
      if (!store.categories.find((c) => c.id === catId)) {
        result.push({
          category: { id: catId, label: catId, color: '#94a3b8', bgColor: 'rgba(100,116,139,0.1)' },
          count,
        })
      }
    }

    const t = weekEvents.length
    const mx = Math.max(...result.map((r) => r.count), 1)
    return { counts: result, total: t, maxCount: mx }
  }, [weekEvents, store.categories])

  const recommendation = useMemo(
    () => getRecommendation(counts, total),
    [counts, total],
  )

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: '#1e2d40', background: '#111827' }}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(212,175,55,0.15)' }}>
          <svg
            className="h-4 w-4"
            style={{ color: '#d4af37' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#e2e8f0]">
            Time Analysis
          </h2>
          <p className="text-xs text-[#64748b]">This Week</p>
        </div>
      </div>

      {/* Bar chart */}
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-[#64748b]">
          No events scheduled this week
        </p>
      ) : (
        <div className="space-y-3">
          {counts
            .filter((c) => c.count > 0)
            .sort((a, b) => b.count - a.count)
            .map(({ category, count }) => {
              const style = getCategoryStyle(category.id, store.categories)
              const pct = Math.max((count / maxCount) * 100, 8) // min 8% for visibility
              return (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#e2e8f0]">
                      {category.label}
                    </span>
                    <span className="tabular-nums text-[#94a3b8]">
                      {count} event{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: '#0a0e1a' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: style.color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: '#1e2d40' }}>
        <span className="text-xs font-medium text-[#94a3b8]">Total Events</span>
        <span className="text-sm font-semibold tabular-nums text-[#e2e8f0]">
          {total}
        </span>
      </div>

      {/* Recommendation */}
      <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)' }}>
        <div className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: '#d4af37' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: '#d4af37' }}>
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}
