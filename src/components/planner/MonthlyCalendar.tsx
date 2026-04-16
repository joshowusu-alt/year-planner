/**
 * Monthly Calendar View
 * Full month grid with events, tasks, and notes dots per day
 */
import { useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
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
import { MONTH_NAMES, getCategoryStyle, getBaseEventId } from '../../types'
import { EventModal } from '../planner/EventModal'
import { EventBottomSheet } from '../planner/EventBottomSheet'
import { useBreakpoint } from '../../hooks/useMediaQuery'
import { useUndo } from '../../context/UndoContext'

interface DayCellProps {
  date: Date
  isCurrentMonth: boolean
  events: PlannerEvent[]
  taskCount: number
  noteCount: number
  onAddEvent: (dateStr: string) => void
  onEditEvent: (e: PlannerEvent) => void
  isMobile: boolean
}

// ── Draggable event chip ───────────────────────────────────────────────────────

interface DraggableEventChipProps {
  event: PlannerEvent
  catStyle: { bgColor: string; color: string }
  dateStr: string
  onEdit: (ev: PlannerEvent) => void
}

function DraggableEventChip({ event, catStyle, dateStr, onEdit }: DraggableEventChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { type: 'event', dateStr },
  })
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={event.title}
      className="text-left text-xs px-1 py-0.5 rounded truncate leading-tight w-full cursor-grab active:cursor-grabbing"
      style={{
        background: catStyle.bgColor,
        color: catStyle.color,
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onEdit(event) }}
    >
      {event.title}
    </button>
  )
}

