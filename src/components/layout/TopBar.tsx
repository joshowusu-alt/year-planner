import { Printer, FileDown, Plus, Calendar } from 'lucide-react'
import { usePlanner } from '../../context/PlannerContext'
import { exportToCSV } from '../../lib/storage'
import { CategoryLegend } from '../planner/CategoryLegend'

interface Props {
  year: number
  onAddEvent: () => void
  onPrint: () => void
}

export function TopBar({ year, onAddEvent, onPrint }: Props) {
  const { store } = usePlanner()

  return (
    <div
      className="sticky top-0 z-30 flex flex-col gap-2 px-6 py-3 no-print"
      style={{
        background: '#0a0e1a',
        borderBottom: '1px solid #1e2d40',
      }}
    >
      {/* Row 1 */}
      <div className="flex items-center gap-4">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={18} style={{ color: '#d4af37' }} className="shrink-0" />
          <div className="min-w-0">
            <h1
              className="text-base font-black tracking-widest uppercase truncate leading-tight"
              style={{ color: '#d4af37' }}
            >
              {store.organizationName} – {store.plannerTitle}
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              January to December {year}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => exportToCSV(store)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ color: '#94a3b8', border: '1px solid #243447' }}
            title="Export to CSV"
          >
            <FileDown size={13} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ color: '#94a3b8', border: '1px solid #243447' }}
            title="Export to PDF / Print"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <button
            onClick={onAddEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            <Plus size={13} />
            Add Event
          </button>
        </div>
      </div>

      {/* Row 2 – legend */}
      <CategoryLegend />
    </div>
  )
}
