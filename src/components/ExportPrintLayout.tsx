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
  type YearIntelligence,
} from '../lib/exportIntelligence'

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY = '#0a0e1a'
const INK = '#0f172a'
const MUTED = '#64748b'
const SOFT = '#94a3b8'
const LINE = '#e2e8f0'
const LIGHT = '#f8fafc'

// ─── A4 dimensions at 96 dpi ─────────────────────────────────────────────────
const PORT_W = 794   // portrait width  px
const PORT_H = 1123  // portrait height px
const LAND_W = 1123  // landscape width  px
const LAND_H = 794   // landscape height px

const TODAY = format(new Date(), 'yyyy-MM-dd')

const QUARTER_LABELS = ['Q1 — Foundation', 'Q2 — Execution', 'Q3 — Expansion', 'Q4 — Finish']
const QUARTER_MONTH_INDICES = [[0,1,2],[3,4,5],[6,7,8],[9,10,11]]
const FULL_MONTHS = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

interface Props {
  year: number
  months: number[]
  mode?: ExportConfig['mode']
  options?: Partial<ExportConfig['options']>
}

interface RenderedPage {
  id: string
  render: (isLast: boolean) => React.ReactNode
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
function Page({
  orientation,
  isLast,
  children,
}: {
  orientation: 'portrait' | 'landscape'
  isLast?: boolean
  children: React.ReactNode
}) {
  const w  = orientation === 'landscape' ? LAND_W : PORT_W
  const h  = orientation === 'landscape' ? LAND_H : PORT_H
  const px = orientation === 'landscape' ? 28 : 40
  const py = orientation === 'landscape' ? 20 : 36
  return (
    <div
      className="stratum-page"
      data-orientation={orientation}
      style={{
        width: w, height: h,
        padding: `${py}px ${px}px`,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: INK,
        flexShrink: 0,
      } as CSSProperties}
    >
      {children}
    </div>
  )
}

// ─── Doc chrome ───────────────────────────────────────────────────────────────
function DocHeader({ title, year, accent }: { title: string; year: number; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1.5px solid ${accent}`, paddingBottom: 6, flexShrink: 0 }}>
      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', color: accent }}>STRATUM</span>
      <span style={{ fontSize: 7, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {title} · {year}
      </span>
    </div>
  )
}

function DocFooter({ pageName, accent }: { pageName: string; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid #f1f5f9', paddingTop: 5, marginTop: 'auto', flexShrink: 0 }}>
      <span style={{ fontSize: 6, fontWeight: 900, color: accent, letterSpacing: '0.12em' }}>
        STRATUM · EXECUTIVE PLANNING SYSTEM
      </span>
      <span style={{ fontSize: 6, color: SOFT }}>{pageName}</span>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Label({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{ fontSize: 6.5, fontWeight: 900, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: accent, marginBottom: 3 }}>
      {text}
    </div>
  )
}

function SectionTitle({ label, children, accent }: { label: string; children: string; accent: string }) {
  return (
    <div style={{ marginBottom: 8, flexShrink: 0 }}>
      <Label text={label} accent={accent} />
      <h2 style={{ margin: '2px 0 0', fontSize: 17, lineHeight: 1.05, color: NAVY, fontWeight: 900 }}>{children}</h2>
    </div>
  )
}

function MetricCard({ label, value, note, accent }: { label: string; value: string; note?: string; accent: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 10px',
        background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 5.5, color: SOFT, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: INK, marginTop: 2, lineHeight: 1 }}>{value}</div>
      {note && <div style={{ fontSize: 6.5, color: MUTED, marginTop: 3, lineHeight: 1.3 }}>{note}</div>}
      <div style={{ height: 2, width: 28, borderRadius: 999, background: accent, marginTop: 6 }} />
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
}

function CategoryLegend({ items }: { items: Array<{ category: EventCategoryDef; count: number; share?: number }> }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {items.map(({ category, count, share }) => (
        <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 6.5,
            color: INK, border: '1px solid #e5e7eb', borderRadius: 999, padding: '3px 7px', background: '#fff' }}>
          <Dot color={category.color} />
          <strong>{category.label}</strong>
          <span style={{ color: MUTED }}>{count}{share != null ? ` · ${share}%` : ''}</span>
        </div>
      ))}
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 7, padding: '7px 9px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <strong style={{ fontSize: 7.5, color: INK, flex: 1, lineHeight: 1.3 }}>{goal.title}</strong>
        <span style={{ fontSize: 5.5, color: goal.color ?? '#d4af37', fontWeight: 900,
            textTransform: 'uppercase', flexShrink: 0 }}>{PRIORITY_LABELS[goal.priority]}</span>
      </div>
      <div style={{ fontSize: 6, color: MUTED, marginTop: 3 }}>
        {GOAL_STATUS_LABELS[goal.status]} · {goal.progress}% complete
      </div>
      <div style={{ height: 3, background: '#e2e8f0', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
        <div style={{ width: `${goal.progress}%`, height: '100%', background: goal.color ?? '#d4af37' }} />
      </div>
    </div>
  )
}

// ─── Cover page — portrait (Executive Report) ─────────────────────────────────
function CoverPortrait({ intel, accent, orgName, title, year, coverage, yearTheme, showLegend }: {
  intel: YearIntelligence; accent: string; orgName: string; title: string
  year: number; coverage: string; yearTheme: string; showLegend: boolean
}) {
  return (
    <Page orientation="portrait">
      <DocHeader title="Executive Report" year={year} accent={accent} />

      {/* Hero */}
      <div style={{ background: NAVY, borderRadius: 10, padding: '26px 30px', marginTop: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.28em', color: accent, marginBottom: 18 }}>
          STRATUM
        </div>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: 0.95, color: '#fff', fontWeight: 900 }}>{orgName}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#cbd5e1' }}>{title}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <span style={{ border: `1.5px solid ${accent}66`, borderRadius: 999, padding: '5px 13px',
              fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', color: accent }}>{year}</span>
          <span style={{ border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '5px 13px',
              fontSize: 8, color: '#cbd5e1' }}>Executive Report</span>
          <span style={{ fontSize: 7.5, color: '#64748b' }}>Generated {format(new Date(), 'd MMMM yyyy')}</span>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 14, flexShrink: 0 }}>
        <MetricCard label="Events" value={`${intel.totalEvents}`} note="Scheduled" accent={accent} />
        <MetricCard label="Active Goals" value={`${intel.activeGoals}`}
          note={intel.goals.length ? `${intel.goals.length} total` : 'None recorded'} accent={accent} />
        <MetricCard label="Themes Set" value={`${intel.themesSet}`} note="Month themes" accent={accent} />
        <MetricCard label="Categories" value={`${intel.categoryLegend.length}`} note="In use" accent={accent} />
        <MetricCard label="Busiest Qtr" value={intel.busiestQuarter ? `Q${intel.busiestQuarter.quarter}` : '—'}
          note={intel.busiestQuarter ? `${intel.busiestQuarter.eventCount} events` : 'No events'} accent={accent} />
        <MetricCard label="Busiest Month" value={intel.busiestMonth?.shortName ?? '—'}
          note={intel.busiestMonth ? `${intel.busiestMonth.eventCount} events` : 'No events'} accent={accent} />
      </div>

      {/* Content cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 10,
          marginTop: 14, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, overflow: 'hidden',
            display: 'flex', flexDirection: 'column' }}>
          <Label text="Year Vision" accent={accent} />
          <h3 style={{ margin: '4px 0 10px', fontSize: 13, color: NAVY, fontWeight: 900 }}>
            {yearTheme ? 'Year Theme' : 'Set Your Year Vision'}
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: 9, lineHeight: 1.65,
              color: yearTheme ? INK : '#94a3b8', flex: 1, overflow: 'hidden' }}>
            {yearTheme || 'Add a year theme in Settings to set strategic intent and frame every quarter with clear purpose.'}
          </p>
          {showLegend && intel.categoryLegend.length > 0 && (
            <>
              <Label text="Category Legend" accent={accent} />
              <div style={{ marginTop: 6 }}><CategoryLegend items={intel.categoryLegend} /></div>
            </>
          )}
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, overflow: 'hidden' }}>
          <Label text="Document Contents" accent={accent} />
          <h3 style={{ margin: '4px 0 12px', fontSize: 13, color: NAVY, fontWeight: 900 }}>What's Inside</h3>
          {[
            'Year at a Glance & quarterly intelligence',
            'Strategic goals and vital few priorities',
            'Month-by-month themes and focus areas',
            'Category and recurring rhythm analysis',
          ].map((line, i) => (
            <div key={line} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${accent}22`,
                  color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 6.5, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 8, color: INK, lineHeight: 1.5, fontWeight: 600 }}>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <DocFooter pageName={coverage} accent={accent} />
    </Page>
  )
}