function DayCell({ date, isCurrentMonth, events, taskCount, noteCount, onAddEvent, onEditEvent, isMobile }: DayCellProps) {
  const today = isToday(date)
  const sunday = date.getDay() === 0
  const { store } = usePlanner()
  const dateStr = format(date, 'yyyy-MM-dd')
  const { isOver, setNodeRef } = useDroppable({ id: dateStr })
  const showHighlight = !isMobile && isOver

  return (
    <div
      ref={isMobile ? undefined : setNodeRef}
      className={`min-h-14 md:min-h-24 p-1 md:p-1.5 flex flex-col border-b border-r cursor-pointer transition-colors hover:bg-white/5 ${
        !isCurrentMonth ? 'opacity-30' : ''
      }`}
      style={{
        borderColor: showHighlight ? '#d4af37' : '#1e2d40',
        ...(today ? { background: 'rgba(212,175,55,0.05)', borderTop: '2px solid #d4af37' } : {}),
        ...(showHighlight ? { background: 'rgba(212,175,55,0.08)' } : {}),
      }}
      onClick={() => onAddEvent(dateStr)}
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
          aria-label="Add event"
          onClick={(ev) => { ev.stopPropagation(); onAddEvent(dateStr) }}
        >
          <Plus size={11} style={{ color: '#d4af37' }} />
        </button>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-px flex-1 overflow-hidden">
        {events.slice(0, isMobile ? 2 : 3).map((ev) => {
          const catStyle = getCategoryStyle(ev.category, store.categories)
          return isMobile ? (
            <button
              key={ev.id}
              className="text-left px-0.5 py-px rounded truncate leading-tight w-full"
              aria-label={ev.title}
              style={{ background: catStyle.bgColor, color: catStyle.color, fontSize: '0.6rem' }}
              onClick={(e) => { e.stopPropagation(); onEditEvent(ev) }}
            >
              {ev.title}
            </button>
          ) : (
            <DraggableEventChip
              key={ev.id}
              event={ev}
              catStyle={catStyle}
              dateStr={dateStr}
              onEdit={onEditEvent}
            />
          )
        })}
        {events.length > (isMobile ? 2 : 3) && (
          <span className="px-0.5 leading-tight" style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 600 }}>
            +{events.length - (isMobile ? 2 : 3)}
          </span>
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

  const { pushUndo } = useUndo()

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)
  const [bottomSheetDate, setBottomSheetDate] = useState<string | null>(null)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  function handleSave(data: { date: string; title: string; category: string; notes?: string; recurrence?: RecurrenceRule; startTime?: string; endTime?: string; reminder?: number | null }) {
    if (editingEvent) {
      editEvent(editingEvent.id, data)
    } else {
      addEvent(data.date, data.title, data.category, data.notes, data.recurrence, data.startTime, data.endTime, data.reminder)
    }
  }

  function handleDelete(id: string) {
    const baseId = getBaseEventId(id)
    const event = store.events.find((e) => e.id === baseId)
    removeEvent(id)
    if (event) {
      pushUndo({
        label: `"${event.title}" deleted`,
        undo: () => {
          addEvent(event.date, event.title, event.category, event.notes, event.recurrence, event.startTime, event.endTime, event.reminder)
        },
      })
    }
  }

  function handleDragStart(evt: DragStartEvent) {
    if (isMobile) return
    setActiveEventId(evt.active.id as string)
  }

  function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt
    setActiveEventId(null)
    if (!over || isMobile) return
    const sourceDateStr = (active.data.current as { type: string; dateStr: string } | undefined)?.dateStr
    const targetDateStr = over.id as string
    if (sourceDateStr !== targetDateStr) {
      editEvent(active.id as string, { date: targetDateStr })
      pushUndo({
        label: `Event moved to ${targetDateStr}`,
        undo: () => editEvent(active.id as string, { date: sourceDateStr! }),
      })
    }
  }

  const activeEvent = activeEventId ? store.events.find((e) => e.id === activeEventId) ?? null : null
  const activeCatStyle = activeEvent ? getCategoryStyle(activeEvent.category, store.categories) : null

  const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const theme = store.monthMeta.find((m) => m.month === currentMonth && m.year === currentYear)?.theme

  return (
    <div className="flex flex-col flex-1" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 no-print"
        style={{ borderBottom: '1px solid #1e2d40' }}
      >
        <button onClick={() => navigate(-1)} aria-label="Previous month" title="Previous month" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
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

        <button onClick={() => navigate(1)} aria-label="Next month" title="Next month" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
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
      <div className="flex-1 overflow-auto p-2 md:p-4">
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
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {days.map((date) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                isCurrentMonth={isSameMonth(date, viewDate)}
                events={getEventsForDay(date)}
                taskCount={getTaskCount(date)}
                noteCount={getNoteCount(date)}
                isMobile={isMobile}
                onAddEvent={(ds) => {
                  if (isMobile) {
                    setBottomSheetDate(ds)
                  } else {
                    setEditingEvent(null); setModalDate(ds)
                  }
                }}
                onEditEvent={(ev) => { setEditingEvent(ev); setModalDate(null) }}
              />
            ))}
            <DragOverlay dropAnimation={null}>
              {activeEvent && activeCatStyle && (
                <div
                  className="text-xs px-1.5 py-0.5 rounded truncate pointer-events-none"
                  style={{
                    background: activeCatStyle.bgColor,
                    color: activeCatStyle.color,
                    border: `1px solid ${activeCatStyle.color}`,
                    opacity: 0.85,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    maxWidth: 140,
                  }}
                >
                  {activeEvent.title}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Modal */}
      {(modalDate !== null || editingEvent !== null) && (
        <EventModal
          event={editingEvent}
          defaultDate={modalDate ?? undefined}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setModalDate(null); setEditingEvent(null) }}
        />
      )}

      {/* Mobile bottom sheet */}
      <EventBottomSheet
        date={bottomSheetDate}
        onClose={() => setBottomSheetDate(null)}
        onAddEvent={(ds) => { setBottomSheetDate(null); setEditingEvent(null); setModalDate(ds) }}
        onEditEvent={(ev) => { setBottomSheetDate(null); setEditingEvent(ev); setModalDate(null) }}
      />
    </div>
  )
}
