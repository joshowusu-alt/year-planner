import { useMemo, type ElementType, type ReactNode } from 'react'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addDays } from 'date-fns'
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckSquare,
  Layers,
  Lightbulb,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlanner } from '../context/PlannerContext'
import { GOAL_STATUS_LABELS, getCategoryStyle } from '../types'
import type { GoalStatus, PriorityLevel } from '../types'

const CARD_STYLE = { background: '#0d1224', border: '1px solid #1e2d40' }
const INNER_CARD_STYLE = { background: '#111827', border: '1px solid #1e2d40' }

const STATUS_COLORS: Record<GoalStatus, string> = {
  'not-started': '#94a3b8',
  'in-progress': '#7f9bb8',
  completed: '#5aaa8c',
  deferred: '#c7797d',
}

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: '#94a3b8',
  medium: '#7f9bb8',
  high: '#c8956a',
  critical: '#c7797d',
}

function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl p-4 min-w-0 ${className}`} style={CARD_STYLE}>
      {children}
    </section>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: ElementType
  children: ReactNode
}) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
      {Icon && <Icon size={11} style={{ color: '#d4af37' }} />}
      {children}
    </h3>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d40' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ElementType
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <div className="rounded-xl p-3.5 flex items-start gap-3 min-w-0" style={CARD_STYLE}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-xs font-semibold text-white mt-1 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function EmptyPromptCard({
  icon: Icon,
  title,
  body,
  cta,
  href,
}: {
  icon: ElementType
  title: string
  body: string
  cta: string
  href: string
}) {
  const navigate = useNavigate()
  return (
    <div className="rounded-xl p-3.5 flex items-start gap-3" style={INNER_CARD_STYLE}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.1)' }}>
        <Icon size={15} style={{ color: '#d4af37' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">{body}</p>
        <button
          onClick={() => navigate(href)}
          className="inline-flex min-h-8 items-center gap-1 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ color: '#d4af37' }}
        >
          {cta} <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}

function PlanningSetupCard() {
  const navigate = useNavigate()
  const actions = [
    { label: 'Set a goal', href: '/goals', icon: Target },
    { label: 'Add a task', href: '/tasks', icon: CheckSquare },
    { label: 'Add milestone', href: '/goals', icon: Star },
  ]

  return (
    <SectionCard>
      <SectionTitle icon={Layers}>Planning Setup</SectionTitle>
      <div className="rounded-xl p-3.5" style={INNER_CARD_STYLE}>
        <p className="text-sm font-semibold text-white">Planning setup incomplete</p>
        <p className="text-xs text-slate-500 mt-1">
          Set goals, tasks, and milestones to connect calendar activity to outcomes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          {actions.map(({ label, href, icon: Icon }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className="min-h-10 rounded-lg px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors hover:bg-white/5"
              style={{ color: '#d4af37', border: '1px solid #2c3d52' }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

export function DashboardPage() {
  const { store, currentYear, getEventsForDate } = usePlanner()

  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  const todayEvents = useMemo(() => getEventsForDate(todayStr), [getEventsForDate, todayStr])
  const todayTasks = useMemo(
    () => store.tasks.filter((task) => task.date === todayStr && !task.completed),
    [store.tasks, todayStr],
  )

  const yearGoals = useMemo(
    () => store.goals.filter((goal) => goal.year === currentYear),
    [store.goals, currentYear],
  )

  const allMilestones = useMemo(
    () => store.goals.flatMap((goal) => goal.milestones.map((milestone) => ({ ...milestone, goalTitle: goal.title, goalColor: goal.color }))),
    [store.goals],
  )

  const goalStatusCounts = useMemo(() => {
    const counts: Record<GoalStatus, number> = { 'not-started': 0, 'in-progress': 0, completed: 0, deferred: 0 }
    yearGoals.forEach((goal) => { counts[goal.status] += 1 })
    return counts
  }, [yearGoals])

  const avgProgress = useMemo(() => {
    if (yearGoals.length === 0) return 0
    return Math.round(yearGoals.reduce((sum, goal) => sum + goal.progress, 0) / yearGoals.length)
  }, [yearGoals])

  const yearTasks = useMemo(
    () => store.tasks.filter((task) => task.year === currentYear),
    [store.tasks, currentYear],
  )
  const completedTasks = useMemo(() => yearTasks.filter((task) => task.completed).length, [yearTasks])
  const linkedTasks = useMemo(() => yearTasks.filter((task) => task.goalId).length, [yearTasks])

  const weekStart = useMemo(() => {
    const date = new Date(today)
    const day = date.getDay()
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
    return date
  }, [today])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const weekTasksAll = useMemo(
    () => yearTasks.filter((task) => {
      if (!task.date) return false
      return isWithinInterval(parseISO(task.date), { start: weekStart, end: weekEnd })
    }),
    [yearTasks, weekStart, weekEnd],
  )
  const weekTasksDone = useMemo(() => weekTasksAll.filter((task) => task.completed).length, [weekTasksAll])

  const monthStart = useMemo(() => startOfMonth(today), [today])
  const monthEnd = useMemo(() => endOfMonth(today), [today])
  const monthEvents = useMemo(
    () => store.events.filter((event) => {
      try {
        return isWithinInterval(parseISO(event.date), { start: monthStart, end: monthEnd })
      } catch {
        return false
      }
    }),
    [store.events, monthStart, monthEnd],
  )

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index)
      const dateStr = format(date, 'yyyy-MM-dd')
      return { date, dateStr, events: getEventsForDate(dateStr) }
    })
  }, [today, getEventsForDate])

  const populatedNext7Days = useMemo(
    () => next7Days.filter((day) => day.events.length > 0),
    [next7Days],
  )

  const next7Events = useMemo(
    () => next7Days.flatMap((day) => day.events),
    [next7Days],
  )

  const eventsByCat = useMemo(() => {
    const map = new Map<string, number>()
    monthEvents.forEach((event) => map.set(event.category, (map.get(event.category) ?? 0) + 1))
    return [...map.entries()]
      .map(([catId, count]) => ({ catId, count }))
      .sort((a, b) => b.count - a.count)
  }, [monthEvents])

  const next7EventsByCat = useMemo(() => {
    const map = new Map<string, number>()
    next7Events.forEach((event) => map.set(event.category, (map.get(event.category) ?? 0) + 1))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [next7Events])

  const maxCatCount = useMemo(
    () => Math.max(...eventsByCat.map((category) => category.count), 1),
    [eventsByCat],
  )

  const upcomingMilestones = useMemo(() => {
    return allMilestones
      .filter((milestone) => !milestone.completed && milestone.dueDate && milestone.dueDate >= todayStr)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 6)
  }, [allMilestones, todayStr])

  const yearProgress = useMemo(() => {
    const start = new Date(currentYear, 0, 1).getTime()
    const end = new Date(currentYear + 1, 0, 1).getTime()
    const now = Math.min(Math.max(today.getTime(), start), end)
    return Math.round(((now - start) / (end - start)) * 100)
  }, [currentYear, today])

  const topNext7Category = next7EventsByCat[0]
  const topMonthCategory = eventsByCat[0]
  const topCategoryId = topNext7Category?.[0] ?? topMonthCategory?.catId
  const topCategoryLabel = topCategoryId
    ? store.categories.find((category) => category.id === topCategoryId)?.label ?? topCategoryId
    : null

  const hasPlanningSetup = yearGoals.length > 0 || yearTasks.length > 0 || allMilestones.length > 0
  const monthName = format(today, 'MMMM')
  const yearTheme = store.yearTheme

  const insightText = useMemo(() => {
    if (next7Events.length > 0 && topCategoryLabel) {
      return `You have ${next7Events.length} event${next7Events.length === 1 ? '' : 's'} in the next 7 days. Most activity is under ${topCategoryLabel}.`
    }
    if (monthEvents.length > 0 && topCategoryLabel) {
      return `You have scheduled events this month. Most activity is under ${topCategoryLabel}.`
    }
    return 'Your calendar is clear over the next 7 days.'
  }, [monthEvents.length, next7Events.length, topCategoryLabel])

  const insightSupport = useMemo(() => {
    if (next7Events.length > 0 && yearGoals.length === 0 && yearTasks.length === 0) {
      return 'You have scheduled events, but no goals or tasks linked yet.'
    }
    if (!hasPlanningSetup) return 'Set goals and milestones to connect activity to outcomes.'
    if (yearGoals.length > 0 && linkedTasks === 0) return 'Add linked tasks so your execution ladder points back to goals.'
    if (upcomingMilestones.length > 0) return `${upcomingMilestones.length} upcoming milestone${upcomingMilestones.length === 1 ? '' : 's'} need attention.`
    return 'Planning structure is in place. Keep the week aligned to the highest-value outcomes.'
  }, [hasPlanningSetup, linkedTasks, next7Events.length, upcomingMilestones.length, yearGoals.length, yearTasks.length])

  const Header = (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(212,175,55,0.15)' }}>
        <Layers size={16} style={{ color: '#d4af37' }} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-black tracking-wide" style={{ color: '#d4af37' }}>Dashboard</h2>
        <p className="text-xs text-slate-500">{currentYear} - {format(today, 'EEEE, d MMMM')}</p>
        {yearTheme && <p className="text-xs mt-1 italic truncate" style={{ color: '#7f9bb8' }}>"{yearTheme}"</p>}
      </div>
      <div className="w-[132px] sm:w-[180px] shrink-0">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Year {currentYear}</span>
          <span className="text-xs font-bold" style={{ color: '#d4af37' }}>{yearProgress}%</span>
        </div>
        <Bar pct={yearProgress} color="#d4af37" />
      </div>
    </div>
  )

  const TodayCard = (
    <SectionCard>
      <SectionTitle icon={Zap}>Today - {format(today, 'EEEE, d MMMM')}</SectionTitle>
      {todayEvents.length === 0 && todayTasks.length === 0 ? (
        <p className="text-xs text-slate-600 py-1">Nothing scheduled today. A clear day.</p>
      ) : (
        <div className="space-y-1.5">
          {todayEvents.slice(0, 4).map((event) => {
            const style = getCategoryStyle(event.category, store.categories)
            return (
              <div key={event.id} className="flex items-center gap-2 py-1 min-w-0">
                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: style.color }} />
                <span className="text-xs font-semibold text-white truncate flex-1">{event.title}</span>
                {event.startTime && <span className="text-xs text-slate-500 shrink-0">{event.startTime}</span>}
              </div>
            )
          })}
          {todayEvents.length > 4 && <p className="text-xs text-slate-500">+{todayEvents.length - 4} more events</p>}
          {todayTasks.length > 0 && (
            <div className="pt-1.5 mt-1.5 flex items-center gap-2" style={{ borderTop: '1px solid #1e2d40' }}>
              <CheckSquare size={12} className="text-slate-500 shrink-0" />
              <span className="text-xs text-slate-400">{todayTasks.length} pending task{todayTasks.length === 1 ? '' : 's'} today</span>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )

  const Next7DaysCard = (
    <SectionCard>
      <SectionTitle icon={Calendar}>Next 7 Days</SectionTitle>
      {populatedNext7Days.length === 0 ? (
        <p className="text-xs text-slate-600 py-1">No scheduled events in the next week.</p>
      ) : (
        <div className="space-y-1">
          {populatedNext7Days.map(({ date, dateStr, events }) => {
            const isCurrentDay = dateStr === todayStr
            return (
              <div key={dateStr} className="flex items-start gap-3 py-1 min-w-0">
                <div className="w-12 shrink-0 text-right">
                  <p className="text-xs font-bold" style={{ color: isCurrentDay ? '#d4af37' : '#64748b' }}>
                    {isCurrentDay ? 'Today' : format(date, 'EEE')}
                  </p>
                  <p className="text-[10px]" style={{ color: isCurrentDay ? '#d4af37' : '#475569' }}>{format(date, 'd MMM')}</p>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 pt-0.5 min-w-0">
                  {events.slice(0, 3).map((event) => {
                    const style = getCategoryStyle(event.category, store.categories)
                    return (
                      <span
                        key={event.id}
                        className="text-xs px-1.5 py-0.5 rounded font-medium truncate max-w-full sm:max-w-[180px]"
                        style={{ background: style.bgColor, color: style.color, borderLeft: `2px solid ${style.color}` }}
                      >
                        {event.title}
                      </span>
                    )
                  })}
                  {events.length > 3 && <span className="text-xs text-slate-500">+{events.length - 3}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )

  const ExecutiveInsightCard = (
    <SectionCard>
      <SectionTitle icon={Lightbulb}>Executive Insight</SectionTitle>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.1)' }}>
          <Lightbulb size={16} style={{ color: '#d4af37' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{insightText}</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{insightSupport}</p>
        </div>
      </div>
    </SectionCard>
  )

  const KeyMetrics = (
    <div>
      <SectionTitle>Key Metrics</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Target} label="Goals this year" value={yearGoals.length} sub={`${goalStatusCounts.completed} completed`} color="#d4af37" />
        <StatCard icon={TrendingUp} label="Avg progress" value={`${avgProgress}%`} sub={`${goalStatusCounts['in-progress']} in progress`} color="#7f9bb8" />
        <StatCard icon={CheckSquare} label="Tasks this year" value={yearTasks.length} sub={`${completedTasks} completed`} color="#5aaa8c" />
        <StatCard
          icon={CalendarDays}
          label={`Events in ${monthName}`}
          value={monthEvents.length}
          sub={topMonthCategory ? `Most: ${store.categories.find((category) => category.id === topMonthCategory.catId)?.label ?? topMonthCategory.catId}` : `${store.categories.length} categories`}
          color="#c8956a"
        />
      </div>
    </div>
  )

  const EventsByCategory = (
    <SectionCard>
      <SectionTitle>Events by Category - {monthName}</SectionTitle>
      {eventsByCat.length === 0 ? (
        <p className="text-xs text-slate-600 py-1 text-center">No events in {monthName} yet.</p>
      ) : (
        <div className="space-y-2">
          {eventsByCat.map(({ catId, count }) => {
            const style = getCategoryStyle(catId, store.categories)
            const category = store.categories.find((item) => item.id === catId)
            return (
              <div key={catId}>
                <div className="flex justify-between items-center gap-3 mb-1">
                  <span className="text-xs font-semibold truncate" style={{ color: style.color }}>{category?.label ?? catId}</span>
                  <span className="text-xs text-slate-400 shrink-0">{count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d40' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(count / maxCatCount) * 100}%`, background: style.color, opacity: 0.75 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )

  const GoalStatusCard = (
    <SectionCard className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Goals by Status - {currentYear}</h3>
      {yearGoals.length === 0 ? (
        <EmptyPromptCard icon={Target} title="No goals set for this year" body="Add your first goal to track progress toward what matters most." cta="Set a goal" href="/goals" />
      ) : (
        <div className="space-y-2.5">
          {(Object.entries(goalStatusCounts) as [GoalStatus, number][]).map(([status, count]) => {
            const pct = yearGoals.length > 0 ? (count / yearGoals.length) * 100 : 0
            return (
              <div key={status}>
                <div className="flex justify-between items-center gap-3 mb-1">
                  <span className="text-xs font-semibold" style={{ color: STATUS_COLORS[status] }}>{GOAL_STATUS_LABELS[status]}</span>
                  <span className="text-xs text-slate-400">{count} <span className="text-slate-600">({Math.round(pct)}%)</span></span>
                </div>
                <Bar pct={pct} color={STATUS_COLORS[status]} />
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )

  const TaskCompletionCard = (
    <SectionCard className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Task Completion</h3>
      {yearTasks.length === 0 ? (
        <EmptyPromptCard icon={CheckSquare} title="No tasks yet" body="Add tasks to track daily and weekly execution." cta="Add a task" href="/tasks" />
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
          <div className="pt-3" style={{ borderTop: '1px solid #1e2d40' }}>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">By priority</p>
            <div className="grid grid-cols-4 gap-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((priority) => {
                const tasks = yearTasks.filter((task) => task.priority === priority)
                const done = tasks.filter((task) => task.completed).length
                return (
                  <div key={priority} className="rounded-lg p-2 text-center min-w-0" style={INNER_CARD_STYLE}>
                    <p className="text-xs font-bold" style={{ color: PRIORITY_COLORS[priority] }}>{done}/{tasks.length}</p>
                    <p className="text-[10px] text-slate-600 capitalize mt-0.5 truncate">{priority}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </SectionCard>
  )

  const MilestonesCard = (
    <SectionCard className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
        <Star size={11} style={{ color: '#d4af37' }} /> Upcoming Milestones
      </h3>
      {upcomingMilestones.length === 0 ? (
        <EmptyPromptCard icon={Star} title="No milestones set" body="Add milestones to your goals to track key outcomes and dates." cta="Add milestone" href="/goals" />
      ) : (
        <div className="space-y-2">
          {upcomingMilestones.map((milestone) => {
            const daysAway = milestone.dueDate
              ? Math.round((parseISO(milestone.dueDate).getTime() - today.getTime()) / 86_400_000)
              : null
            const urgent = daysAway !== null && daysAway <= 7
            return (
              <div key={milestone.id} className="rounded-lg p-2.5 flex items-start gap-2 min-w-0" style={{ ...INNER_CARD_STYLE, border: `1px solid ${urgent ? 'rgba(200,149,106,0.3)' : '#1e2d40'}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{milestone.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{milestone.goalTitle}</p>
                </div>
                {milestone.dueDate && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold" style={{ color: urgent ? '#c8956a' : '#94a3b8' }}>{format(parseISO(milestone.dueDate), 'MMM d')}</p>
                    {daysAway !== null && <p className="text-[10px]" style={{ color: urgent ? '#c8956a' : '#64748b' }}>{daysAway === 0 ? 'today' : `${daysAway}d`}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )

  const PlanningDetails = hasPlanningSetup ? (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {GoalStatusCard}
      {TaskCompletionCard}
      {MilestonesCard}
    </div>
  ) : (
    <PlanningSetupCard />
  )

  return (
    <div className="flex flex-col flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 space-y-5 min-w-0" style={{ background: '#0a0e1a' }}>
      {Header}

      <div className="lg:hidden space-y-5">
        {TodayCard}
        {Next7DaysCard}
        {ExecutiveInsightCard}
        {KeyMetrics}
        {EventsByCategory}
        {PlanningDetails}
      </div>

      <div className="hidden lg:grid grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {TodayCard}
          {Next7DaysCard}
        </div>
        <div className="space-y-5 min-w-0">
          {KeyMetrics}
          {ExecutiveInsightCard}
        </div>
      </div>

      <div className="hidden lg:grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-5 items-start">
        {EventsByCategory}
        <div className="min-w-0">{PlanningDetails}</div>
      </div>
    </div>
  )
}
