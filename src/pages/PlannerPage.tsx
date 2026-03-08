import { useRef, useState } from 'react'
import { usePlanner } from '../context/PlannerContext'
import { YearPlannerTable } from '../components/planner/YearPlannerTable'
import { TopBar } from '../components/layout/TopBar'
import { EventModal } from '../components/planner/EventModal'
import type { EventCategory } from '../types'

const QUARTERS = [1, 4, 7, 10] // starting months of each quarter

export function PlannerPage() {
  const { store, addEvent, currentYear } = usePlanner()
  const printRef = useRef<HTMLDivElement>(null)
  const [addModal, setAddModal] = useState(false)

  function handlePrint() {
    window.print()
  }

  function handleQuickAdd(data: {
    date: string
    title: string
    category: EventCategory
    notes?: string
  }) {
    addEvent(data.date, data.title, data.category, data.notes)
    setAddModal(false)
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-full overflow-x-hidden" style={{ background: '#0a0e1a' }}>
      <TopBar
        year={currentYear}
        onAddEvent={() => setAddModal(true)}
        onPrint={handlePrint}
      />

      <main ref={printRef} className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 print-table overflow-x-hidden">
        {/* Print header (only visible when printing) */}
        <div
          className="hidden print:block text-center mb-4 font-black tracking-widest uppercase text-lg"
          style={{ color: '#000' }}
        >
          {store.organizationName} – {store.plannerTitle} – JANUARY TO DECEMBER {currentYear}
        </div>

        {QUARTERS.map((startMonth) => (
          <YearPlannerTable key={startMonth} year={currentYear} startMonth={startMonth} />
        ))}
      </main>

      {/* Quick Add Modal (no pre-selected date) */}
      {addModal && (
        <EventModal
          onSave={handleQuickAdd}
          onClose={() => setAddModal(false)}
        />
      )}
    </div>
  )
}
