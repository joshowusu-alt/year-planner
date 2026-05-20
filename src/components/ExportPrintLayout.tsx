import { useLayoutEffect, type CSSProperties } from 'react'
import { format } from 'date-fns'
import { usePlanner } from '../context/PlannerContext'
import type { EventCategoryDef, Goal } from '../types'
import { GOAL_STATUS_LABELS, MONTH_SHORT, PRIORITY_LABELS } from '../types'
import {
  buildYearIntelligence,
  defaultExportOptions,
  type ExportConfig,
  type MonthSummary,
  type PrintEvent,
  type QuarterSummary,
  type YearIntelligence,
} from '../lib/exportIntelligence'

const NAVY = '#0a0e1a'
const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#e2e8f0'

interface Props {
  year: number
  months: number[]
  mode?: ExportConfig['mode']
  options?: Partial<ExportConfig['options']>
}

function page(after: CSSProperties['pageBreakAfter'] = 'always'): CSSProperties {
  return {
    pageBreakAfter: after,
    breakAfter: after === 'always' ? 'page' : 'auto',
    minHeight: '186mm',
    padding: '10mm',
    background: '#fff',
    color: INK,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }
}

function Header({ title, year, accent }: { title: string; year: number; accent: string }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1.5px solid ${accent}`, paddingBottom: 5 }}>
      <strong style={{ fontSize: 7.5, color: accent, letterSpacing: '0.18em' }}>STRATUM</strong>
      <span style={{ color: MUTED, fontSize: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title} · {year}</span>
    </header>
  )
}

function Footer({ pageName, accent }: { pageName: string; accent: string }) {
  return (
    <footer style={{ marginTop: 'auto', paddingTop: 5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 5.8, color: accent, fontWeight: 800, letterSpacing: '0.12em' }}>STRATUM · EXECUTIVE PLANNING SYSTEM</span>
      <span style={{ fontSize: 5.8, color: '#94a3b8' }}>{pageName}</span>
    </footer>
  )
}

function Title({ label, children, accent }: { label: string; children: string; accent: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: accent, fontSize: 7, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
      <h2 style={{ margin: '3px 0 0', fontSize: 17, lineHeight: 1.1, color: NAVY, fontWeight: 900 }}>{children}</h2>
    </div>
  )
}

function Metric({ label, value, note, accent }: { label: string; value: string; note?: string; accent: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 10px', background: '#fff' }}>
      <div style={{ fontSize: 6.2, color: '#94a3b8', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: INK, marginTop: 3 }}>{value}</div>
      {note && <div style={{ fontSize: 6.7, color: MUTED, marginTop: 3, lineHeight: 1.35 }}>{note}</div>}
      <div style={{ height: 2, width: 32, borderRadius: 999, background: accent, marginTop: 7 }} />
    </div>
  )
}

function Legend({ items, show }: { items: Array<{ category: EventCategoryDef; count: number; share: number }>; show: boolean }) {
  if (!show) return null
  const display = items.length ? items : [{ category: { id: 'general', label: 'General', color: '#64748b', bgColor: '#f1f5f9' }, count: 0, share: 0 }]
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
      {display.map(({ category, count, share }) => (
        <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 6.5, color: INK, border: '1px solid #e5e7eb', borderRadius: 999, padding: '4px 7px', background: '#fff' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: category.color, display: 'inline-block' }} />
          <strong>{category.label}</strong>
          <span style={{ color: MUTED }}>{count} · {share}%</span>
        </div>
      ))}
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: 8, color: INK }}>{goal.title}</strong>
        <span style={{ fontSize: 6, color: goal.color ?? '#d4af37', fontWeight: 900, textTransform: 'uppercase' }}>{PRIORITY_LABELS[goal.priority]}</span>
      </div>
      <div style={{ fontSize: 6.5, color: MUTED, marginTop: 4 }}>{GOAL_STATUS_LABELS[goal.status]} · {goal.progress}% complete</div>
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${goal.progress}%`, height: '100%', background: goal.color ?? '#d4af37' }} />
      </div>
    </div>
  )
}

