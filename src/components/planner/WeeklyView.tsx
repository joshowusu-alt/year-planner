/**
 * Weekly View
 * 7-day view with events and tasks per day, drag-to-move support
 */
import { useState } from 'react'
import { addDays, format, subDays, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Square, GripVertical } from 'lucide-react'
import { usePlanner } from '../../context/PlannerContext'
import type { PlannerEvent, RecurrenceRule } from '../../types'
import { PRIORITY_COLORS, getCategoryStyle } from '../../types'
import { EventModal } from '../planner/EventModal'
import { EventBottomSheet } from '../planner/EventBottomSheet'
import { useBreakpoint } from '../../hooks/useMediaQuery'

export function WeeklyView() {
  const {
    store,
    addEvent, editEvent, removeEvent,
    getEventsForDate,
    addTask, toggleTask, removeTask,
    currentWeekStart, setCurrentWeekStart,
  } = usePlanner()

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null)
  const [bottomSheetDate, setBottomSheetDate] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()

  const weekStart = new Date(currentWeekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function navigate(dir: -1 | 1) {
    const newDate = dir === 1 ? addDays(weekStart, 7) : subDays(weekStart, 7)
    setCurrentWeekStart(format(newDate, 'yyyy-MM-dd'))
  }

  function goToThisWeek() {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    setCurrentWeekStart(format(d, 'yyyy-MM-dd'))
  }

  function getEvents(date: Date): PlannerEvent[] {
    const key = format(date, 'yyyy-MM-dd')
    return getEventsForDate(key)
  }

  function getTasks(date: Date) {
    const key = format(date, 'yyyy-MM-dd')
    return store.tasks.filter((t) => t.period === 'day' && t.date === key)
  }

  function handleSave(data: { date: string; title: string; category: string; notes?: string; recurrence?: RecurrenceRule }) {
    if (editingEvent) {
      editEvent(editingEvent.id, data)
    } else {
      addEvent(data.date, data.title, data.category, data.notes, data.recurrence)
    }
  }

  function handleAddTask(date: string) {
    if (!newTaskTitle.trim()) { setNewTaskDate(null); return }
    addTask({
      title: newTaskTitle.trim(),
      date,
      period: 'day',
      year: new Date(date).getFullYear(),
      priority: 'medium',
      completed: false,
    })
    setNewTaskTitle('')
    setNewTaskDate(null)
  }

  // ── Drag-and-drop event rescheduling ──────────────────────────────────────
  function onDragStart(eventId: string) {
    setDraggedEventId(eventId)
  }

  function onDrop(targetDate: string) {
    if (!draggedEventId) return
    editEvent(draggedEventId, { date: targetDate })
    setDraggedEventId(null)
  }

  const weekRange = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`

  return (
    <div className="flex flex-col flex-1" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 no-print flex-wrap"
        style={{ borderBottom: '1px solid #1e2d40' }}
      >
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>

        <div>
          <h2 className="text-base font-black tracking-wide" style={{ color: '#d4af37' }}>
            {weekRange}
          </h2>
        </div>

        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-white/10">
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={goToThisWeek}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: '#94a3b8', border: '1px solid #243447' }}
        >
          ↩ Today
        </button>

        <div className="flex-1" />

        <button
          onClick={() => { setEditingEvent(null); setModalDate(format(new Date(), 'yyyy-MM-dd')) }}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: '#d4af37', color: '#111827' }}
        >
          <Plus size={13} /> Add Event
        </button>
      </div>

      {/* Week columns — grid on desktop, vertical cards on mobile */}
      <div className="flex-1 overflow-auto">
        <div
          className={isMobile
            ? 'flex flex-col gap-2 p-3'
            : 'grid grid-cols-7 h-full'
          }
          style={isMobile ? {} : { minWidth: '700px' }}
        >
          {days.map((date) => {
            const events = getEvents(date)
            const tasks = getTasks(date)
            const today = isToday(date)
            const sunday = date.getDay() === 0
            const dateStr = format(date, 'yyyy-MM-dd')

            return (
              <div
                key={dateStr}
                className={isMobile
                  ? 'rounded-xl p-2'
                  : 'flex flex-col border-r'
                }
                style={isMobile
                  ? {
                      background: today ? '#0d1a2e' : '#0d1224',
                      border: today ? '1px solid #d4af37' : '1px solid #1e2d40',
                    }
                  : { borderColor: '#1e2d40', background: today ? '#0d1a2e' : 'transparent' }
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(dateStr)}
              >
                {/* Day header */}
                <div
                  className={isMobile
                    ? 'flex items-center gap-2 pb-1.5 mb-1.5 border-b'
                    : 'flex flex-col items-center py-3 border-b sticky top-0'
                  }
                  style={{ borderColor: '#1e2d40', background: isMobile ? 'transparent' : (today ? '#0d1a2e' : '#0a0e1a') }}
                >
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${sunday ? 'text-red-400' : 'text-slate-500'}`}
                  >
                    {format(date, 'EEE')}
                  </span>
                  {isMobile ? (
                    // Mobile: compact date number inline
                    <span
                      className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                        today ? 'text-black' : sunday ? 'text-red-400' : 'text-slate-200'
                      }`}
                      style={today ? { background: '#d4af37' } : {}}
                    >
                      {format(date, 'd')}
                    </span>
                  ) : (
                    <span
                      className={`text-lg font-black mt-0.5 w-9 h-9 flex items-center justify-center rounded-full ${
                        today ? 'bg-yellow-400 text-black' : sunday ? 'text-red-400' : 'text-slate-200'
                      }`}
                    >
                      {format(date, 'd')}
                    </span>
                  )}
                  {today && (
                    <span
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: '#d4af37' }}
                    >
                      Today
                    </span>
                  )}
                  {isMobile && !today && (
                    <span className="flex-1 text-xs text-slate-600">
                      {events.length > 0 && `${events.length}e`}{tasks.length > 0 && ` ${tasks.length}t`}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className={isMobile ? 'space-y-1' : 'flex-1 p-2 space-y-1.5 overflow-y-auto'}>
                  {/* Events */}
                  {events.map((ev) => {
                    const catStyle = getCategoryStyle(ev.category, store.categories)
                    return isMobile ? (
                      // Mobile: compact chip style
                      <span
                        key={ev.id}
                        className="inline-flex items-center gap-1 text-xs leading-tight cursor-pointer rounded px-1.5 py-0.5 mr-1"
                        style={{ color: catStyle.color, background: catStyle.bgColor }}
                        onClick={() => { setEditingEvent(ev); setModalDate(null) }}
                      >
                        {ev.title}
                      </span>
                    ) : (
                      <div
                        key={ev.id}
                        draggable
                        onDragStart={() => onDragStart(ev.id)}
                        className="flex items-start gap-1 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing group"
                        style={{
                          background: catStyle.bgColor,
                          border: `1px solid ${catStyle.color}`,
                        }}
                        onClick={() => { setEditingEvent(ev); setModalDate(null) }}
                      >
                        <GripVertical size={10} className="text-slate-600 mt-0.5 shrink-0" />
                        <span className="text-xs font-semibold leading-tight" style={{ color: catStyle.color }}>
                          {ev.title}
                        </span>
                      </div>
                    )
                  })}

                  {/* Tasks */}
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1.5 group"
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="shrink-0"
                      >
                        {task.completed
                          ? <CheckSquare size={13} className="text-green-400" />
                          : <Square size={13} style={{ color: PRIORITY_COLORS[task.priority] }} />}
                      </button>
                      <span
                        className={`text-xs flex-1 leading-tight ${task.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}
                      >
                        {task.title}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-60"
                        onClick={() => removeTask(task.id)}
                      >
                        <Plus size={10} className="text-red-400 rotate-45" />
                      </button>
                    </div>
                  ))}

                  {/* Quick add task */}
                  {newTaskDate === dateStr ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(dateStr)
                          if (e.key === 'Escape') setNewTaskDate(null)
                        }}
                        onBlur={() => handleAddTask(dateStr)}
                        placeholder="Task..."
                        className="flex-1 text-xs bg-transparent border-b px-1 focus:outline-none"
                        style={{ borderColor: '#d4af37', color: '#e2e8f0' }}
                      />
                    </div>
                  ) : (
                    <button
                      className="w-full text-left flex items-center gap-1 opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-slate-400 transition-all"
                      onClick={() => setNewTaskDate(dateStr)}
                    >
                      <Plus size={10} />
                      add task
                    </button>
                  )}
                </div>

                {/* Add event button */}
                <button
                  className={isMobile
                    ? 'flex items-center justify-center gap-1 py-2 mt-2 text-xs text-slate-600 active:text-yellow-400 active:bg-white/5 transition-colors border-t rounded-lg'
                    : 'flex items-center justify-center gap-1 py-2 text-xs text-slate-600 hover:text-yellow-400 hover:bg-white/5 transition-colors border-t'
                  }
                  style={{ borderColor: '#1e2d40' }}
                  onClick={() => {
                    if (isMobile) {
                      setBottomSheetDate(dateStr)
                    } else {
                      setEditingEvent(null); setModalDate(dateStr)
                    }
                  }}
                >
                  <Plus size={11} /> event
                </button>
              </div>
            )
          })}
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