// ─── Year at a Glance — portrait ──────────────────────────────────────────────
function YearIntelligencePage({ intel, accent, year, coverage }: {
  intel: YearIntelligence; accent: string; year: number; coverage: string
}) {
  return (
    <Page orientation="portrait">
      <DocHeader title="Year at a Glance" year={year} accent={accent} />
      <SectionTitle label="Annual Intelligence" accent={accent}>Year at a Glance</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flexShrink: 0, marginBottom: 12 }}>
        <MetricCard label="Total Events" value={`${intel.totalEvents}`} note="Across all months" accent={accent} />
        <MetricCard label="Busiest Month" value={intel.busiestMonth?.shortName ?? '—'}
          note={intel.busiestMonth ? `${intel.busiestMonth.eventCount} events` : 'No events'} accent={accent} />
        <MetricCard label="Recurring Patterns" value={`${intel.recurringRhythms.length}`} note="Identified rhythms" accent={accent} />
        <MetricCard label="Open Periods" value={`${intel.emptyPeriods.length}`} note="Months without events" accent={accent} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Quarter 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {intel.quarters.map((q) => (
            <div key={q.quarter} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: NAVY }}>Q{q.quarter}</h3>
                <span style={{ fontSize: 6.5, color: MUTED, textAlign: 'right', lineHeight: 1.3 }}>{q.eventCount} events</span>
              </div>
              <div style={{ fontSize: 7, color: MUTED, marginBottom: 8 }}>
                {q.months.map((m) => m.shortName).join(' · ')}
              </div>
              <Label text="Top Categories" accent={accent} />
              {q.topCategories.length === 0 ? (
                <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 4 }}>No events scheduled</div>
              ) : (
                <div style={{ marginTop: 4 }}>
                  {q.topCategories.slice(0, 4).map(({ category, count }) => (
                    <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 7, color: INK, marginTop: 3 }}>
                      <Dot color={category.color} />
                      <span style={{ flex: 1 }}>{category.label}</span>
                      <span style={{ color: MUTED }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recurring rhythms */}
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: 10, overflow: 'hidden',
            display: 'flex', flexDirection: 'column' }}>
          <SectionTitle label="Recurring Rhythm" accent={accent}>Most Frequent Patterns</SectionTitle>
          {intel.recurringRhythms.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 8.5, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                No recurring rhythms found.<br />
                Add recurring events to build<br />structural patterns in your year.
              </div>
            </div>
          ) : (
            <div style={{ overflow: 'hidden' }}>
              {intel.recurringRhythms.map((r) => (
                <div key={r.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 8,
                    borderBottom: '1px solid #f1f5f9', padding: '6px 0', fontSize: 7.5, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <Dot color={r.category.color} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.shortTitle}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, color: MUTED, fontSize: 7 }}>
                    <span>{r.count}×</span>
                    <span>{r.recurrence}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DocFooter pageName={`Year Intelligence · ${coverage}`} accent={accent} />
    </Page>
  )
}

