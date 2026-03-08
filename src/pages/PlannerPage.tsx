import { useState } from 'react'
import { usePlanner } from '../context/PlannerContext'
import { AnnualView } from '../components/planner/AnnualView'
import { YearPlannerTable } from '../components/planner/YearPlannerTable'
import { TopBar } from '../components/layout/TopBar'
import { EventModal } from '../components/planner/EventModal'
import type { EventCategory } from '../types'

const QUARTERS = [1, 4, 7, 10]

export function PlannerPage() {
  const { store, addEvent, currentYear } = usePlanner()
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

      {/* Screen: 12-card scroll-snap annual view */}
      <div className="flex-1 overflow-hidden no-print flex flex-col">
        <AnnualView />
      </div>

      {/* Print-only: classic quarterly layout */}
      <div className="hidden print:block p-6 space-y-6 print-table">
        <div
          className="text-center mb-4 font-black tracking-widest uppercase text-lg"
          style={{ color: '#000' }}
        >
          {store.organizationName} – {store.plannerTitle} – JANUARY TO DECEMBER {currentYear}
        </div>
        {QUARTERS.map((startMonth) => (
          <YearPlannerTable key={startMonth} year={currentYear} startMonth={startMonth} />
        ))}
      </div>

      {/* Quick Add Modal */}
      {addModal && (
        <EventModal
          onSave={handleQuickAdd}
          onClose={() => setAddModal(false)}
        />
      )}
    </div>
  )
}