function StrategicGoals({ intel, accent, year }: { intel: YearIntelligence; accent: string; year: number }) {
  return (
    <section style={page('always')}>
      <Header title="Strategic Goals" year={year} accent={accent} />
      <Title label="Strategy Layer" accent={accent}>Strategic Goals & Vital Few</Title>
      {intel.goals.length === 0 ? (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: NAVY }}>Strategic goals not recorded yet.</h3>
          <p style={{ margin: '5px 0 12px', fontSize: 8, color: MUTED }}>Add goals to connect this planner to strategic outcomes.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['Q1 Focus', 'Q2 Focus', 'Q3 Focus', 'Q4 Focus', 'Vital Few', 'Supporting Priorities'].map((label) => (
              <div key={label} style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 10, minHeight: 34 }}>
                <strong style={{ fontSize: 7, color: INK }}>{label}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([1, 2, 3, 4] as const).map((quarter) => (
            <div key={quarter} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, breakInside: 'avoid' }}>
              <h3 style={{ margin: '0 0 8px', color: NAVY, fontSize: 11 }}>Q{quarter} Focus</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {intel.goalsByQuarter[quarter].slice(0, 4).map((goal) => <GoalCard key={goal.id} goal={goal} />)}
                {intel.goalsByQuarter[quarter].length === 0 && <span style={{ fontSize: 7, color: '#94a3b8' }}>No goals assigned.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Footer pageName="Strategy" accent={accent} />
    </section>
  )
}

function EventLine({ item }: { item: PrintEvent }) {
  return (
    <span style={{ display: 'block', borderLeft: `2px solid ${item.color}`, paddingLeft: 4, lineHeight: 1.25, color: INK, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      {item.timeLabel && <span style={{ color: MUTED, marginRight: 3 }}>{item.timeLabel}</span>}
      {item.shortTitle}
    </span>
  )
}

function MonthPlanner({ month, density }: { month: MonthSummary; density: ExportConfig['options']['density'] }) {
  const rowHeight = density === 'comfortable' ? 15 : 12
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 7, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ background: NAVY, color: '#fff', padding: '5px 7px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <strong style={{ fontSize: 10, letterSpacing: '0.12em' }}>{month.name}</strong>
          <span style={{ fontSize: 6.4, color: '#f8fafc' }}>{month.eventCount} events</span>
        </div>
        <div style={{ minHeight: 10, color: '#f8d76b', fontSize: 6.4, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {month.theme ? `Theme: ${month.theme}` : 'Month theme not set'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '18px 14px 1fr', background: '#f8fafc', borderBottom: `1px solid ${LINE}`, color: '#94a3b8', fontSize: 5.5, fontWeight: 900, letterSpacing: '0.12em' }}>
        <span style={{ padding: '2px 3px' }}>DAY</span><span style={{ padding: '2px 3px' }}>#</span><span style={{ padding: '2px 3px' }}>PLAN</span>
      </div>
      {month.days.map((day) => (
        <div key={day.dateStr} style={{ display: 'grid', gridTemplateColumns: '18px 14px 1fr', minHeight: rowHeight, borderBottom: '1px solid #f1f5f9', background: day.weekend ? '#fff8e7' : '#fff', alignItems: 'stretch' }}>
          <span style={{ padding: '2px 3px', fontSize: 5.5, fontWeight: 900, color: day.weekend ? '#d97706' : '#94a3b8' }}>{day.weekday}</span>
          <span style={{ padding: '2px 2px', fontSize: 6.5, fontWeight: 900, color: INK }}>{day.day}</span>
          <span style={{ padding: '1px 3px', fontSize: 5.8, color: INK, minWidth: 0 }}>
            {day.visibleEvents.map((event) => <EventLine key={`${event.event.id}-${day.dateStr}`} item={event} />)}
            {day.overflow > 0 && <span style={{ color: '#b45309', fontWeight: 800 }}>+{day.overflow} more</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

function Cover({ intel, accent, mode, orgName, title, year, coverage, showLegend }: {
  intel: YearIntelligence
  accent: string
  mode: ExportConfig['mode']
  orgName: string
  title: string
  year: number
  coverage: string
  showLegend: boolean
}) {
  const exportType = mode === 'forward-planner' ? 'Forward Planner Print View' : 'Executive Report Export'
  return (
    <section style={page('always')}>
      <div style={{ background: NAVY, borderRadius: 12, padding: 18, color: '#fff' }}>
        <div style={{ color: accent, fontSize: 8, fontWeight: 900, letterSpacing: '0.24em' }}>STRATUM</div>
        <h1 style={{ margin: '24px 0 4px', fontSize: 31, lineHeight: 0.95, maxWidth: 560 }}>{orgName}</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: 11 }}>{title}</p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ border: `1px solid ${accent}66`, borderRadius: 999, padding: '6px 10px', fontSize: 7.5, fontWeight: 900, letterSpacing: '0.16em' }}>{year}</span>
          <span style={{ border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, padding: '6px 10px', fontSize: 7.5 }}>{exportType}</span>
          <span style={{ color: '#94a3b8', fontSize: 7.5 }}>Generated {format(new Date(), 'd MMMM yyyy')}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 7 }}>
        <Metric label="Events" value={`${intel.totalEvents}`} note="Scheduled occurrences" accent={accent} />
        <Metric label="Active Goals" value={`${intel.activeGoals}`} note={intel.goals.length ? `${intel.goals.length} total goals` : 'No goals recorded yet'} accent={accent} />
        <Metric label="Themes" value={`${intel.themesSet}`} note="Month themes set" accent={accent} />
        <Metric label="Categories" value={`${intel.categoryLegend.length}`} note="Used in period" accent={accent} />
        <Metric label="Busiest Quarter" value={intel.busiestQuarter ? `Q${intel.busiestQuarter.quarter}` : '-'} note={intel.busiestQuarter ? `${intel.busiestQuarter.eventCount} events` : 'No events'} accent={accent} />
        <Metric label="Busiest Month" value={intel.busiestMonth?.shortName ?? '-'} note={intel.busiestMonth ? `${intel.busiestMonth.eventCount} events` : 'No events'} accent={accent} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 9 }}>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 12 }}>
          <Title label="Strategic Framing" accent={accent}>Year Theme</Title>
          <p style={{ margin: 0, fontSize: 8.5, color: MUTED, lineHeight: 1.5 }}>
            {intel.months.find((month) => month.theme)?.theme ?? 'No year theme set yet - add one in Settings to frame the year.'}
          </p>
          <div style={{ marginTop: 12 }}><Legend items={intel.categoryLegend} show={showLegend} /></div>
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 12 }}>
          <Title label="Document Contents" accent={accent}>What This Export Contains</Title>
          {['Strategic goals and planning framework', 'Quarter focus and month theme summaries', mode === 'forward-planner' ? 'Four 3-month working planner pages' : 'Calendar appendix and analysis'].map((line, index) => (
            <div key={line} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7 }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, background: `${accent}22`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6.5, fontWeight: 900 }}>{index + 1}</span>
              <span style={{ fontSize: 7.5, color: INK, fontWeight: 700 }}>{line}</span>
            </div>
          ))}
        </div>
      </div>
      <Footer pageName={coverage} accent={accent} />
    </section>
  )
}

