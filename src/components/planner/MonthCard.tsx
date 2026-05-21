/**
 * MonthCard
 * A full standalone month used in the Annual scroll-snap view.
 * Shows all days of the month with today-date highlight.
 */
import { format, getDaysInMonth, getDay, isToday } from 'date-fns'
import { Plus, Pencil } from 'lucide-react'
import type { PlannerEvent, EventCategoryDef } from '../../types'
import { DAY_ABBR, MONTH_NAMES, getCategoryStyle } from '../../types'
import { usePlanner } from '../../context/PlannerContext'

// ─── Event chip ───────────────────────────────────────────────────────────────

function EventChip({
  event,
  onEdit,
  categories,
}: {
  event: PlannerEvent
  onEdit: (e: PlannerEvent) => void
  categories: EventCategoryDef[]
}) {
  const style = getCategoryStyle(event.category, categories)
  return (
    <span
      className="inline-flex items-center gap-1 text-xs leading-tight cursor-pointer group rounded-sm"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderLeft: `2px solid ${style.color}`,
        color: '#cbd5e1',
        paddingLeft: '5px',
        paddingRight: '4px',
        paddingTop: '1px',
        paddingBottom: '1px',
      }}
      onClick={(ev) => { ev.stopPropagation(); onEdit(event) }}
      title={event.notes || event.title}
    >
      <span className="truncate min-w-0">
        {event.startTime && <span className="opacity-50 text-[10px] mr-0.5">{event.startTime}</span>}
        {event.title}
      </span>
      <Pencil size={8} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MonthCardProps {
  year: number
  month: number // 1-based
  onAddEvent: (date: string) => void
  onEditEvent: (event: PlannerEvent) => void
}

export function MonthCard({ year, month, onAddEvent, onEditEvent }: MonthCardProps) {
  const { store, getEventsForDate } = usePlanner()
  const { categories } = store
  const theme =
    store.monthMeta.find((m) => m.month === month && m.year === year)?.theme ?? ''

  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))

  const rows = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1
    const date = new Date(year, month - 1, dayNum)
    const dow = getDay(date)
    const dateStr = format(date, 'yyyy-MM-dd')
    const events = getEventsForDate(dateStr)
    return { dayNum, dow, dateStr, events, today: isToday(date) }
  })

  return (
    <div
      className="rounded-xl overflow-hidden w-full"
      style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
    >
      {/* Month header */}
      <div
        className="text-center font-black tracking-widest uppercase py-2 text-sm"
        style={{ color: '#d4af37', borderBottom: '2px solid #d4af37' }}
      >
        {MONTH_NAMES[month - 1]}
        {theme && (
          <div className="text-xs font-bold mt-0.5 tracking-widest" style={{ color: '#fde047' }}>
            {theme}
          </div>
        )}
      </div>

      {/* Day rows */}
      {rows.map(({ dayNum, dow, dateStr, events, today }) => {
        const sunday = dow === 0
        return (
          <div
            key={dayNum}
            className={`flex border-b border-white/5 hover:bg-white/5 group transition-colors ${
              sunday ? 'bg-red-950/20' : ''
            } ${today ? 'bg-yellow-400/5' : ''}`}
            style={today ? { borderLeft: '2px solid #d4af37' } : {}}
          >
            {/* Day abbreviation */}
            <div
              className={`w-8 md:w-10 shrink-0 flex items-center justify-center text-xs font-bold uppercase py-0.5 compact-tap ${
                sunday ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {DAY_ABBR[dow]}
            </div>

            {/* Date number — circle on today */}
            <div className="w-6 shrink-0 flex items-center justify-center py-0.5 compact-tap">
              <span
                className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                  today
                    ? 'font-black text-black'
                    : sunday
                    ? 'text-red-400'
                    : 'text-slate-300'
                }`}
                style={today ? { background: '#d4af37' } : {}}
              >
                {dayNum}
              </span>
            </div>

            {/* Events */}
            <div className="flex-1 flex flex-wrap items-center gap-0.5 py-0.5 px-1 min-w-0 overflow-hidden">
              {events.map((ev) => (
                <EventChip key={ev.id} event={ev} onEdit={onEditEvent} categories={categories} />
              ))}
            </div>

            {/* Add button */}
            <button
              className="compact-tap shrink-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity"
              onClick={() => onAddEvent(dateStr)}
              title="Add event"
            >
              <Plus size={11} style={{ color: '#d4af37' }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
