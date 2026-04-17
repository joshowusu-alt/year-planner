import { useState } from 'react'
import { FileDown, X, CheckSquare2, Square } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  onClose: () => void
  onExport: (year: number, months: number[]) => void
}

export function ExportModal({ onClose, onExport }: Props) {
  const { currentYear } = usePlanner()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selected, setSelected] = useState<Set<number>>(
    new Set(Array.from({ length: 12 }, (_, i) => i + 1)),
  )

  function toggle(m: number) {
    const next = new Set(selected)
    if (next.has(m)) next.delete(m)
    else next.add(m)
    setSelected(next)
  }

  const orderedMonths = Array.from(selected).sort((a, b) => a - b)
  const calPages = Math.ceil(orderedMonths.length / 3)
  const totalPages = 1 + calPages + (orderedMonths.length > 0 ? 1 : 0) // cover + cal + goals

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: '#0d1224', border: '1px solid #1e2d40', maxHeight: '92vh' }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between p-5 shrink-0"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(212,175,55,0.15)' }}
            >
              <FileDown size={16} style={{ color: '#d4af37' }} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-white">Export PDF</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest">STRATUM Executive Report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Year selector */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Year</p>
            <div className="flex gap-2">
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-[0.97]"
                  style={
                    selectedYear === y
                      ? { background: '#d4af37', color: '#0a0e1a' }
                      : { background: '#111827', color: '#64748b', border: '1px solid #1e2d40' }
                  }
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Month selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Months</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(new Set(Array.from({ length: 12 }, (_, i) => i + 1)))}
                  className="text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ color: '#d4af37' }}
                >
                  Full year
                </button>
                <span className="text-slate-700">·</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-slate-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_NAMES_FULL.map((name, i) => {
                const m = i + 1
                const active = selected.has(m)
                return (
                  <button
                    key={m}
                    onClick={() => toggle(m)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                    style={
                      active
                        ? {
                            background: 'rgba(212,175,55,0.12)',
                            color: '#d4af37',
                            border: '1px solid rgba(212,175,55,0.35)',
                          }
                        : {
                            background: '#111827',
                            color: '#4b5563',
                            border: '1px solid #1e2d40',
                          }
                    }
                  >
                    {active
                      ? <CheckSquare2 size={11} />
                      : <Square size={11} />}
                    {name.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Layout preview */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: '#111827', border: '1px solid #1e2d40' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Layout preview</span>
              <span className="text-xs font-black" style={{ color: '#d4af37' }}>
                ~{totalPages} page{totalPages !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              1 cover page · {calPages} calendar page{calPages !== 1 ? 's' : ''} (3 months each) · goals summary
            </p>
            <p className="text-xs text-slate-600">
              A4 portrait · White background · Print-ready
            </p>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="p-5 shrink-0" style={{ borderTop: '1px solid #1e2d40' }}>
          <button
            onClick={() => orderedMonths.length > 0 && onExport(selectedYear, orderedMonths)}
            disabled={orderedMonths.length === 0}
            className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#d4af37', color: '#0a0e1a' }}
          >
            Generate PDF →
          </button>
          <p className="text-[10px] text-slate-600 text-center mt-2 uppercase tracking-widest">
            Powered by STRATUM
          </p>
        </div>
      </div>
    </div>
  )
}
