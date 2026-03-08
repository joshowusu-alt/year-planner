/**
 * Weekly Time Grid — Google-Calendar-style hourly grid view
 * Supports desktop (7 columns) and mobile (1 column with day-nav) layouts.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { addDays, format, isToday, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePlanner } from '../../context/PlannerContext'
import type { PlannerEvent, RecurrenceRule } from '../../types'
import { getCategoryStyle } from '../../types'
import { EventModal } from './EventModal'
import { useBreakpoint } from '../../hooks/useMediaQuery'
import { DndContext, DragOverlay, useDraggable, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64           // px per hour
const TOTAL_HEIGHT = HOUR_HEIGHT * 24  // 1536px
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function minutesToPx(minutes: number): number {
  return (minutes / (24 * 60)) * TOTAL_HEIGHT
}

function roundToNearest15(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionedEvent {
  event: PlannerEvent
  top: number
  height: number
  column: number
  columnCount: number
}

// Compute non-overlapping layout for events in a single day column
function layoutEvents(events: PlannerEvent[]): PositionedEvent[] {
  // Only timed events
  const timedEvents = events.filter((e) => e.startTime)
  if (timedEvents.length === 0) return []

  // Sort by start time
  const sorted = [...timedEvents].sort((a, b) =>
    timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!)
  )

  // Build groups of overlapping events using a sweep-line approach
  const positioned: PositionedEvent[] = []
  const columns: PlannerEvent[][] = []

  for (const ev of sorted) {
    const startMin = timeToMinutes(ev.startTime!)
    const endMin = ev.endTime
      ? timeToMinutes(ev.endTime)
      : startMin + 60

    // Find a column that doesn't conflict
    let placed = false
    for (let col = 0; col < columns.length; col++) {
      const last = columns[col][columns[col].length - 1]
      const lastEnd = last.endTime
        ? timeToMinutes(last.endTime)
        : timeToMinutes(last.startTime!) + 60
      if (startMin >= lastEnd) {
        columns[col].push(ev)
        placed = true
        positioned.push({
          event: ev,
          top: minutesToPx(startMin),
          height: Math.max(28, minutesToPx(endMin - startMin)),
          column: col,
          columnCount: 0, // filled in pass 2
        })
        break
      }
    }
    if (!placed) {
      columns.push([ev])
      positioned.push({
        event: ev,
        top: minutesToPx(startMin),
        height: Math.max(28, minutesToPx(endMin - startMin)),
        column: columns.length - 1,
        columnCount: 0,
      })
    }
  }

  // Pass 2: compute conflicts per event so we know how many columns to split into
  for (const pe of positioned) {
    const startMin = timeToMinutes(pe.event.startTime!)
    const endMin = pe.event.endTime
      ? timeToMinutes(pe.event.endTime)
      : startMin + 60
    let maxCol = pe.column
    for (const other of positioned) {
      if (other.event.id === pe.event.id) continue
      const oStart = timeToMinutes(other.event.startTime!)
      const oEnd = other.event.endTime
        ? timeToMinutes(other.event.endTime)
        : oStart + 60
      if (oStart < endMin && oEnd > startMin) {
        maxCol = Math.max(maxCol, other.column)
      }
    }
    pe.columnCount = maxCol + 1
  }

  return positioned
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface EventBlockProps {
  pe: PositionedEvent
  onClick: (ev: PlannerEvent) => void
  categories: import('../../types').EventCategoryDef[]
}

function EventBlock({ pe, onClick, categories }: EventBlockProps) {
  const { event, top, height, column, columnCount } = pe
  const catStyle = getCategoryStyle(event.category, categories)
  const leftPct = (column / columnCount) * 100
  const widthPct = (1 / columnCount) * 100
  const startLabel = event.startTime ?? ''

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { type: 'event', startTime: event.startTime, dateStr: event.date },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="absolute overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{
        top,
        height: Math.max(height, 28),
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        paddingLeft: 3,
        paddingRight: 2,
        zIndex: isDragging ? 0 : 10,
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.25 : 1,
        touchAction: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onClick(event) }}
    >
      <div
        className="h-full rounded overflow-hidden flex flex-col px-1.5 py-0.5"
        style={{
          background: catStyle.bgColor,
          borderLeft: `3px solid ${catStyle.color}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      >
        <span
          className="text-xs font-semibold leading-tight truncate"
          style={{ color: catStyle.color }}
        >
          {event.title}
        </span>
        {height >= 42 && (
          <span className="text-xs leading-tight" style={{ color: catStyle.color, opacity: 0.75 }}>
            {startLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WeeklyTimeGrid() {
  const {
    store,
    addEvent,
    editEvent,
    removeEvent,
    getEventsForDate,
    currentWeekStart,
    setCurrentWeekStart,
  } = usePlanner()

  const { isMobile } = useBreakpoint()
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowLineRef = useRef<HTMLDivElement>(null)
  const gridBodyRef = useRef<HTMLDivElement>(null)

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [snapLineY, setSnapLineY] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Week days
  const weekStart = new Date(currentWeekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Mobile: single selected day (stored as date string so it survives week changes gracefully)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const weekDayStrs = days.map((d) => format(d, 'yyyy-MM-dd'))
  const initialDay = weekDayStrs.includes(todayStr) ? todayStr : weekDayStrs[0]
  const [selectedDayStr, setSelectedDayStr] = useState<string>(initialDay)

  // If selectedDayStr not in current week, snap to first day
  const effectiveDayStr = weekDayStrs.includes(selectedDayStr) ? selectedDayStr : weekDayStrs[0]
  const selectedDayIndex = weekDayStrs.indexOf(effectiveDayStr)

  // Which days are visible (all 7 on desktop, 1 on mobile)
  const visibleDays = isMobile ? [days[selectedDayIndex]] : days

  // Modal state
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [modalStartTime, setModalStartTime] = useState<string | undefined>(undefined)

  // Current time for the now-line
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date()
      setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to current hour (or 8:00) on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = Math.max(nowMinutes - 60, 8 * 60)
    el.scrollTop = minutesToPx(target)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selectedDayIndex when week changes — handled implicitly via effectiveDayStr snap above

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navigateDay(dir: -1 | 1) {
    const nextIndex = selectedDayIndex + dir
    if (nextIndex < 0) {
      // Go to previous week, select last day
      const prevWeekStart = subDays(weekStart, 7)
      setCurrentWeekStart(format(prevWeekStart, 'yyyy-MM-dd'))
      setSelectedDayStr(format(addDays(prevWeekStart, 6), 'yyyy-MM-dd'))
    } else if (nextIndex > 6) {
      // Go to next week, select first day
      const nextWeekStart = addDays(weekStart, 7)
      setCurrentWeekStart(format(nextWeekStart, 'yyyy-MM-dd'))
      setSelectedDayStr(format(nextWeekStart, 'yyyy-MM-dd'))
    } else {
      setSelectedDayStr(weekDayStrs[nextIndex])
    }
  }

  // ── Event helpers ────────────────────────────────────────────────────────────

  function getEvents(date: Date): PlannerEvent[] {
    return getEventsForDate(format(date, 'yyyy-MM-dd'))
  }

  function getTimedEvents(date: Date): PlannerEvent[] {
    return getEvents(date).filter((e) => e.startTime)
  }

  function getAllDayEvents(date: Date): PlannerEvent[] {
    return getEvents(date).filter((e) => !e.startTime)
  }

  // ── Interaction ──────────────────────────────────────────────────────────────

  function handleSlotClick(date: Date, clickY: number, colHeight: number) {
    const totalMinutesInDay = 24 * 60
    const rawMinutes = Math.round((clickY / colHeight) * totalMinutesInDay)
    const snapped = roundToNearest15(rawMinutes)
    const clamped = Math.max(0, Math.min(snapped, 23 * 60 + 45))
    setEditingEvent(null)
    setModalDate(format(date, 'yyyy-MM-dd'))
    setModalStartTime(minutesToTimeStr(clamped))
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, date: Date) {
    const rect = e.currentTarget.getBoundingClientRect()
    // getBoundingClientRect already accounts for scroll, so no need to add scrollTop
    const y = e.clientY - rect.top
    handleSlotClick(date, y, TOTAL_HEIGHT)
  }

  function handleEditEvent(ev: PlannerEvent) {
    setEditingEvent(ev)
    setModalDate(null)
    setModalStartTime(undefined)
  }

  function handleSave(data: {
    date: string
    title: string
    category: string
    notes?: string
    recurrence?: RecurrenceRule
    startTime?: string
    endTime?: string
    reminder?: number | null
  }) {
    if (editingEvent) {
      editEvent(editingEvent.id, data)
    } else {
      addEvent(data.date, data.title, data.category, data.notes, data.recurrence, data.startTime, data.endTime, data.reminder)
    }
  }

  function closeModal() {
    setEditingEvent(null)
    setModalDate(null)
    setModalStartTime(undefined)
  }

  // ── Time-grid DnD ─────────────────────────────────────────────────────────

  const computeDropTarget = useCallback((translated: { left: number; top: number; width: number; height: number }) => {
    const el = gridBodyRef.current
    if (!el) return null
    const gridRect = el.getBoundingClientRect()
    const GUTTER = 52
    const columnsLeft = gridRect.left + GUTTER
    const columnsWidth = gridRect.width - GUTTER
    const colWidth = columnsWidth / visibleDays.length
    const relX = translated.left + translated.width / 2 - columnsLeft
    const relY = translated.top - gridRect.top
    const dayIndex = Math.max(0, Math.min(visibleDays.length - 1, Math.floor(relX / colWidth)))
    const rawMinutes = (relY / TOTAL_HEIGHT) * 24 * 60
    const snappedMinutes = Math.max(0, Math.min(23 * 60 + 45, roundToNearest15(rawMinutes)))
    return { dayIndex, snappedMinutes }
  }, [visibleDays])

  function handleTimeGridDragEnd(evt: DragEndEvent) {
    const { active } = evt
    setActiveDragId(null)
    setSnapLineY(null)
    if (isMobile) return
    const translated = active.rect.current.translated
    if (!translated) return
    const target = computeDropTarget(translated)
    if (!target) return
    const { dayIndex, snappedMinutes } = target
    const targetDate = visibleDays[dayIndex]
    const sourceEvent = store.events.find((e) => e.id === active.id)
    if (!sourceEvent) return
    let newEndTime = sourceEvent.endTime
    if (sourceEvent.startTime && sourceEvent.endTime) {
      const duration = timeToMinutes(sourceEvent.endTime) - timeToMinutes(sourceEvent.startTime)
      newEndTime = minutesToTimeStr(Math.min(24 * 60 - 1, snappedMinutes + duration))
    }
    editEvent(active.id as string, {
      date: format(targetDate, 'yyyy-MM-dd'),
      startTime: minutesToTimeStr(snappedMinutes),
      endTime: newEndTime,
    })
  }

  function handleTimeGridDragMove(evt: DragMoveEvent) {
    if (isMobile) return
    const translated = evt.active.rect.current.translated
    if (!translated) return
    const target = computeDropTarget(translated)
    if (!target) return
    setSnapLineY(minutesToPx(target.snappedMinutes))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const nowTop = minutesToPx(nowMinutes)

  const activeDragEvent = activeDragId ? store.events.find((e) => e.id === activeDragId) ?? null : null
  const activeDragCatStyle = activeDragEvent ? getCategoryStyle(activeDragEvent.category, store.categories) : null
  const activeDragPeHeight = activeDragEvent?.startTime && activeDragEvent?.endTime
    ? Math.max(48, minutesToPx(timeToMinutes(activeDragEvent.endTime) - timeToMinutes(activeDragEvent.startTime)))
    : 48

  return (
    <DndContext
      sensors={!isMobile ? sensors : []}
      onDragStart={(e) => { if (!isMobile) setActiveDragId(e.active.id as string) }}
      onDragMove={handleTimeGridDragMove}
      onDragEnd={handleTimeGridDragEnd}
    >
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ background: '#0a0e1a' }}
    >
      {/* Mobile day navigator */}
      {isMobile && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <button
            onClick={() => navigateDay(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10"
          >
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {format(days[selectedDayIndex], 'EEEE')}
            </span>
            <span
              className={`text-xl font-black w-10 h-10 flex items-center justify-center rounded-full ${
                isToday(days[selectedDayIndex]) ? 'text-black' : 'text-slate-200'
              }`}
              style={isToday(days[selectedDayIndex]) ? { background: '#d4af37' } : {}}
            >
              {format(days[selectedDayIndex], 'd')}
            </span>
            <span className="text-xs font-semibold" style={{ color: '#d4af37' }}>
              {format(days[selectedDayIndex], 'MMM yyyy')}
            </span>
          </div>
          <button
            onClick={() => navigateDay(1)}
            className="p-1.5 rounded-lg hover:bg-white/10"
          >
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      )}

      {/* Outer scroll wrapper — handles both axes */}
      <div
        className="flex-1 overflow-auto"
        id="weekly-time-grid-scroll"
        ref={scrollRef}
      >
        <div style={{ minWidth: isMobile ? '100%' : '860px' }}>
          {/* ── Sticky header ─────────────────────────────────────────────── */}
          <div
            className="sticky top-0 z-30 flex"
            style={{ background: '#0a0e1a', borderBottom: '1px solid #1e2d40' }}
          >
            {/* Hour-label gutter spacer */}
            <div style={{ width: 52, minWidth: 52, flexShrink: 0 }} />

            {/* Day columns header */}
            {visibleDays.map((date, colIdx) => {
              const today = isToday(date)
              const sunday = date.getDay() === 0
              const dayIdx = (date.getDay() + 6) % 7 // Mon=0 … Sun=6
              const allDay = getAllDayEvents(date)

              return (
                <div
                  key={format(date, 'yyyy-MM-dd')}
                  className="flex-1 flex flex-col"
                  style={{
                    borderLeft: colIdx === 0 ? '1px solid #1e2d40' : 'none',
                    borderRight: '1px solid #1e2d40',
                    background: today ? '#0d1a2e' : 'transparent',
                    minWidth: isMobile ? 0 : 120,
                  }}
                >
                  {/* Day label row */}
                  <div className="flex flex-col items-center py-2 gap-0.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        sunday ? 'text-red-400' : 'text-slate-500'
                      }`}
                    >
                      {isMobile ? format(date, 'EEEE') : DAY_LABELS[dayIdx]}
                    </span>
                    <span
                      className={`text-lg font-black w-9 h-9 flex items-center justify-center rounded-full ${
                        today
                          ? 'text-black'
                          : sunday
                          ? 'text-red-400'
                          : 'text-slate-200'
                      }`}
                      style={today ? { background: '#d4af37' } : {}}
                    >
                      {format(date, 'd')}
                    </span>
                  </div>

                  {/* All-day events strip */}
                  {allDay.length > 0 && (
                    <div
                      className="px-1 pb-1 flex flex-col gap-0.5 overflow-y-auto"
                      style={{ maxHeight: 72 }}
                    >
                      {allDay.map((ev) => {
                        const catStyle = getCategoryStyle(ev.category, store.categories)
                        return (
                          <div
                            key={ev.id}
                            className="rounded px-1.5 py-0.5 text-xs font-semibold truncate cursor-pointer"
                            style={{
                              background: catStyle.bgColor,
                              borderLeft: `3px solid ${catStyle.color}`,
                              color: catStyle.color,
                            }}
                            onClick={() => handleEditEvent(ev)}
                          >
                            {ev.title}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Body (hour grid) ──────────────────────────────────────────── */}
          <div ref={gridBodyRef} className="flex relative" style={{ height: TOTAL_HEIGHT }}>
            {/* Hour labels */}
            <div
              style={{ width: 52, minWidth: 52, flexShrink: 0, position: 'relative' }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: h * HOUR_HEIGHT - 9,
                    right: 8,
                    height: HOUR_HEIGHT,
                  }}
                  className="flex items-start"
                >
                  <span
                    className="text-xs tabular-nums select-none"
                    style={{ color: '#475569', lineHeight: 1 }}
                  >
                    {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {visibleDays.map((date, colIdx) => {
              const today = isToday(date)
              const dateStr = format(date, 'yyyy-MM-dd')
              const timedEvs = getTimedEvents(date)
              const positioned = layoutEvents(timedEvs)

              return (
                <div
                  key={dateStr}
                  className="flex-1 relative cursor-pointer"
                  style={{
                    borderLeft: colIdx === 0 ? '1px solid #1e2d40' : 'none',
                    borderRight: '1px solid #1e2d40',
                    background: today ? '#0d1a2e' : 'transparent',
                    height: TOTAL_HEIGHT,
                    minWidth: isMobile ? 0 : 120,
                  }}
                  onClick={(e) => handleColumnClick(e, date)}
                >
                  {/* Horizontal hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: h * HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        height: 1,
                        background: h % 6 === 0 ? '#243447' : '#1a2535',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* Half-hour dashed lines */}
                  {HOURS.map((h) => (
                    <div
                      key={`h-${h}`}
                      style={{
                        position: 'absolute',
                        top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                        left: 0,
                        right: 0,
                        height: 1,
                        background: '#161f2e',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* Now line — only on today's column */}
                  {today && (
                    <div
                      ref={nowLineRef}
                      style={{
                        position: 'absolute',
                        top: nowTop,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: '#ef4444',
                        zIndex: 20,
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: -4,
                          top: -4,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#ef4444',
                        }}
                      />
                    </div>
                  )}

                  {/* Event blocks */}
                  {positioned.map((pe) => (
                    <EventBlock
                      key={pe.event.id}
                      pe={pe}
                      onClick={handleEditEvent}
                      categories={store.categories}
                    />
                  ))}
                </div>
              )
            })}

            {/* Snap line — visible during drag at the snapped time */}
            {activeDragId && snapLineY !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: snapLineY,
                  left: 52,
                  right: 0,
                  height: 2,
                  background: '#d4af37',
                  zIndex: 25,
                  pointerEvents: 'none',
                  opacity: 0.85,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* EventModal */}
      {(modalDate !== null || editingEvent !== null) && (
        <EventModal
          event={editingEvent}
          defaultDate={modalDate ?? undefined}
          defaultStartTime={modalStartTime}
          onSave={handleSave}
          onDelete={removeEvent}
          onClose={closeModal}
        />
      )}
    </div>
    <DragOverlay dropAnimation={null}>
      {activeDragEvent && activeDragCatStyle && (
        <div
          style={{
            height: activeDragPeHeight,
            minHeight: 48,
            width: 130,
            opacity: 0.85,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            className="h-full flex flex-col px-1.5 py-0.5"
            style={{
              background: activeDragCatStyle.bgColor,
              borderLeft: `3px solid ${activeDragCatStyle.color}`,
            }}
          >
            <span
              className="text-xs font-semibold leading-tight truncate"
              style={{ color: activeDragCatStyle.color }}
            >
              {activeDragEvent.title}
            </span>
            {activeDragEvent.startTime && (
              <span className="text-xs" style={{ color: activeDragCatStyle.color, opacity: 0.75 }}>
                {activeDragEvent.startTime}
              </span>
            )}
          </div>
        </div>
      )}
    </DragOverlay>
    </DndContext>
  )
}
