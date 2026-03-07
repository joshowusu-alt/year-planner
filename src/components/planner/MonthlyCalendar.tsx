/**
 * Monthly Calendar View
 * Full month grid with events, tasks, and notes dots per day
 */
import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { usePlanner } from '../../context/PlannerContext'
import type { PlannerEvent, RecurrenceRule } from '../../types'
import { MONTH_NAMES, getCategoryStyle } from '../../types'
import { EventModal } from '../planner/EventModal'

interface DayCellProps {
  date: Date
  isCurrentMonth: boolean
  events: PlannerEvent[]
  taskCount: number
  noteCount: number
  onAddEvent: (dateStr: string) => void
  onEditEvent: (e: PlannerEvent) => void
}

function DayCell({ date, isCurrentMonth, events, taskCount, noteCount, onAddEvent, onEditEvent }: DayCellProps) {
  const today = isToday(date)
  const sunday = date.getDay() === 0
  const { store } = usePlanner()

  return (
    <div
      className={`min-h-24 p-1.5 flex flex-col border-b border-r group cursor-pointer transition-colors hover:bg-white/5 ${
        !isCurrentMonth ? 'opacity-30' : ''
      }`}
      style={{ borderColor: '#1e2d40' }}
      onClick={() => onAddEvent(format(date, 'yyyy-MM-dd'))}
    >
      {/* Date number */}
      <div className="flex items-start justify-between mb-1">
        <span
          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
            today
              ? 'bg-yellow-400 text-black'
              : sunday
              ? 'text-red-400'
              : 'text-slate-400'
          }`}
        >
          {format(date, 'd')}
        </span>
        <button
          className="opacity-0 group-hover:opacity-60 hover:opacity-100!"
          onClick={(ev) => { ev.stopPropagation(); onAddEvent(format(date, 'yyyy-MM-dd')) }}
        >
          <Plus size={11} style={{ color: '#d4af37' }} />
        </button>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
        {events.slice(0, 3).map((ev) => {
          const catStyle = getCategoryStyle(ev.category, store.categories)
          return (
            <button
              key={ev.id}
              className="text-left text-xs px-1 py-0.5 rounded truncate leading-tight w-full"
              style={{ background: catStyle.bgColor, color: catStyle.color }}
              onClick={(e) => { e.stopPropagation(); onEditEvent(ev) }}
            >
              {ev.title}
            </button>
          )
        })}
        {events.length > 3 && (
          <span className="text-xs text-slate-500 px-1">+{events.length - 3} more</span>
        )}
      </div>

      {/* Dots for tasks/notes */}
      {(taskCount > 0 || noteCount > 0) && (
        <div className="flex gap-1 mt-auto pt-0.5">
          {taskCount > 0 && (
            <span className="text-xs text-blue-400 font-semibold">{taskCount}t</span>
          )}
          {noteCount > 0 && (
            <span className="text-xs text-purple-400 font-semibold">{noteCount}n</span>
          )}
        </div>
      )}
    </div>
  )
}

export function MonthlyCalendar() {
  const { store, addEvent, editEvent, removeEvent, getEventsForDate, currentYear, currentMonth, setCurrentMonth, setCurrentYear } = usePlanner()

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)

  const viewDate = new Date(currentYear, currentMonth - 1, 1)

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd   = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function navigate(dir: -1 | 1) {
    const newDate = dir === 1 ? addMonths(viewDate, 1) : subMonths(viewDate, 1)
    setCurrentMonth(newDate.getMonth() + 1)
    setCurrentYear(newDate.getFullYear())
  }

  function getEventsForDay(date: Date): PlannerEvent[] {
    const key = format(date, 'yyyy-MM-dd')
    return getEventsForDate(key)
  }

  function getTaskCount(date: Date): number {
    const key = format(date, 'yyyy-MM-dd')
    return store.tasks.filter((t) => t.date === key).length
  }

  function getNoteCount(date: Date): number {
    const key = format(date, 'yyyy-MM-dd')
    return store.notes.filter((n) => n.periodType === 'day' && n.periodRef === key).length
  }

  function handleSave(data: { date: string; title: string; category: string; notes?: string; recurrence?: RecurrenceRule }) {
    if (editingEvent) {
      editEvent(editingEvent.id, data)
    } else {
      addEvent(data.date, data.title, data.category, data.notes, data.recurrence)
    }
  }

  const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const theme = store.monthMeta.find((m) => m.month === currentMonth && m.year === currentYear)?.theme

  return (
    <div className="flex flex-col flex-1" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 no-print"
        style={{ borderBottom: '1px solid #1e2d40' }}
      >
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>

        <div>
          <h2 className="text-lg font-black tracking-widest uppercase" style={{ color: '#d4af37' }}>
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          {theme && (
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fde047' }}>
              {theme}
            </p>
          )}
        </div>

        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => { setEditingEvent(null); setModalDate(format(new Date(), 'yyyy-MM-dd')) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: '#d4af37', color: '#111827' }}
        >
          <Plus size={13} />
          Add Event
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7">
          {WEEKDAY_HEADERS.map((d) => (
            <div
              key={d}
              className={`text-center text-xs font-bold uppercase tracking-wider py-2 border-b ${d === 'Sun' ? 'text-red-400' : 'text-slate-500'}`}
              style={{ borderColor: '#1e2d40' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 border-l" style={{ borderColor: '#1e2d40' }}>
          {days.map((date) => (
            <DayCell
              key={date.toISOString()}
              date={date}
              isCurrentMonth={isSameMonth(date, viewDate)}
              events={getEventsForDay(date)}
              taskCount={getTaskCount(date)}
              noteCount={getNoteCount(date)}
              onAddEvent={(ds) => { setEditingEvent(null); setModalDate(ds) }}
              onEditEvent={(ev) => { setEditingEvent(ev); setModalDate(null) }}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      {(modalDate !== null || editingEvent !== null) && (
        <EventModal
          event={editingEvent}
          defaultDate={modalDate ?? undefined}
          onSave={handleSave}
          onDelete={removeEvent}
          onClose={() => { setModalDate(null); setEditingEvent(null) }}
        />
      )}
    </div>
  )
}
