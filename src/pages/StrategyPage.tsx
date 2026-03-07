/**
 * Strategy Page
 * Integrates VitalFew, WeeklyAlignmentCheck, and TimeAnalysis
 * for the STRATUM strategic planning system.
 */
import { VitalFewPanel } from '../components/planner/VitalFewPanel'
import { WeeklyAlignmentCheck } from '../components/planner/WeeklyAlignmentCheck'
import { TimeAnalysis } from '../components/planner/TimeAnalysis'
import { usePlanner } from '../context/PlannerContext'
import { addDays, format } from 'date-fns'
import { Layers } from 'lucide-react'

export function StrategyPage() {
  const { currentWeekStart } = usePlanner()
  const weekStart = new Date(currentWeekStart + 'T00:00:00')
  const weekRange = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`

  return (
    <div className="flex flex-col flex-1" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 no-print"
        style={{ borderBottom: '1px solid #1e2d40' }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(212,175,55,0.15)' }}
        >
          <Layers size={16} style={{ color: '#d4af37' }} />
        </div>
        <div>
          <h2 className="text-base font-black tracking-wide" style={{ color: '#d4af37' }}>
            Strategic Planning
          </h2>
          <p className="text-xs text-slate-500">
            {weekRange}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Tagline */}
          <p className="text-xs uppercase tracking-widest text-center" style={{ color: '#64748b' }}>
            Plan your year in layers: vision → strategy → execution
          </p>

          {/* Vital Few */}
          <VitalFewPanel />

          {/* Time Analysis */}
          <TimeAnalysis />

          {/* Weekly Alignment Check */}
          <WeeklyAlignmentCheck />
        </div>
      </div>
    </div>
  )
}
