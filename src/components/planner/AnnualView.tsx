/**
 * AnnualView
 * 12 monthly MonthCards stacked vertically with CSS scroll-snap.
 * Auto-scrolls to the current month on mount.
 * Shows a "Go to Today" floating pill when the current month is off-screen.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'
import type { PlannerEvent, RecurrenceRule } from '../../types'
import { usePlanner } from '../../context/PlannerContext'
import { MonthCard } from './MonthCard'
import { EventModal } from './EventModal'

const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 — January · February · March',
  4: 'Q2 — April · May · June',
  7: 'Q3 — July · August · September',
  10: 'Q4 — October · November · December',
}

export function AnnualView() {
  const { store, currentYear, addEvent, editEvent, removeEvent } = usePlanner()

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1 // 1-based

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null)
  const [showGoToday, setShowGoToday] = useState(false)

  // Refs: one per month (index 0 = January)
  const monthRefs = useRef<(HTMLDivElement | null)[]>(Array(12).fill(null))
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Auto-scroll to current month on mount ─────────────────────────────────
  useEffect(() => {
    const targetIdx = currentYear === todayYear ? todayMonth - 1 : 0
    const el = monthRefs.current[targetIdx]
    if (!el) return
    // Small delay lets the layout paint before scrolling
    const id = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only on mount

  // ── IntersectionObserver: show "Go to Today" when current month is off-screen
  useEffect(() => {
    if (currentYear !== todayYear) { setShowGoToday(false); return }
    const el = monthRefs.current[todayMonth - 1]
    const container = containerRef.current
    if (!el || !container) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowGoToday(!entry.isIntersecting),
      { root: container, threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [currentYear, todayYear, todayMonth])

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleSave = useCallback((data: {
    date: string
    title: string
    category: string
    notes?: string
    recurrence?: RecurrenceRule
  }) => {
    if (editingEvent) {
      editEvent(editingEvent.id, data)
    } else {
      addEvent(data.date, data.title, data.category, data.notes, data.recurrence)
    }
  }, [editingEvent, editEvent, addEvent])

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

  function goToToday() {
    const el = monthRefs.current[todayMonth - 1]
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Print layout: also render a hidden quarterly print version ────────────
  const printOrgName = store.organizationName
  const printTitle = store.plannerTitle

  return (
    <div className="flex flex-col flex-1 relative" style={{ background: '#0a0e1a' }}>
      {/* Scrollable month stack */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain' }}
      >
        {/* Print header — hidden on screen, shown when printing */}
        <div
          className="hidden print:block text-center mb-4 font-black tracking-widest uppercase text-lg"
          style={{ color: '#000' }}
        >
          {printOrgName} – {printTitle} – JANUARY TO DECEMBER {currentYear}
        </div>

        <div className="p-3 sm:p-4 md:p-6 space-y-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const isQuarterStart = QUARTER_LABELS[month] !== undefined
            return (
              <div
                key={month}
                // snap wrapper — scroll-snap positions to the top of this div
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Quarter divider label */}
                {isQuarterStart && (
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2 px-1 pt-1"
                    style={{ color: '#475569' }}
                  >
                    {QUARTER_LABELS[month]}
                  </div>
                )}

                {/* Month card */}
                <div
                  ref={(el) => { monthRefs.current[month - 1] = el }}
                >
                  <MonthCard
                    year={currentYear}
                    month={month}
                    onAddEvent={openAdd}
                    onEditEvent={openEdit}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating "Go to Today" pill */}
      {showGoToday && (
        <button
          onClick={goToToday}
          className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all"
          style={{
            background: '#d4af37',
            color: '#111827',
          }}
        >
          <ArrowUp size={12} />
          Today
        </button>
      )}

      {/* Event modal */}
      {(modalDate !== null || editingEvent !== null) && (
        <EventModal
          event={editingEvent}
          defaultDate={modalDate ?? undefined}
          onSave={handleSave}
          onDelete={removeEvent}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
