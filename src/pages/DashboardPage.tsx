import { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addDays } from 'date-fns'
import { Target, CheckSquare, CalendarDays, TrendingUp, Layers, Star, Zap, Calendar, ArrowRight } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import { GOAL_STATUS_LABELS, getCategoryStyle } from '../types'
import type { GoalStatus, PriorityLevel } from '../types'
import { useNavigate } from 'react-router-dom'

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}18` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-xs font-semibold text-white mt-1">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Mini progress bar ────────────────────────────────────────────────────────

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d40' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  )
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  'not-started': '#94a3b8',
  'in-progress':  '#7eb8d4',
  completed:      '#5aaa8c',
  deferred:       '#f87171',
}

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: '#94a3b8', medium: '#7eb8d4', high: '#c8956a', critical: '#ef4444',
}

// ─── Empty state card ─────────────────────────────────────────────────────────

function EmptyPromptCard({ icon: Icon, title, body, cta, href }: {
  icon: React.ElementType
  title: string
  body: string
  cta: string
  href: string
}) {
  const navigate = useNavigate()
  return (
    <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.1)' }}>
        <Icon size={15} style={{ color: '#d4af37' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">{body}</p>
        <button onClick={() => navigate(href)}
          className="inline-flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ color: '#d4af37' }}>
          {cta} <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { store, currentYear, getEventsForDate } = usePlanner()

  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  // ── Today ───────────────────────────────────────────────────────────────────
  const todayEvents = useMemo(() => getEventsForDate(todayStr), [getEventsForDate, todayStr])

  const todayTasks = useMemo(
    () => store.tasks.filter((t) => t.date === todayStr && !t.completed),
    [store.tasks, todayStr],
  )

  // ── Goal stats ──────────────────────────────────────────────────────────────
  const yearGoals = useMemo(
    () => store.goals.filter((g) => g.year === currentYear),
    [store.goals, currentYear],
  )

  const goalStatusCounts = useMemo(() => {
    const counts: Record<GoalStatus, number> = { 'not-started': 0, 'in-progress': 0, completed: 0, deferred: 0 }
    yearGoals.forEach((g) => { counts[g.status] += 1 })
    return counts
  }, [yearGoals])

  const avgProgress = useMemo(() => {
    if (yearGoals.length === 0) return 0
    return Math.round(yearGoals.reduce((sum, g) => sum + g.progress, 0) / yearGoals.length)
  }, [yearGoals])

  // ── Task stats ──────────────────────────────────────────────────────────────
  const yearTasks = useMemo(
    () => store.tasks.filter((t) => t.year === currentYear),
    [store.tasks, currentYear],
  )
  const completedTasks = useMemo(() => yearTasks.filter((t) => t.completed).length, [yearTasks])

  // Tasks this week
  const weekStart = useMemo(() => {
    const d = new Date(today)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d
  }, [today])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const weekTasksAll = useMemo(
    () => yearTasks.filter((t) => {
      if (!t.date) return false
      return isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd })
    }),
    [yearTasks, weekStart, weekEnd],
  )
  const weekTasksDone = useMemo(() => weekTasksAll.filter((t) => t.completed).length, [weekTasksAll])

  // ── Events this month ───────────────────────────────────────────────────────
  const monthStart = useMemo(() => startOfMonth(today), [today])
  const monthEnd   = useMemo(() => endOfMonth(today),   [today])
  const monthEvents = useMemo(
    () => store.events.filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })
      } catch {
        return false
      }
    }),
    [store.events, monthStart, monthEnd],
  )

  // ── Next 7 days events ──────────────────────────────────────────────────────
  const next7Days = useMemo(() => {
    const days: Array<{ date: Date; dateStr: string; events: ReturnType<typeof getEventsForDate> }> = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i)
      const ds = format(d, 'yyyy-MM-dd')
      const evts = getEventsForDate(ds)
      days.push({ date: d, dateStr: ds, events: evts })
    }
    return days.filter((d) => d.events.length > 0)
  }, [today, getEventsForDate])

  const eventsByCat = useMemo(() => {
    const map = new Map<string, number>()
    monthEvents.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + 1))
    return [...map.entries()]
      .map(([catId, count]) => ({ catId, count }))
      .sort((a, b) => b.count - a.count)
  }, [monthEvents])

  const maxCatCount = useMemo(
    () => Math.max(...eventsByCat.map((c) => c.count), 1),
    [eventsByCat],
  )

  // ── Upcoming milestones ─────────────────────────────────────────────────────
  const upcomingMilestones = useMemo(() => {
    return store.goals
      .flatMap((g) => g.milestones.map((m) => ({ ...m, goalTitle: g.title, goalColor: g.color })))
      .filter((m) => !m.completed && m.dueDate && m.dueDate >= todayStr)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 6)
  }, [store.goals, todayStr])

  // ── Year progress ───────────────────────────────────────────────────────────
  const yearProgress = useMemo(() => {
    const start = new Date(currentYear, 0, 1).getTime()
    const end   = new Date(currentYear + 1, 0, 1).getTime()
    const now   = Math.min(today.getTime(), end)
    return Math.round(((now - start) / (end - start)) * 100)
  }, [currentYear, today])

  const monthName = format(today, 'MMMM')
  const yearTheme = store.yearTheme

  return (
    <div className="flex flex-col flex-1 overflow-auto p-4 md:p-6 space-y-5" style={{ background: '#0a0e1a' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(212,175,55,0.15)' }}>
          <Layers size={16} style={{ color: '#d4af37' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black tracking-wide" style={{ color: '#d4af37' }}>Dashboard</h2>
          <p className="text-xs text-slate-500">{currentYear} · {format(today, 'EEEE, d MMMM')}</p>
          {yearTheme && (
            <p className="text-xs mt-1 italic" style={{ color: '#7eb8d4' }}>"{yearTheme}"</p>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-[130px]">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Year {currentYear}</span>
              <span className="text-xs font-bold" style={{ color: '#d4af37' }}>{yearProgress}%</span>
            </div>
            <Bar pct={yearProgress} color="#d4af37" />
          </div>
        </div>
      </div>

      {/* ── Today at a glance ─────────────────────────────────────────────── */}
      <section className="rounded-xl p-4" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
          <Zap size={11} style={{ color: '#d4af37' }} /> Today — {format(today, 'EEEE, d MMMM')}
        </h3>
        {todayEvents.length === 0 && todayTasks.length === 0 ? (
          <p className="text-xs text-slate-600 py-2">Nothing scheduled today. A clear day.</p>
        ) : (
          <div className="space-y-1.5">
            {todayEvents.slice(0, 4).map((ev) => {
              const s = getCategoryStyle(ev.category, store.categories)
              return (
                <div key={ev.id} className="flex items-center gap-2 py-1">
                  <div className="w-1 h-4 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs font-semibold text-white truncate flex-1">{ev.title}</span>
                  {ev.startTime && <span className="text-xs text-slate-500 shrink-0">{ev.startTime}</span>}
                </div>
              )
            })}
            {todayEvents.length > 4 && (
              <p className="text-xs text-slate-500">+{todayEvents.length - 4} more events</p>
            )}
            {todayTasks.length > 0 && (
              <div className="pt-1.5 mt-1.5 flex items-center gap-2" style={{ borderTop: '1px solid #1e2d40' }}>
                <CheckSquare size={12} className="text-slate-500 shrink-0" />
                <span className="text-xs text-slate-400">{todayTasks.length} pending task{todayTasks.length === 1 ? '' : 's'} today</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Target} label="Goals this year" value={yearGoals.length}
          sub={`${goalStatusCounts.completed} completed`} color="#d4af37" />
        <StatCard icon={TrendingUp} label="Avg goal progress" value={`${avgProgress}%`}
          sub={`${goalStatusCounts['in-progress']} in progress`} color="#7eb8d4" />
        <StatCard icon={CheckSquare} label="Tasks this year" value={yearTasks.length}
          sub={`${completedTasks} completed`} color="#5aaa8c" />
        <StatCard icon={CalendarDays} label={`Events in ${monthName}`} value={monthEvents.length}
          sub={eventsByCat[0] ? `Most: ${store.categories.find(c => c.id === eventsByCat[0].catId)?.label ?? eventsByCat[0].catId}` : `${store.categories.length} categories`}
          color="#c8956a" />
      </div>

      {/* ── Next 7 days ───────────────────────────────────────────────────── */}
      {next7Days.length > 0 && (
        <section className="rounded-xl p-4" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Calendar size={11} style={{ color: '#d4af37' }} /> Next 7 Days
          </h3>
          <div className="space-y-1">
            {next7Days.slice(0, 7).map(({ date, dateStr, events }) => {
              const isToday = dateStr === todayStr
              return (
                <div key={dateStr} className="flex items-start gap-3 py-1">
                  <div className="w-12 shrink-0 text-right">
                    <p className="text-xs font-bold" style={{ color: isToday ? '#d4af37' : '#64748b' }}>
                      {isToday ? 'Today' : format(date, 'EEE')}
                    </p>
                    <p className="text-[10px]" style={{ color: isToday ? '#d4af37' : '#475569' }}>{format(date, 'd MMM')}</p>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5 pt-0.5">
                    {events.slice(0, 3).map((ev) => {
                      const s = getCategoryStyle(ev.category, store.categories)
                      return (
                        <span key={ev.id} className="text-xs px-1.5 py-0.5 rounded font-medium truncate max-w-[160px]"
                          style={{ background: s.bgColor, color: s.color, borderLeft: `2px solid ${s.color}` }}>
                          {ev.title}
                        </span>
                      )
                    })}
                    {events.length > 3 && (
                      <span className="text-xs text-slate-500">+{events.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Goals by status */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Goals by Status · {currentYear}
          </h3>
          {yearGoals.length === 0 ? (
            <EmptyPromptCard icon={Target} title="No goals set for this year"
              body="Add your first goal to track progress toward what matters most."
              cta="Set a goal" href="/goals" />
          ) : (
            <div className="space-y-2.5">
              {(Object.entries(goalStatusCounts) as [GoalStatus, number][]).map(([status, count]) => {
                const pct = yearGoals.length > 0 ? (count / yearGoals.length) * 100 : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold" style={{ color: STATUS_COLORS[status] }}>
                        {GOAL_STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-slate-400">{count} <span className="text-slate-600">({Math.round(pct)}%)</span></span>
                    </div>
                    <Bar pct={pct} color={STATUS_COLORS[status]} />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Task completion */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Task Completion</h3>
          {yearTasks.length === 0 ? (
            <EmptyPromptCard icon={CheckSquare} title="No tasks yet"
              body="Add tasks to track daily and weekly execution."
              cta="Add a task" href="/tasks" />
          ) : (
            <>
              <div className="space-y-3">
                {[
                  { label: 'This week', done: weekTasksDone, total: weekTasksAll.length, color: '#d4af37' },
                  { label: `${currentYear} overall`, done: completedTasks, total: yearTasks.length, color: '#5aaa8c' },
                ].map(({ label, done, total, color }) => {
                  const pct = total > 0 ? (done / total) * 100 : 0
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-white">{label}</span>
                        <span className="text-xs text-slate-400">
                          {done}/{total}
                          {total > 0 && <span className="text-slate-600 ml-1">({Math.round(pct)}%)</span>}
                        </span>
                      </div>
                      <Bar pct={pct} color={color} />
                    </div>
                  )
                })}
              </div>
              {yearTasks.length > 0 && (
                <div className="pt-3" style={{ borderTop: '1px solid #1e2d40' }}>
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">By priority</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
                      const pts = yearTasks.filter((t) => t.priority === p)
                      const done = pts.filter((t) => t.completed).length
                      return (
                        <div key={p} className="rounded-lg p-2 text-center" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
                          <p className="text-xs font-bold" style={{ color: PRIORITY_COLORS[p] }}>{done}/{pts.length}</p>
                          <p className="text-[10px] text-slate-600 capitalize mt-0.5">{p}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Events by category this month */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Events by Category · {monthName}
          </h3>
          {eventsByCat.length === 0 ? (
            <p className="text-xs text-slate-600 py-2 text-center">No events in {monthName} yet.</p>
          ) : (
            <div className="space-y-2">
              {eventsByCat.map(({ catId, count }) => {
                const style = getCategoryStyle(catId, store.categories)
                const cat = store.categories.find((c) => c.id === catId)
                return (
                  <div key={catId}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold" style={{ color: style.color }}>{cat?.label ?? catId}</span>
                      <span className="text-xs text-slate-400">{count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d40' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxCatCount) * 100}%`, background: style.color, opacity: 0.75 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Upcoming milestones */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Star size={11} style={{ color: '#d4af37' }} /> Upcoming Milestones
          </h3>
          {upcomingMilestones.length === 0 ? (
            <EmptyPromptCard icon={Star} title="No milestones set"
              body="Add milestones to your goals to track key outcomes and dates."
              cta="Add milestones" href="/goals" />
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map((m) => {
                const daysAway = m.dueDate
                  ? Math.round((parseISO(m.dueDate).getTime() - today.getTime()) / 86_400_000)
                  : null
                const urgent = daysAway !== null && daysAway <= 7
                return (
                  <div key={m.id} className="rounded-lg p-2.5 flex items-start gap-2"
                    style={{ background: '#111827', border: `1px solid ${urgent ? 'rgba(200,149,106,0.3)' : '#1e2d40'}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{m.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{m.goalTitle}</p>
                    </div>
                    {m.dueDate && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold" style={{ color: urgent ? '#c8956a' : '#94a3b8' }}>
                          {format(parseISO(m.dueDate), 'MMM d')}
                        </p>
                        {daysAway !== null && (
                          <p className="text-[10px]" style={{ color: urgent ? '#c8956a' : '#64748b' }}>
                            {daysAway === 0 ? 'today' : `${daysAway}d`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


