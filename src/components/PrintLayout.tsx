/**
 * PrintLayout — print document for STRATUM PDF export.
 *
 * Rendered inline (no portal), hidden on screen. Revealed by @media print when
 * body.stratum-export-mode is set. The app shell (#app-shell) is hidden in that mode.
 *
 * Layout: Cover page → 3-month calendar pages → Goals summary
 */
import { useLayoutEffect } from 'react'
import { getDaysInMonth, getDay, format } from 'date-fns'
import { usePlanner } from '../context/PlannerContext'
import type { Goal, PlannerEvent, EventCategoryDef } from '../types'
import {
  isRecurringOnDate,
  MONTH_NAMES,
  MONTH_SHORT,
  getCategoryStyle,
  GOAL_STATUS_LABELS,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY3 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eventsOnDate(all: PlannerEvent[], dateStr: string): PlannerEvent[] {
  return all.filter((ev) => {
    if (ev.deletedDates?.includes(dateStr)) return false
    if (!ev.recurrence || ev.recurrence.type === 'none') return ev.date === dateStr
    return isRecurringOnDate(ev, dateStr)
  })
}

// ─── Month section ────────────────────────────────────────────────────────────

function MonthSection({
  year,
  month,
  events,
  categories,
  theme,
  accentColor,
}: {
  year: number
  month: number
  events: PlannerEvent[]
  categories: EventCategoryDef[]
  theme?: string
  accentColor: string
}) {
  const days = getDaysInMonth(new Date(year, month - 1, 1))

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Month header */}
      <div
        style={{
          background: '#0a0e1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
        }}
      >
        <span
          style={{
            color: accentColor,
            fontWeight: 900,
            fontSize: 9.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {MONTH_NAMES[month - 1]}
          <span
            style={{
              color: '#475569',
              fontWeight: 400,
              fontSize: 7.5,
              marginLeft: 5,
            }}
          >
            {year}
          </span>
        </span>
        {theme && (
          <span
            style={{
              color: '#fde047',
              fontSize: 7,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {theme}
          </span>
        )}
      </div>

      {/* Column header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '22px 15px 1fr',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {['DAY', '#', 'EVENTS'].map((h) => (
          <span
            key={h}
            style={{
              fontSize: 5.5,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.08em',
              padding: '2px 3px',
              lineHeight: '11px',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Day rows */}
      {Array.from({ length: days }, (_, i) => {
        const dayNum = i + 1
        const date = new Date(year, month - 1, dayNum)
        const dow = getDay(date)
        const dateStr = format(date, 'yyyy-MM-dd')
        const evs = eventsOnDate(events, dateStr)
        const weekend = dow === 0 || dow === 6

        return (
          <div
            key={dayNum}
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 15px 1fr',
              alignItems: 'center',
              borderBottom: '1px solid #f8fafc',
              minHeight: 12,
              background: weekend ? '#fffbf0' : 'white',
            }}
          >
            <span
              style={{
                fontSize: 6,
                fontWeight: 700,
                color: weekend ? '#f97316' : '#94a3b8',
                padding: '0 3px',
                lineHeight: '12px',
                letterSpacing: '0.04em',
              }}
            >
              {DAY3[dow]}
            </span>
            <span
              style={{
                fontSize: 6.5,
                fontWeight: 700,
                color: weekend ? '#f97316' : '#1e293b',
                lineHeight: '12px',
              }}
            >
              {dayNum}
            </span>
            <span
              style={{
                fontSize: 6,
                color: '#1e293b',
                lineHeight: '12px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                paddingRight: 3,
              }}
            >
              {evs.map((ev, idx) => {
                const cs = getCategoryStyle(ev.category, categories)
                const title = ev.instanceOverrides?.[dateStr]?.title ?? ev.title
                return (
                  <span key={ev.id}>
                    {idx > 0 && (
                      <span style={{ color: '#cbd5e1', margin: '0 1.5px' }}>·</span>
                    )}
                    <span style={{ color: cs.color }}>
                      {ev.startTime && (
                        <span style={{ opacity: 0.55, fontSize: 5.5 }}>
                          {ev.startTime}{' '}
                        </span>
                      )}
                      {title}
                    </span>
                  </span>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Goal row ─────────────────────────────────────────────────────────────────

function GoalRow({ goal }: { goal: Goal }) {
  const done = goal.milestones.filter((ms) => ms.completed).length
  const statusColor: Record<string, string> = {
    'not-started': '#94a3b8',
    'in-progress': '#60a5fa',
    completed: '#4ade80',
    deferred: '#f87171',
  }

  return (
    <tr>
      <td
        style={{
          padding: '3.5px 6px',
          fontSize: 7.5,
          fontWeight: 600,
          color: '#1e293b',
          borderBottom: '1px solid #f1f5f9',
          maxWidth: 200,
        }}
      >
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {goal.title}
        </span>
      </td>
      <td
        style={{
          padding: '3.5px 6px',
          borderBottom: '1px solid #f1f5f9',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            fontSize: 6,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: statusColor[goal.status] ?? '#94a3b8',
          }}
        >
          {GOAL_STATUS_LABELS[goal.status]}
        </span>
      </td>
      <td
        style={{ padding: '3.5px 6px', borderBottom: '1px solid #f1f5f9', width: 110 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              background: '#e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${goal.progress}%`,
                background: goal.color ?? '#d4af37',
                borderRadius: 2,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 6.5,
              fontWeight: 700,
              color: '#475569',
              minWidth: 24,
              textAlign: 'right',
            }}
          >
            {goal.progress}%
          </span>
        </div>
      </td>
      <td
        style={{
          padding: '3.5px 6px',
          fontSize: 6.5,
          color: '#64748b',
          borderBottom: '1px solid #f1f5f9',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {done}/{goal.milestones.length}
      </td>
    </tr>
  )
}

// ─── Page chrome helpers ──────────────────────────────────────────────────────

function PageHeader({ right, accentColor }: { right: string; accentColor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1.5px solid ${accentColor}`,
        paddingBottom: 5,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 7.5,
          fontWeight: 900,
          color: accentColor,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        STRATUM
      </span>
      <span style={{ fontSize: 7, color: '#94a3b8', letterSpacing: '0.04em' }}>
        {right}
      </span>
    </div>
  )
}

function PageFooter({ right, accentColor }: { right: string; accentColor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #f1f5f9',
        paddingTop: 4,
        marginTop: 8,
      }}
    >
      <span
        style={{
          fontSize: 5.5,
          color: accentColor,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        STRATUM · EXECUTIVE PLANNING SYSTEM
      </span>
      <span style={{ fontSize: 5.5, color: '#cbd5e1' }}>{right}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  year: number
  months: number[] // 1-based, sorted ascending
}

export function PrintLayout({ year, months }: Props) {
  const { store } = usePlanner()

  // Set body class so @media print CSS knows to hide #root and show this layout.
  // useLayoutEffect fires synchronously before paint, ensuring the class is
  // present before window.print() fires.
  useLayoutEffect(() => {
    document.body.classList.add('stratum-export-mode')
    return () => document.body.classList.remove('stratum-export-mode')
  }, [])

  const today = format(new Date(), 'd MMMM yyyy')
  const orgName = store.organizationName || 'STRATUM'
  const reportTitle = store.plannerTitle || 'Executive Planning System'
  const accentColor = store.accentColor || '#d4af37'
  const firstMonthName = MONTH_NAMES[months[0] - 1]
  const lastMonthName  = MONTH_NAMES[months[months.length - 1] - 1]
  const coverage =
    months.length === 12
      ? `Full Year ${year}`
      : months.length === 1
      ? `${firstMonthName} ${year}`
      : `${firstMonthName} – ${lastMonthName} ${year}`

  const yearGoals = store.goals.filter((g) => g.year === year)
  const selectedThemes = months
    .map((month) => ({
      month,
      theme: store.monthMeta.find((meta) => meta.month === month && meta.year === year)?.theme?.trim() ?? '',
    }))
    .filter((entry) => entry.theme)

  // Group months into pages of 3
  const monthGroups: number[][] = []
  for (let i = 0; i < months.length; i += 3) {
    monthGroups.push(months.slice(i, i + 3))
  }
  const totalPages = 1 + monthGroups.length + (yearGoals.length > 0 ? 1 : 0)

  const content = (
    <div
      id="stratum-print-layout"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#1e293b',
        background: 'white',
      }}
    >
      {/* ── Cover page ─────────────────────────────────────────────────── */}
      <div
        style={{
          pageBreakAfter: 'always',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '270mm',
          background: 'white',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '16px 18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              background: '#0a0e1a',
              borderRadius: 18,
              padding: '22px 24px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at top right, ${accentColor}2e 0%, transparent 36%)`,
              }}
            />
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 900,
                    letterSpacing: '0.22em',
                    color: accentColor,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  STRATUM Export Report
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: 'white',
                    lineHeight: 1.05,
                    maxWidth: 340,
                  }}
                >
                  {orgName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#cbd5e1',
                    marginTop: 8,
                    maxWidth: 360,
                  }}
                >
                  {reportTitle}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    marginTop: 18,
                    padding: '7px 12px',
                    borderRadius: 999,
                    border: `1px solid ${accentColor}44`,
                    color: '#f8fafc',
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {coverage}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 120 }}>
                {[
                  ['Generated', today],
                  ['Pages', `${totalPages}`],
                  ['Goal summary', yearGoals.length > 0 ? 'Included' : 'Skipped'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: 'rgba(15, 23, 42, 0.82)',
                      border: '1px solid rgba(148, 163, 184, 0.14)',
                      borderRadius: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 6,
                        fontWeight: 900,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: '#64748b',
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: 'white' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 22 }}>
              <div
                style={{
                  fontSize: 88,
                  fontWeight: 900,
                  color: 'white',
                  lineHeight: 0.9,
                  letterSpacing: '0.03em',
                }}
              >
                {year}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#cbd5e1',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  paddingBottom: 12,
                }}
              >
                Planning overview
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['Months', `${months.length}`],
              ['Calendar pages', `${monthGroups.length}`],
              ['Goals', `${yearGoals.length}`],
              ['Themes', `${selectedThemes.length}`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    fontSize: 6,
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    marginBottom: 5,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '14px 16px',
                background: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: 6.5,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  marginBottom: 10,
                }}
              >
                Selected months
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {months.map((month) => (
                  <span
                    key={month}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: `${accentColor}14`,
                      border: `1px solid ${accentColor}28`,
                      color: '#0f172a',
                      fontSize: 7,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {MONTH_SHORT[month - 1]}
                  </span>
                ))}
              </div>

              <div
                style={{
                  fontSize: 6.5,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  marginTop: 14,
                  marginBottom: 10,
                }}
              >
                Strategy themes
              </div>
              {selectedThemes.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedThemes.map(({ month, theme }) => (
                    <span
                      key={`${month}-${theme}`}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#9a3412',
                        fontSize: 6.8,
                        fontWeight: 700,
                      }}
                    >
                      {MONTH_SHORT[month - 1]} · {theme}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 7, color: '#94a3b8' }}>No month themes set for this range.</div>
              )}
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '14px 16px',
                background: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: 6.5,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  marginBottom: 10,
                }}
              >
                Document contents
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['01', 'Cover page', 'Report identity, coverage, and key metrics'],
                  ['02', `${monthGroups.length} calendar page${monthGroups.length === 1 ? '' : 's'}`, 'Three months per page with event summaries'],
                  ['03', yearGoals.length > 0 ? 'Goal summary' : 'Goal summary omitted', yearGoals.length > 0 ? `${yearGoals.length} year goal entries included` : 'No goals recorded for this year'],
                ].map(([step, label, text]) => (
                  <div key={step} style={{ display: 'flex', gap: 10 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: `${accentColor}14`,
                        color: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 6.5,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {step}
                    </div>
                    <div>
                      <div style={{ fontSize: 7.5, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 6.8, color: '#64748b', lineHeight: 1.45 }}>{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '14px 16px',
              background: '#fff',
            }}
          >
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {(
                  [
                    ['Organisation', orgName],
                    ['Report title', reportTitle],
                    ['Coverage', coverage],
                    ['Generated', today],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <tr key={label}>
                    <td
                      style={{
                        fontSize: 7,
                        color: '#94a3b8',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        paddingRight: 16,
                        paddingBottom: 6,
                        verticalAlign: 'baseline',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        fontSize: 9,
                        color: '#1e293b',
                        fontWeight: 500,
                        paddingBottom: 6,
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ height: 4, background: accentColor, flexShrink: 0, margin: '0 18px 14px', borderRadius: 999 }} />
      </div>

      {/* ── Calendar pages — 3 months each ──────────────────────────── */}
      {monthGroups.map((group, gi) => {
        const isLastPage = gi === monthGroups.length - 1 && yearGoals.length === 0
        return (
          <div
            key={gi}
            style={{
              pageBreakAfter: isLastPage ? 'avoid' : 'always',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '14px 14px 10px',
            }}
          >
            <PageHeader
              accentColor={accentColor}
              right={`${group.map((m) => MONTH_NAMES[m - 1]).join(' · ')}  ${year}`}
            />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              {group.map((m) => (
                <MonthSection
                  key={m}
                  year={year}
                  month={m}
                  events={store.events}
                  categories={store.categories}
                  accentColor={accentColor}
                  theme={
                    store.monthMeta.find((mt) => mt.month === m && mt.year === year)?.theme
                  }
                />
              ))}
            </div>
            <PageFooter accentColor={accentColor} right={`${year} · Page ${gi + 2}`} />
          </div>
        )
      })}

      {/* ── Goals summary page ──────────────────────────────────────────── */}
      {yearGoals.length > 0 && (
        <div style={{ padding: '14px 14px 10px' }}>
          <PageHeader accentColor={accentColor} right={`Goals · ${year}`} />
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#0a0e1a',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {year} Goals
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {(
                  [
                    ['Goal', 'auto'],
                    ['Status', 80],
                    ['Progress', 110],
                    ['Milestones', 70],
                  ] as [string, number | 'auto'][]
                ).map(([h, w]) => (
                  <th
                    key={h}
                    style={{
                      padding: '4px 6px',
                      fontSize: 6.5,
                      fontWeight: 700,
                      color: '#64748b',
                      textAlign: 'left',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      borderBottom: `2px solid ${accentColor}`,
                      width: w === 'auto' ? undefined : w,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearGoals.map((g) => (
                <GoalRow key={g.id} goal={g} />
              ))}
            </tbody>
          </table>
          <PageFooter accentColor={accentColor} right="End of Report" />
        </div>
      )}
    </div>
  )

  return content
}