// ─── Strategic Goals ──────────────────────────────────────────────────────────
function StrategicGoalsPage({ intel, accent, year, coverage, orientation = 'portrait' }: {
  intel: YearIntelligence; accent: string; year: number; coverage: string; orientation?: 'portrait' | 'landscape'
}) {
  return (
    <Page orientation={orientation}>
      <DocHeader title="Strategic Goals" year={year} accent={accent} />
      <SectionTitle label="Strategy Layer" accent={accent}>Strategic Goals & Vital Few</SectionTitle>

      {intel.goals.length === 0 ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: LIGHT, border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 8.5, color: NAVY, fontWeight: 700, marginBottom: 4 }}>
              Connect activity to strategic outcomes
            </div>
            <div style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.5 }}>
              Add goals to align your calendar with what matters most. Goals appear here grouped by quarter with progress tracking.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, overflow: 'hidden' }}>
            {(['Q1 Foundation', 'Q2 Execution', 'Q3 Expansion', 'Q4 Finish'] as const).map((lbl, i) => (
              <div key={lbl} style={{ border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <Label text={`Q${i + 1} Quarter Focus`} accent={accent} />
                  <div style={{ fontSize: 13, fontWeight: 900, color: NAVY, marginTop: 2 }}>{lbl}</div>
                </div>
                {['Vital Few', 'Key Milestone', 'Supporting Priority'].map((ws) => (
                  <div key={ws} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 8, fontSize: 7.5, color: '#94a3b8' }}>
                    {ws}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, overflow: 'hidden' }}>
          {([1, 2, 3, 4] as const).map((q) => (
            <div key={q} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 10,
                overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 8px', color: NAVY, fontSize: 13, fontWeight: 900 }}>Q{q} Focus</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                {intel.goalsByQuarter[q].slice(0, 5).map((goal) => <GoalCard key={goal.id} goal={goal} />)}
                {intel.goalsByQuarter[q].length === 0 && (
                  <div style={{ fontSize: 7.5, color: '#94a3b8', fontStyle: 'italic' }}>
                    Define quarter focus — add goals to this quarter
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DocFooter pageName={`Strategy · ${coverage}`} accent={accent} />
    </Page>
  )
}

// ─── Month Themes — portrait ──────────────────────────────────────────────────
function MonthThemesPage({ intel, accent, year, coverage, isLast }: {
  intel: YearIntelligence; accent: string; year: number; coverage: string; isLast?: boolean
}) {
  return (
    <Page orientation="portrait" isLast={isLast}>
      <DocHeader title="Month Themes" year={year} accent={accent} />
      <SectionTitle label="Planning Language" accent={accent}>Month Themes Summary</SectionTitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
        {QUARTER_MONTH_INDICES.map((indices, qIdx) => (
          <div key={qIdx} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.14em', color: accent,
                marginBottom: 6, textTransform: 'uppercase' }}>
              {QUARTER_LABELS[qIdx]}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, height: 'calc(100% - 22px)' }}>
              {indices.map((mIdx) => {
                const month = intel.months[mIdx]
                const hasTheme = Boolean(month?.theme)
                return (
                  <div key={mIdx} style={{
                    border: hasTheme ? `1.5px solid ${accent}44` : `1px solid ${LINE}`,
                    borderRadius: 9, padding: '10px 11px',
                    background: hasTheme ? `${accent}06` : '#fff',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <strong style={{ fontSize: 9.5, color: NAVY, fontWeight: 900 }}>{FULL_MONTHS[mIdx]}</strong>
                      <span style={{ fontSize: 6.5, color: MUTED }}>{month?.eventCount ?? 0} events</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 7.5, lineHeight: 1.55, flex: 1, overflow: 'hidden',
                        color: hasTheme ? INK : '#94a3b8', fontStyle: hasTheme ? 'normal' : 'italic' }}>
                      {month?.theme ?? 'Theme space — add monthly focus'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <DocFooter pageName={`Month Themes · ${coverage}`} accent={accent} />
    </Page>
  )
}

// ─── Landscape Cover (Forward Planner) ───────────────────────────────────────
function CoverLandscape({ intel, accent, orgName, title, year, coverage }: {
  intel: YearIntelligence; accent: string; orgName: string; title: string; year: number; coverage: string
}) {
  return (
    <Page orientation="landscape">
      <DocHeader title="Forward Planner" year={year} accent={accent} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '0.42fr 0.58fr',
          gap: 14, marginTop: 10, minHeight: 0, overflow: 'hidden' }}>
        {/* Identity panel */}
        <div style={{ background: NAVY, borderRadius: 10, padding: '22px 26px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.28em', color: accent, marginBottom: 'auto' }}>
            STRATUM
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, lineHeight: 0.95, color: '#fff', fontWeight: 900 }}>{orgName}</h1>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: '#cbd5e1' }}>{title}</p>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ border: `1.5px solid ${accent}66`, borderRadius: 999, padding: '4px 12px',
                fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', color: accent }}>{year}</span>
            <span style={{ border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '4px 12px',
                fontSize: 8, color: '#cbd5e1' }}>Forward Planner</span>
          </div>
          <div style={{ fontSize: 7, color: '#475569', marginTop: 10 }}>
            Generated {format(new Date(), 'd MMMM yyyy')}
          </div>
        </div>

        {/* Metrics + quarter overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flexShrink: 0 }}>
            <MetricCard label="Total Events" value={`${intel.totalEvents}`} note="Scheduled" accent={accent} />
            <MetricCard label="Active Goals" value={`${intel.activeGoals}`}
              note={`${intel.goals.length} total`} accent={accent} />
            <MetricCard label="Themes Set" value={`${intel.themesSet}`} note="Month themes" accent={accent} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flexShrink: 0 }}>
            <MetricCard label="Categories" value={`${intel.categoryLegend.length}`} note="In use" accent={accent} />
            <MetricCard label="Busiest Qtr" value={intel.busiestQuarter ? `Q${intel.busiestQuarter.quarter}` : '—'}
              note={intel.busiestQuarter ? `${intel.busiestQuarter.eventCount} events` : 'No events'} accent={accent} />
            <MetricCard label="Busiest Month" value={intel.busiestMonth?.shortName ?? '—'}
              note={intel.busiestMonth ? `${intel.busiestMonth.eventCount} events` : 'No events'} accent={accent} />
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '10px 12px', flex: 1, overflow: 'hidden' }}>
            <Label text="Four Quarter Coverage" accent={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {intel.quarters.map((q) => (
                <div key={q.quarter}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: NAVY }}>Q{q.quarter}</div>
                  <div style={{ fontSize: 6.5, color: MUTED, marginTop: 2 }}>
                    {q.months.map((m) => m.shortName).join(' · ')}
                  </div>
                  <div style={{ fontSize: 7, color: INK, marginTop: 3 }}>{q.eventCount} events</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DocFooter pageName={coverage} accent={accent} />
    </Page>
  )
}

// ─── Landscape month planner page ────────────────────────────────────────────
const MONTH_ROW_H = 19

function MonthPlannerPage({ month, accent, year, coverage, showLegend, isLast }: {
  month: MonthSummary
  accent: string
  year: number
  coverage: string
  showLegend: boolean
  isLast: boolean
}) {
  return (
    <Page orientation="landscape" isLast={isLast}>
      <DocHeader title={`Forward Planner ${month.name}`} year={year} accent={accent} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 14,
          marginTop: 9, marginBottom: 8, alignItems: 'end', flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <Label text={`Month Planning Sheet · Q${Math.ceil(month.month / 3)}`} accent={accent} />
          <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900, color: NAVY, lineHeight: 1 }}>
            {month.name}
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 9, color: month.theme ? INK : SOFT,
              fontStyle: month.theme ? 'normal' : 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {month.theme || 'Theme space - add monthly focus'}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
          <MetricCard label="Events" value={`${month.eventCount}`} note="Scheduled" accent={accent} />
          <MetricCard label="Busy Week" value={month.busiestWeek.startsWith('Week') ? month.busiestWeek.replace('Week of ', '').split(' ')[0] : '-'}
            note={month.busiestWeek} accent={accent} />
          <MetricCard label="Categories" value={`${month.topCategories.length}`} note="Top groups" accent={accent} />
        </div>
      </div>

      {showLegend && month.topCategories.length > 0 && (
        <div style={{ marginBottom: 8, flexShrink: 0 }}>
          <CategoryLegend items={month.topCategories.map(({ category, count }) => ({
            category,
            count,
            share: month.eventCount ? Math.round((count / month.eventCount) * 100) : 0,
          }))} />
        </div>
      )}

      <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden',
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '42px 30px 1fr', background: LIGHT,
            borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
          {(['DAY', '#', 'PLAN / ACTIVITY'] as const).map((header) => (
            <span key={header} style={{ padding: '5px 8px', fontSize: 7, fontWeight: 900, color: SOFT, letterSpacing: '0.12em' }}>
              {header}
            </span>
          ))}
        </div>

        <div style={{ overflow: 'hidden', flex: 1 }}>
          {month.days.map((day) => {
            const isToday = day.dateStr === TODAY
            const visibleEvents = day.events.slice(0, 2)
            const overflow = Math.max(0, day.events.length - visibleEvents.length)

            return (
              <div key={day.dateStr} style={{
                display: 'grid',
                gridTemplateColumns: '42px 30px 1fr',
                height: MONTH_ROW_H,
                borderBottom: '1px solid #edf2f7',
                overflow: 'hidden',
                background: isToday ? '#fff7d6' : day.weekend ? '#fffaf0' : '#fff',
              }}>
                <span style={{ padding: '4px 8px', fontSize: 7.5, fontWeight: 900, alignSelf: 'center',
                    color: day.weekend ? '#d97706' : SOFT }}>{day.weekday}</span>
                <span style={{ padding: '4px 4px', fontSize: 9, fontWeight: 900, alignSelf: 'center',
                    color: isToday ? '#b45309' : INK }}>{day.day}</span>
                <div style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 10,
                    minWidth: 0, overflow: 'hidden' }}>
                  {visibleEvents.length === 0 ? (
                    <span style={{ fontSize: 8, color: '#cbd5e1' }}> </span>
                  ) : (
                    visibleEvents.map((event) => (
                      <div key={`${event.event.id}-${day.dateStr}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        minWidth: 0,
                        maxWidth: visibleEvents.length > 1 ? '48%' : '86%',
                        overflow: 'hidden',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: event.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 8.6, color: INK, whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis', lineHeight: 1.15 }}>
                          {event.timeLabel && <span style={{ color: MUTED, fontSize: 7.5, marginRight: 3 }}>{event.timeLabel}</span>}
                          {event.title}
                        </span>
                      </div>
                    ))
                  )}
                  {overflow > 0 && (
                    <span style={{ fontSize: 8, color: '#b45309', fontWeight: 900, flexShrink: 0 }}>+{overflow} more</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flexShrink: 0,
            borderTop: `1px solid ${LINE}`, background: '#fff' }}>
          {['Key outcomes', 'Risks / dependencies', 'Follow-ups'].map((label) => (
            <div key={label} style={{ padding: '8px 10px', borderRight: `1px solid ${LINE}`, minHeight: 46 }}>
              <Label text={label} accent={accent} />
              <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: 9 }} />
              <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: 11 }} />
            </div>
          ))}
        </div>
          </div>

      <DocFooter pageName={`${month.name} · ${coverage}`} accent={accent} />
    </Page>
  )
}

// ─── Top-level layout composers ───────────────────────────────────────────────
function ExecutiveReport({ intel, accent, orgName, title, year, coverage, yearTheme, options }: {
  intel: YearIntelligence; accent: string; orgName: string; title: string
  year: number; coverage: string; yearTheme: string; options: ExportConfig['options']
}) {
  const selectedPages = options.pageIds?.length ? new Set(options.pageIds) : null
  const enabled = (id: string) => !selectedPages || selectedPages.has(id)
  const pages: RenderedPage[] = [
    {
      id: 'cover',
      render: () => <CoverPortrait intel={intel} accent={accent} orgName={orgName} title={title}
        year={year} coverage={coverage} yearTheme={yearTheme} showLegend={options.includeLegend} />,
    },
    {
      id: 'year-intelligence',
      render: () => <YearIntelligencePage intel={intel} accent={accent} year={year} coverage={coverage} />,
    },
    {
      id: 'goals',
      render: () => <StrategicGoalsPage intel={intel} accent={accent} year={year} coverage={coverage} />,
    },
    {
      id: 'month-themes',
      render: (isLast: boolean) => <MonthThemesPage intel={intel} accent={accent} year={year} coverage={coverage} isLast={isLast} />,
    },
    ...(options.includeAppendix
      ? intel.months.map((month) => ({
          id: `month-${month.month}`,
          render: (isLast: boolean) => <MonthPlannerPage month={month} accent={accent} year={year} coverage={coverage}
            showLegend={options.includeLegend}
            isLast={isLast} />,
        }))
      : []),
  ].filter((page) => enabled(page.id))

  return (
    <>
      {pages.map((page, index) => (
        <div key={page.id} style={{ display: 'contents' }}>
          {page.render(index === pages.length - 1)}
        </div>
      ))}
    </>
  )
}

function ForwardPlanner({ intel, accent, orgName, title, year, coverage, options }: {
  intel: YearIntelligence; accent: string; orgName: string; title: string
  year: number; coverage: string; options: ExportConfig['options']
}) {
  const selectedPages = options.pageIds?.length ? new Set(options.pageIds) : null
  const enabled = (id: string) => !selectedPages || selectedPages.has(id)
  const pages: RenderedPage[] = [
    {
      id: 'cover',
      render: () => <CoverLandscape intel={intel} accent={accent} orgName={orgName} title={title} year={year} coverage={coverage} />,
    },
    {
      id: 'goals',
      render: () => <StrategicGoalsPage intel={intel} accent={accent} year={year} coverage={coverage} orientation="landscape" />,
    },
    ...intel.months.map((month) => ({
      id: `month-${month.month}`,
      render: (isLast: boolean) => <MonthPlannerPage month={month} accent={accent} year={year} coverage={coverage}
        showLegend={options.includeLegend}
        isLast={isLast} />,
    })),
  ].filter((page) => enabled(page.id))

  return (
    <>
      {pages.map((page, index) => (
        <div key={page.id} style={{ display: 'contents' }}>
          {page.render(index === pages.length - 1)}
        </div>
      ))}
    </>
  )
}

// ─── Root export component ────────────────────────────────────────────────────
export function ExportPrintLayout({ year, months, mode = 'executive-report', options }: Props) {
  const { store } = usePlanner()
  const selectedMonths = months.length ? months : Array.from({ length: 12 }, (_, i) => i + 1)
  const exportOptions = { ...defaultExportOptions(), ...options }
  const intel = buildYearIntelligence(store, year, selectedMonths)
  const accent = exportOptions.colourMode === 'economy' ? '#9a7a1f' : (store.accentColor || '#d4af37')
  const orgName = store.organizationName?.trim() || 'STRATUM'
  const title = store.plannerTitle?.trim() || 'Executive Planning System'
  const yearTheme = store.yearTheme?.trim() || ''
  const coverage = selectedMonths.length === 12
    ? `Full Year ${year}`
    : `${MONTH_SHORT[selectedMonths[0] - 1]}–${MONTH_SHORT[selectedMonths[selectedMonths.length - 1] - 1]} ${year}`

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
        ? <ForwardPlanner intel={intel} accent={accent} orgName={orgName} title={title}
            year={year} coverage={coverage} options={exportOptions} />
        : <ExecutiveReport intel={intel} accent={accent} orgName={orgName} title={title}
            year={year} coverage={coverage} yearTheme={yearTheme} options={exportOptions} />
      }
    </div>
  )
}
