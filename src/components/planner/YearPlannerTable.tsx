/**
 * YearPlannerTable
 * Renders 3 months side-by-side in a table layout that closely
 * mirrors the PCI Bishop's Office Forward Planner PDF.
 */
import { useState } from 'react'
import { format, getDaysInMonth, getDay } from 'date-fns'
import { Plus, Pencil } from 'lucide-react'
import type { PlannerEvent, EventCategoryDef, RecurrenceRule } from '../../types'
import { DAY_ABBR, MONTH_NAMES, getCategoryStyle } from '../../types'
import { usePlanner } from '../../context/PlannerContext'
import { EventModal } from './EventModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dayAbbr(dayOfWeek: number) {
  return DAY_ABBR[dayOfWeek]
}

function isSunday(dayOfWeek: number) {
  return dayOfWeek === 0
}

// ─── Event cell content ────────────────────────────────────────────────────────

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
      className="inline-flex items-center gap-1 text-xs leading-tight cursor-pointer group rounded px-1"
      style={{ color: style.color, background: style.bgColor }}
      onClick={(ev) => { ev.stopPropagation(); onEdit(event) }}
      title={event.notes || event.title}
    >
      <span>{event.title}</span>
      <Pencil
        size={9}
        className="opacity-0 group-hover:opacity-70 transition-opacity shrink-0"
      />
    </span>
  )
}

// ─── Single month column ──────────────────────────────────────────────────────

interface MonthColumnProps {
  year: number
  month: number   // 1-based
  theme: string
  maxRows: number
  onAddEvent: (date: string) => void
  onEditEvent: (event: PlannerEvent) => void
}

function MonthColumn({
  year,
  month,
  theme,
  maxRows,
  onAddEvent,
  onEditEvent,
}: MonthColumnProps) {
  const { store, getEventsForDate } = usePlanner()
  const { categories } = store
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))

  // Build a slot lookup: dayOfMonth → {date, events}
  const eventsByDay: Record<number, PlannerEvent[]> = {}
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd')
    const dayEvents = getEventsForDate(dateStr)
    if (dayEvents.length > 0) eventsByDay[day] = dayEvents
  }

  // Build rows (one per calendar day slot, 1–maxRows)
  const rows = Array.from({ length: maxRows }, (_, i) => {
    const dayNum = i + 1
    if (dayNum > daysInMonth) return null
    const date = new Date(year, month - 1, dayNum)
    const dow = getDay(date)
    return { dayNum, dow, events: eventsByDay[dayNum] ?? [] }
  })

  return (
    <div className="flex-1 w-full min-w-0 overflow-x-hidden">
      {/* Month header */}
      <div
        className="text-center font-black tracking-widest uppercase py-2 text-xs md:text-sm"
        style={{ color: '#d4af37', borderBottom: '2px solid #d4af37' }}
      >
        {MONTH_NAMES[month - 1]}
        {theme && (
          <div
            className="text-xs font-bold mt-0.5 tracking-widest"
            style={{ color: '#fde047' }}
          >
            {theme}
          </div>
        )}
      </div>

      {/* Day rows */}
      {rows.map((row, idx) => {
        if (!row) {
          // empty padding row
          return (
            <div
              key={`empty-${idx}`}
              className="flex border-b border-white/5 min-h-7"
            />
          )
        }

        const { dayNum, dow, events } = row
        const sunday = isSunday(dow)
        const dateStr = format(new Date(year, month - 1, dayNum), 'yyyy-MM-dd')

        return (
          <div
            key={dayNum}
            className={`flex border-b border-white/5 min-h-6 md:min-h-7 hover:bg-white/5 group transition-colors ${
              sunday ? 'bg-red-950/20' : ''
            }`}
          >
            {/* Day abbreviation */}
            <div
              className={`w-7 md:w-10 shrink-0 flex items-center justify-center text-xs font-bold uppercase py-0.5 md:py-1 compact-tap ${
                sunday ? 'event-sunday' : 'text-slate-400'
              }`}
            >
              {dayAbbr(dow)}
            </div>

            {/* Date number */}
            <div
              className={`w-5 md:w-6 shrink-0 flex items-center justify-center text-xs font-semibold py-0.5 md:py-1 compact-tap ${
                sunday ? 'event-sunday' : 'text-slate-300'
              }`}
            >
              {dayNum}
            </div>

            {/* Events */}
            <div className="flex-1 flex flex-wrap items-center gap-0.5 md:gap-1 py-0.5 md:py-1 px-1 min-w-0 overflow-hidden">
              {events.map((ev) => (
                <EventChip key={ev.id} event={ev} onEdit={onEditEvent} categories={categories} />
              ))}
            </div>

            {/* Add button — compact-tap to prevent global 44px from bloating rows */}
            <button
              className="compact-tap shrink-0 w-5 md:w-6 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity"
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

// ─── Main table (3 months per row) ───────────────────────────────────────────

interface Props {
  year: number
  startMonth: number   // 1, 4, 7, or 10
}

export function YearPlannerTable({ year, startMonth }: Props) {
  const { store, addEvent, editEvent, removeEvent } = usePlanner()

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)

  const months = [startMonth, startMonth + 1, startMonth + 2]

  // Max days across the 3 months (for equal row count)
  const maxRows = Math.max(
    ...months.map((m) => getDaysInMonth(new Date(year, m - 1, 1)))
  )

  function getTheme(month: number) {
    return (
      store.monthMeta.find((m) => m.month === month && m.year === year)?.theme ?? ''
    )
  }

  function handleSave(data: {
    date: string
    title: string
    category: string
    notes?: string
    recurrence?: RecurrenceRule
  }) {
    if (editingEvent) {
      editEvent(editingEvent.id, data)
    } else {
      addEvent(data.date, data.title, data.category, data.notes, data.recurrence)
    }
  }

  function openAdd(date: string) {
    setEditingEvent(null)
    setModalDate(date)
  }

  function openEdit(event: PlannerEvent) {
    setEditingEvent(event)
    setModalDate(null)
  }

  function closeModal() {
    setEditingEvent(null)
    setModalDate(null)
  }

  return (
    <>
      {/* Quarter label */}
      <div
        className="text-xs font-bold uppercase tracking-widest mb-1 px-1"
        style={{ color: '#94a3b8' }}
      >
        Q{Math.ceil(startMonth / 3)} &mdash; {MONTH_NAMES[startMonth - 1]} to{' '}
        {MONTH_NAMES[startMonth + 1]}
      </div>

      {/* 3-month grid — stacks vertically on mobile, side-by-side on md+ */}
      <div
        className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x rounded-lg overflow-hidden w-full max-w-full"
        style={{
          border: '1px solid #1e2d40',
          background: '#0d1224',
        }}
      >
        {months.map((month) => (
          <MonthColumn
            key={month}
            year={year}
            month={month}
            theme={getTheme(month)}
            maxRows={maxRows}
            onAddEvent={openAdd}
            onEditEvent={openEdit}
          />
        ))}
      </div>

      {/* Modal */}
      {(modalDate !== null || editingEvent !== null) && (
        <EventModal
          event={editingEvent}
          defaultDate={modalDate ?? undefined}
          onSave={handleSave}
          onDelete={removeEvent}
          onClose={closeModal}
        />
      )}
    </>
  )
}
