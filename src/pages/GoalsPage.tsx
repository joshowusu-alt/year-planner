import { useState } from 'react'
import { Plus, Target, ChevronDown, ChevronUp, Trash2, Pencil, CheckCircle2, Circle, CheckSquare, Square, Flag, X } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import type { Goal, Milestone, PriorityLevel, GoalStatus } from '../types'
import { PRIORITY_COLORS, PRIORITY_LABELS, GOAL_STATUS_LABELS } from '../types'

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d40' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color ?? '#d4af37' }}
      />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<GoalStatus, { bg: string; text: string }> = {
  'not-started': { bg: '#1e2d40', text: '#94a3b8' },
  'in-progress': { bg: '#1e3a5f', text: '#60a5fa' },
  completed: { bg: '#14532d', text: '#4ade80' },
  deferred: { bg: '#3b1e1e', text: '#f87171' },
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const s = STATUS_COLORS[status]
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {GOAL_STATUS_LABELS[status]}
    </span>
  )
}

// ─── Goal modal form ──────────────────────────────────────────────────────────

interface GoalFormData {
  title: string
  description: string
  quarter: 1 | 2 | 3 | 4
  month?: number
  year: number
  status: GoalStatus
  priority: PriorityLevel
  progress: number
}

function GoalModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<GoalFormData>
  onSave: (data: GoalFormData) => void
  onClose: () => void
}) {
  const { currentYear } = usePlanner()
  const [form, setForm] = useState<GoalFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    quarter: initial?.quarter ?? 1,
    month: initial?.month,
    year: initial?.year ?? currentYear,
    status: initial?.status ?? 'not-started',
    priority: initial?.priority ?? 'medium',
    progress: initial?.progress ?? 0,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col"
        style={{ background: '#111827', border: '1px solid #1e2d40', maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #1e2d40' }}>
          <h2 className="text-lg font-bold" style={{ color: '#d4af37' }}>
            {initial?.title ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Goal title..."
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
        />

        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
          style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Quarter</label>
            <select
              value={form.quarter}
              onChange={(e) => setForm({ ...form, quarter: Number(e.target.value) as 1|2|3|4 })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            >
              {[1,2,3,4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            >
              {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as PriorityLevel })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
            Progress: {form.progress}%
          </label>
          <input
            type="range"
            min={0} max={100}
            value={form.progress}
            onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
        </div>

        </div>
        {/* Sticky footer */}
        <div
          className="shrink-0 flex gap-2 justify-end px-6 py-4"
          style={{ borderTop: '1px solid #1e2d40', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg">Cancel</button>
          <button
            onClick={() => { if (form.title.trim()) { onSave(form); onClose() }}}
            className="px-5 py-2 rounded-lg text-sm font-bold"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            Save Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Milestone row ────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: Milestone
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 group py-1">
      <button onClick={onToggle}>
        {milestone.completed
          ? <CheckCircle2 size={14} className="text-green-400" />
          : <Circle size={14} className="text-slate-500" />}
      </button>
      <span className={`flex-1 text-xs ${milestone.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
        {milestone.title}
      </span>
      {milestone.dueDate && (
        <span className="text-xs text-slate-600">{milestone.dueDate}</span>
      )}
      <button
        className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 size={11} className="text-red-400" />
      </button>
    </div>
  )
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
  const { editGoal, removeGoal, addMilestoneToGoal, editMilestone, removeMilestone, store, toggleTask } = usePlanner()
  const linkedTasks = store.tasks.filter((t) => t.goalId === goal.id)
  const completedLinkedTasks = linkedTasks.filter((t) => t.completed).length
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const [showMilestoneInput, setShowMilestoneInput] = useState(false)

  const completedMilestones = goal.milestones.filter((m) => m.completed).length
  const totalMilestones = goal.milestones.length
  // Auto-derive progress from milestones when they exist; fall back to manual value
  const effectiveProgress = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : goal.progress

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
      >
        {/* Priority bar */}
        <div
          className="h-0.5"
          style={{ background: PRIORITY_COLORS[goal.priority] }}
        />

        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start gap-3">
            <Target size={16} style={{ color: '#d4af37', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white">{goal.title}</h3>
                <StatusBadge status={goal.status} />
                <span className="text-xs text-slate-500">Q{goal.quarter} {goal.year}</span>
              </div>
              {goal.description && (
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{goal.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                <Pencil size={12} className="text-slate-400" />
              </button>
              <button onClick={() => { if(confirm('Delete this goal?')) removeGoal(goal.id) }} className="p-1.5 rounded hover:bg-red-900/30 transition-colors">
                <Trash2 size={12} className="text-red-400" />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                {expanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Progress
                {totalMilestones > 0 && (
                  <span className="ml-1.5 text-slate-600">· {completedMilestones}/{totalMilestones} milestones</span>
                )}
              </span>
              <span className="text-xs font-bold" style={{ color: '#d4af37' }}>{effectiveProgress}%</span>
            </div>
            <ProgressBar value={effectiveProgress} />
          </div>
          {linkedTasks.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Square size={10} className="text-blue-400" />
              <span className="text-xs" style={{ color: '#60a5fa' }}>
                {completedLinkedTasks}/{linkedTasks.length} linked task{linkedTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Expanded milestones */}
          {expanded && (
            <div className="mt-3 pl-2 border-l space-y-0.5" style={{ borderColor: '#1e2d40' }}>
              {goal.milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  onToggle={() => {
                    const willBeCompleted = !m.completed
                    const newCompleted = completedMilestones + (willBeCompleted ? 1 : -1)
                    editMilestone(goal.id, m.id, { completed: willBeCompleted })
                    editGoal(goal.id, { progress: Math.round((newCompleted / totalMilestones) * 100) })
                  }}
                  onDelete={() => removeMilestone(goal.id, m.id)}
                />
              ))}

              {showMilestoneInput ? (
                <div className="flex gap-2 mt-2">
                  <input
                    autoFocus
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newMilestone.trim()) {
                        addMilestoneToGoal(goal.id, { title: newMilestone.trim(), completed: false })
                        setNewMilestone('')
                        setShowMilestoneInput(false)
                      }
                      if (e.key === 'Escape') setShowMilestoneInput(false)
                    }}
                    placeholder="Milestone title..."
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                    style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                  />
                </div>
              ) : (
                <button
                  className="mt-2 flex items-center gap-1 text-xs text-slate-600 hover:text-yellow-400 transition-colors"
                  onClick={() => setShowMilestoneInput(true)}
                >
                  <Plus size={10} /> Add milestone
                </button>
              )}
            </div>
          )}
          {/* Expanded linked tasks */}
          {expanded && linkedTasks.length > 0 && (
            <div className="mt-3 pl-2 border-l space-y-0.5" style={{ borderColor: '#1e3a5f' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#60a5fa' }}>Linked Tasks</p>
              {linkedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-0.5">
                  <button onClick={() => toggleTask(t.id)}>
                    {t.completed
                      ? <CheckSquare size={13} className="text-green-400" />
                      : <Square size={13} className="text-slate-500" />}
                  </button>
                  <span className={`flex-1 text-xs ${t.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}        </div>
      </div>

      {editing && (
        <GoalModal
          initial={goal}
          onSave={(data) => editGoal(goal.id, data)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

// ─── Pareto 80/20 Insight ─────────────────────────────────────────────────────

function ParetoInsight({ goals }: { goals: Goal[] }) {
  const [open, setOpen] = useState(true)
  if (goals.length === 0) return null

  const vitalFew = goals.filter((g) => g.priority === 'critical' || g.priority === 'high')
  const trivialMany = goals.filter((g) => g.priority === 'medium' || g.priority === 'low')
  const vitalPct = Math.round((vitalFew.length / goals.length) * 100)

  return (
    <div
      className="rounded-xl mb-6 overflow-hidden"
      style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-widest uppercase" style={{ color: '#d4af37' }}>
            80/20 Pareto Insight
          </span>
          <span className="text-xs text-slate-500">
            — {vitalFew.length} vital goal{vitalFew.length !== 1 ? 's' : ''} ({vitalPct}%) drive most of your impact
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Visual bar */}
          <div className="flex rounded-lg overflow-hidden h-5 text-xs font-bold">
            <div
              className="flex items-center justify-center transition-all"
              style={{
                width: `${vitalPct || 20}%`,
                background: '#d4af37',
                color: '#111827',
                minWidth: '2rem',
              }}
            >
              {vitalPct}%
            </div>
            <div
              className="flex items-center justify-center flex-1 text-slate-500"
              style={{ background: '#1e2d40' }}
            >
              {100 - vitalPct}%
            </div>
          </div>

          {/* Two-column detail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#d4af37' }}>
                Vital Few — High Impact
              </p>
              {vitalFew.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No critical/high priority goals yet</p>
              ) : (
                <ul className="space-y-1">
                  {vitalFew.slice(0, 6).map((g) => (
                    <li key={g.id} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span style={{ color: PRIORITY_COLORS[g.priority] }}>●</span>
                      <span className="truncate">{g.title}</span>
                    </li>
                  ))}
                  {vitalFew.length > 6 && (
                    <li className="text-xs text-slate-600">+{vitalFew.length - 6} more</li>
                  )}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">
                Trivial Many — Supporting
              </p>
              {trivialMany.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No medium/low priority goals</p>
              ) : (
                <ul className="space-y-1">
                  {trivialMany.slice(0, 6).map((g) => (
                    <li key={g.id} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span>●</span>
                      <span className="truncate">{g.title}</span>
                    </li>
                  ))}
                  {trivialMany.length > 6 && (
                    <li className="text-xs text-slate-600">+{trivialMany.length - 6} more</li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-600 italic border-t pt-2" style={{ borderColor: '#1e2d40' }}>
            Focus your energy on the <strong className="text-yellow-500">vital few</strong> — they produce 80% of results. Delegate or defer the rest.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Goals page ───────────────────────────────────────────────────────────────

export function GoalsPage() {
  const { store, addGoal, currentYear } = usePlanner()
  const [showModal, setShowModal] = useState(false)
  const [filterQ, setFilterQ] = useState<number | 'all'>('all')

  const goals = store.goals.filter(
    (g) => g.year === currentYear && (filterQ === 'all' || g.quarter === filterQ)
  )

  const byQuarter = [1,2,3,4].map((q) => ({
    q,
    goals: goals.filter((g) => g.quarter === q),
  }))

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
        <div>
          <h2 className="text-xl font-black tracking-widest uppercase" style={{ color: '#d4af37' }}>
            Goals & Milestones
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{currentYear} · {store.goals.filter(g=>g.year===currentYear).length} goals</p>
        </div>
        <div className="flex-1" />

        {/* Quarter filter */}
        <div className="flex gap-1">
          {(['all',1,2,3,4] as const).map((q) => (
            <button
              key={q}
              onClick={() => setFilterQ(q)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={
                filterQ === q
                  ? { background: '#d4af37', color: '#111827' }
                  : { color: '#94a3b8', border: '1px solid #243447' }
              }
            >
              {q === 'all' ? 'All' : `Q${q}`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#d4af37', color: '#111827' }}
        >
          <Plus size={14} /> New Goal
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 md:mb-6">
        {([
          { label: 'Total', value: goals.length, color: '#d4af37' },
          { label: 'In Progress', value: goals.filter(g=>g.status==='in-progress').length, color: '#60a5fa' },
          { label: 'Completed', value: goals.filter(g=>g.status==='completed').length, color: '#4ade80' },
          { label: 'Avg Progress', value: goals.length ? Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length)+'%' : '—', color: '#d4af37' },
        ]).map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
            <div className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 80/20 Pareto insight */}
      <ParetoInsight goals={goals} />

      {/* Goals by quarter */}
      <div className="space-y-6 overflow-auto flex-1">
        {(filterQ === 'all' ? byQuarter : byQuarter.filter((b) => b.q === filterQ)).map(({ q, goals: qGoals }) => (
          <div key={q}>
            <div className="flex items-center gap-2 mb-3">
              <Flag size={14} style={{ color: '#d4af37' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Q{q} Goals</h3>
              <span className="text-xs text-slate-600">({qGoals.length})</span>
            </div>
            {qGoals.length === 0 ? (
              <p className="text-xs text-slate-600 pl-6">No goals for Q{q}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {qGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
              </div>
            )}
          </div>
        ))}

        {goals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 font-semibold">No goals yet</p>
            <p className="text-xs text-slate-600 mt-1">Click "New Goal" to get started</p>
          </div>
        )}
      </div>

      {showModal && (
        <GoalModal
          onSave={(data) => addGoal({ ...data, userId: undefined })}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
