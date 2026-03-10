import { useState } from 'react'
import { Plus, CheckSquare, Square, Trash2, Flag, Calendar, Clock, X, Pencil, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { usePlanner } from '../context/PlannerContext'
import { useAuth } from '../context/AuthContext'
import type { Task, PriorityLevel, TaskPeriod } from '../types'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../types'

// ─── Task modal ───────────────────────────────────────────────────────────────

function TaskModal({
  initial,
  defaultDate,
  onSave,
  onClose,
}: {
  initial?: Partial<Task>
  defaultDate?: string
  onSave: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
}) {
  const { currentYear, store } = usePlanner()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [priority, setPriority] = useState<PriorityLevel>(initial?.priority ?? 'medium')
  const [period, setPeriod] = useState<TaskPeriod>(initial?.period ?? 'day')
  const [goalId, setGoalId] = useState(initial?.goalId ?? '')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col"
        style={{ background: '#111827', border: '1px solid #1e2d40', maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #1e2d40' }}>
          <h2 className="font-bold text-lg" style={{ color: '#d4af37' }}>
            {initial?.id ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
          style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TaskPeriod)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>

        {period === 'day' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0', colorScheme: 'dark' }}
            />
          </div>
        )}

        {store.goals.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Link to Goal (optional)</label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            >
              <option value="">No goal</option>
              {store.goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
        )}

        </div>
        {/* Sticky footer */}
        <div
          className="shrink-0 flex gap-2 justify-end px-6 py-4"
          style={{ borderTop: '1px solid #1e2d40', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg">Cancel</button>
          <button
            onClick={() => {
              if (!title.trim()) return
              onSave({
                title: title.trim(),
                description: description.trim() || undefined,
                date: period === 'day' ? date : undefined,
                period,
                year: date ? new Date(date).getFullYear() : currentYear,
                priority,
                completed: initial?.completed ?? false,
                tags: [],
                goalId: goalId || undefined,
              })
              onClose()
            }}
            className="px-5 py-2 rounded-lg text-sm font-bold"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task item ────────────────────────────────────────────────────────────────

function TaskItem({ task }: { task: Task }) {
  const { toggleTask, removeTask, editTask, store } = usePlanner()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)

  // A task is editable by the current user if it has no owner (legacy) or they own it
  const canEdit = !task.userId || task.userId === user?.id

  return (
    <>
      <div
        className={`flex items-start gap-3 p-3 rounded-xl group transition-all ${
          task.completed ? 'opacity-50' : ''
        }`}
        style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
      >
        <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
          {task.completed
            ? <CheckSquare size={16} className="text-green-400" />
            : <Square size={16} style={{ color: PRIORITY_COLORS[task.priority] }} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
          )}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <span
              className="text-xs font-semibold"
              style={{ color: PRIORITY_COLORS[task.priority] }}
            >
              <Flag size={9} className="inline mr-1" />
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.date && (
              <span className="text-xs text-slate-500">
                <Calendar size={9} className="inline mr-1" />
                {task.date}
              </span>
            )}
            <span className="text-xs text-slate-600">
              <Clock size={9} className="inline mr-1" />
              {task.period}
            </span>
            {task.goalId && (() => {
              const g = store.goals.find((gg) => gg.id === task.goalId)
              return g ? (
                <span className="text-xs px-1.5 py-0.5 rounded max-w-30 truncate block" style={{ background: '#1e3a5f', color: '#60a5fa' }}>
                  {g.title}
                </span>
              ) : null
            })()}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canEdit ? (
            <>
              <button
                title="Edit task"
                className="p-1.5 rounded hover:bg-white/10"
                onClick={() => setEditing(true)}
              >
                <Pencil size={12} className="text-slate-400" />
              </button>
              <button
                title="Delete task"
                className="p-1.5 rounded hover:bg-red-900/30"
                onClick={() => { if (confirm('Delete task?')) removeTask(task.id) }}
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </>
          ) : (
            <span title="You cannot edit another user's task" className="p-1.5">
              <Lock size={12} className="text-slate-600" />
            </span>
          )}
        </div>
      </div>

      {editing && (
        <TaskModal
          initial={task}
          onSave={(data) => editTask(task.id, data)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

// ─── Tasks page ───────────────────────────────────────────────────────────────

export function TasksPage() {
  const { store, addTask, currentYear } = usePlanner()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')

  const allTasks = store.tasks.filter((t) => t.year === currentYear)

  const filtered = allTasks.filter((t) => {
    const statusOk = filter === 'all' || (filter === 'active' ? !t.completed : t.completed)
    const prioOk = priorityFilter === 'all' || t.priority === priorityFilter
    return statusOk && prioOk
  })

  const sorted = [...filtered].sort((a, b) => {
    const po: Record<PriorityLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return po[a.priority] - po[b.priority]
  })

  // Group by period
  const dayTasks   = sorted.filter((t) => t.period === 'day')
  const weekTasks  = sorted.filter((t) => t.period === 'week')
  const monthTasks = sorted.filter((t) => t.period === 'month')

  const completedCount = allTasks.filter((t) => t.completed).length

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 overflow-auto" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
        <div>
          <h2 className="text-xl font-black tracking-widest uppercase" style={{ color: '#d4af37' }}>
            Task Lists
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentYear} · {completedCount}/{allTasks.length} completed
          </p>
        </div>
        <div className="flex-1" />

        <div className="flex gap-1">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize"
              style={filter === f ? { background: '#d4af37', color: '#111827' } : { color: '#94a3b8', border: '1px solid #243447' }}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#d4af37', color: '#111827' }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Priority filter */}
      <div className="flex gap-2 mb-4 md:mb-5 flex-wrap">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize"
            style={
              priorityFilter === p
                ? { background: p === 'all' ? '#374151' : PRIORITY_COLORS[p as PriorityLevel], color: '#fff' }
                : { color: '#94a3b8', border: '1px solid #243447' }
            }
          >
            {p === 'all' ? 'All priorities' : PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {dayTasks.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <Calendar size={12} /> Day Tasks ({dayTasks.length})
            </h3>
            <div className="space-y-2">{dayTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
          </section>
        )}
        {weekTasks.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <Clock size={12} /> Week Tasks ({weekTasks.length})
            </h3>
            <div className="space-y-2">{weekTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
          </section>
        )}
        {monthTasks.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <Flag size={12} /> Month Tasks ({monthTasks.length})
            </h3>
            <div className="space-y-2">{monthTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
          </section>
        )}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 font-semibold">No tasks</p>
            <p className="text-xs text-slate-600 mt-1">Add a task to get started</p>
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          onSave={(data) => addTask(data)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