function QuarterFocus({ quarter, accent }: { quarter: QuarterSummary; accent: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, breakInside: 'avoid' }}>
      <h3 style={{ margin: 0, color: NAVY, fontSize: 12 }}>Q{quarter.quarter}</h3>
      <p style={{ margin: '3px 0 8px', fontSize: 7, color: MUTED }}>{quarter.eventCount} events · {quarter.months.map((month) => month.shortName).join(', ')}</p>
      <strong style={{ color: accent, fontSize: 6.5, letterSpacing: '0.12em' }}>TOP CATEGORIES</strong>
      {quarter.topCategories.length === 0 && <div style={{ fontSize: 7, color: MUTED, marginTop: 4 }}>No events recorded.</div>}
      {quarter.topCategories.map(({ category, count }) => (
        <div key={category.id} style={{ fontSize: 7, color: INK, marginTop: 4 }}><span style={{ color: category.color }}>●</span> {category.label} · {count}</div>
      ))}
    </div>
  )
}

function PlannerPages({ intel, accent, year, coverage, options }: { intel: YearIntelligence; accent: string; year: number; coverage: string; options: ExportConfig['options'] }) {
  return (
    <>
      {intel.quarters.map((quarter, index) => (
        <section key={quarter.quarter} style={page(index === intel.quarters.length - 1 ? 'avoid' : 'always')}>
          <Header title={`Forward Planner Q${quarter.quarter}`} year={year} accent={accent} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
            <Title label="Three-Month Planning Block" accent={accent}>{quarter.months.map((month) => month.name).join(' / ')}</Title>
            <div style={{ maxWidth: 310 }}><Legend items={intel.categoryLegend} show={options.includeLegend} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${quarter.months.length}, minmax(0, 1fr))`, gap: 7, flex: 1, minHeight: 0 }}>
            {quarter.months.map((month) => <MonthPlanner key={month.month} month={month} density={options.density} />)}
          </div>
          <Footer pageName={`Q${quarter.quarter} · ${coverage}`} accent={accent} />
        </section>
      ))}
    </>
  )
}

function ExecutiveReport(props: { intel: YearIntelligence; accent: string; orgName: string; title: string; year: number; coverage: string; options: ExportConfig['options'] }) {
  const { intel, accent, orgName, title, year, coverage, options } = props
  return (
    <>
      <Cover intel={intel} accent={accent} mode="executive-report" orgName={orgName} title={title} year={year} coverage={coverage} showLegend={options.includeLegend} />
      <section style={page('always')}>
        <Header title="Year at a Glance" year={year} accent={accent} />
        <Title label="Annual Intelligence" accent={accent}>Year at a Glance</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Metric label="Total Events" value={`${intel.totalEvents}`} accent={accent} />
          <Metric label="Busiest Month" value={intel.busiestMonth?.shortName ?? '-'} note={intel.busiestMonth ? `${intel.busiestMonth.eventCount} events` : 'No events recorded'} accent={accent} />
          <Metric label="Recurring Rhythms" value={`${intel.recurringRhythms.length}`} accent={accent} />
          <Metric label="Empty Periods" value={`${intel.emptyPeriods.length}`} accent={accent} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div style={{ display: 'grid', gap: 8 }}>{intel.quarters.map((quarter) => <QuarterFocus key={quarter.quarter} quarter={quarter} accent={accent} />)}</div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 10 }}>
            <Title label="Recurring Rhythm" accent={accent}>Most Frequent Patterns</Title>
            {intel.recurringRhythms.map((rhythm) => (
              <div key={rhythm.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #f1f5f9', padding: '6px 0', fontSize: 7.5 }}>
                <span><span style={{ color: rhythm.category.color }}>●</span> {rhythm.shortTitle}</span>
                <span style={{ color: MUTED }}>{rhythm.count} · {rhythm.recurrence}</span>
              </div>
            ))}
            {intel.recurringRhythms.length === 0 && <p style={{ fontSize: 8, color: MUTED }}>No recurring rhythms identified for this range.</p>}
          </div>
        </div>
        <Footer pageName="Year at a Glance" accent={accent} />
      </section>
      <StrategicGoals intel={intel} accent={accent} year={year} />
      <section style={page('always')}>
        <Header title="Month Themes" year={year} accent={accent} />
        <Title label="Planning Language" accent={accent}>Month Themes Summary</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {intel.months.map((month) => (
            <div key={month.month} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: 9, minHeight: 56 }}>
              <strong style={{ fontSize: 9, color: NAVY }}>{month.name}</strong>
              <p style={{ margin: '5px 0 0', fontSize: 7, color: month.theme ? INK : '#94a3b8', lineHeight: 1.35 }}>{month.theme || 'Month theme not set yet.'}</p>
            </div>
          ))}
        </div>
        <Footer pageName="Themes" accent={accent} />
      </section>
      {options.includeAppendix && <PlannerPages intel={intel} accent={accent} year={year} coverage={coverage} options={options} />}
    </>
  )
}

export function ExportPrintLayout({ year, months, mode = 'executive-report', options }: Props) {
  const { store } = usePlanner()
  const selectedMonths = months.length ? months : Array.from({ length: 12 }, (_, index) => index + 1)
  const exportOptions = { ...defaultExportOptions(), ...options }
  const intel = buildYearIntelligence(store, year, selectedMonths)
  const accent = exportOptions.colourMode === 'economy' ? '#9a7a1f' : (store.accentColor || '#d4af37')
  const orgName = store.organizationName.trim() || 'STRATUM'
  const title = store.plannerTitle.trim() || 'Executive Planning System'
  const coverage = selectedMonths.length === 12
    ? `Full Year ${year}`
    : `${MONTH_SHORT[selectedMonths[0] - 1]}-${MONTH_SHORT[selectedMonths[selectedMonths.length - 1] - 1]} ${year}`

  useLayoutEffect(() => {
    document.body.classList.add('stratum-export-mode')
    document.body.classList.toggle('stratum-forward-planner', mode === 'forward-planner')
    return () => {
      document.body.classList.remove('stratum-export-mode')
      document.body.classList.remove('stratum-forward-planner')
    }
  }, [mode])

  return (
    <div id="stratum-print-layout" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff' }}>
      {mode === 'forward-planner'
        ? (
          <>
            <Cover intel={intel} accent={accent} mode="forward-planner" orgName={orgName} title={title} year={year} coverage={coverage} showLegend={exportOptions.includeLegend} />
            <StrategicGoals intel={intel} accent={accent} year={year} />
            <PlannerPages intel={intel} accent={accent} year={year} coverage={coverage} options={exportOptions} />
          </>
        )
        : <ExecutiveReport intel={intel} accent={accent} orgName={orgName} title={title} year={year} coverage={coverage} options={exportOptions} />}
    </div>
  )
}
