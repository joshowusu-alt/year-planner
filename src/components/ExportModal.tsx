import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Check,
  FileDown,
  Layers3,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import { MONTH_SHORT } from '../types'
import { defaultExportOptions, type ExportConfig, type ExportMode, type ExportOptions } from '../lib/exportIntelligence'

type ForwardPlannerLayout = NonNullable<ExportOptions['forwardPlannerLayout']>

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const QUARTERS = [
  { label: 'Q1', title: 'Foundation', months: [1, 2, 3] },
  { label: 'Q2', title: 'Execution', months: [4, 5, 6] },
  { label: 'Q3', title: 'Expansion', months: [7, 8, 9] },
  { label: 'Q4', title: 'Finish', months: [10, 11, 12] },
]

interface ExportPagePreview {
  id: string
  title: string
  description: string
  orientation: 'Portrait' | 'Landscape'
}

interface Props {
  onClose: () => void
  onExport: (config: ExportConfig) => void
}

function formatCoverage(year: number, months: number[]) {
  if (months.length === 0) return 'Select at least one month'
  if (months.length === 12) return `Full year ${year}`
  if (months.length === 1) return `${MONTH_NAMES_FULL[months[0] - 1]} ${year}`
  return `${MONTH_NAMES_FULL[months[0] - 1]} to ${MONTH_NAMES_FULL[months[months.length - 1] - 1]} ${year}`
}

export function ExportModal({ onClose, onExport }: Props) {
  const { store, currentYear, currentMonth } = usePlanner()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [mode, setMode] = useState<ExportMode>('executive-report')
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions())
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(
    new Set(Array.from({ length: 12 }, (_, i) => i + 1)),
  )

  const orderedMonths = Array.from(selected).sort((a, b) => a - b)
  const monthSelectionKey = orderedMonths.join(',')
  const monthThemes = new Map(
    store.monthMeta
      .filter((meta) => meta.year === selectedYear && meta.theme.trim())
      .map((meta) => [meta.month, meta.theme.trim()]),
  )
  const selectedGoalCount = store.goals.filter((goal) => goal.year === selectedYear).length
  const selectedEventCount = store.events.filter((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`)
    return eventDate.getFullYear() === selectedYear && selected.has(eventDate.getMonth() + 1)
  }).length
  const selectedThemeCount = orderedMonths.filter((month) => monthThemes.has(month)).length
  const monthPages = orderedMonths.length
  const coverage = formatCoverage(selectedYear, orderedMonths)
  const plannerName = store.plannerTitle.trim() || 'Executive Planning System'
  const organizationName = store.organizationName.trim() || 'STRATUM'
  const currentQuarter = QUARTERS[Math.floor((currentMonth - 1) / 3)]
  const currentMonthPreset = [currentMonth]
  const remainingMonthsPreset = Array.from({ length: 13 - currentMonth }, (_, index) => currentMonth + index)
  const selectedThemeLabels = orderedMonths
    .filter((month) => monthThemes.has(month))
    .map((month) => `${MONTH_SHORT[month - 1]}  ${monthThemes.get(month)}`)
  const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index)
  const documentPages = useMemo<ExportPagePreview[]>(() => {
    const monthItems = orderedMonths.map((month) => ({
      id: `month-${month}`,
      title: `${MONTH_NAMES_FULL[month - 1]} planner`,
      description: 'Readable daily activity sheet with event indicators and worksheet space.',
      orientation: 'Landscape' as const,
    }))

    if (mode === 'forward-planner') {
      const layout: ForwardPlannerLayout = options.forwardPlannerLayout ?? 'quarter-overview'

      const quarterItems = QUARTERS
        .map((q, idx) => ({ q, idx }))
        .filter(({ q }) => q.months.some((m) => selected.has(m)))
        .map(({ q, idx }) => ({
          id: `quarter-${idx + 1}`,
          title: `Q${idx + 1} · ${q.title} — Quarter Overview`,
          description: `Three-month landscape spread: ${q.months.map((m) => MONTH_NAMES_FULL[m - 1]).join(', ')}.`,
          orientation: 'Landscape' as const,
        }))

      return [
        {
          id: 'cover',
          title: 'Forward planner cover',
          description: 'Identity, coverage, and planning metrics.',
          orientation: 'Landscape',
        },
        {
          id: 'goals',
          title: 'Strategic goals',
          description: 'Goal framework for the selected year.',
          orientation: 'Landscape',
        },
        ...(layout !== 'monthly-detail' ? quarterItems : []),
        ...(layout !== 'quarter-overview' ? monthItems : []),
      ]
    }

    return [
      {
        id: 'cover',
        title: 'Executive cover',
        description: 'Brand, year framing, themes, and executive metrics.',
        orientation: 'Portrait',
      },
      {
        id: 'year-intelligence',
        title: 'Year intelligence',
        description: 'Quarter activity, category mix, rhythms, and highlights.',
        orientation: 'Portrait',
      },
      {
        id: 'goals',
        title: 'Strategic goals',
        description: 'Goal worksheet and progress summary.',
        orientation: 'Portrait',
      },
      {
        id: 'month-themes',
        title: 'Month themes',
        description: 'Quarter-by-quarter theme worksheet.',
        orientation: 'Portrait',
      },
      ...(options.includeAppendix ? monthItems : []),
    ]
  }, [mode, monthSelectionKey, options.includeAppendix, options.forwardPlannerLayout, selected])
  const selectedDocumentPages = documentPages.filter((page) => selectedPageIds.has(page.id))
  const totalPages = selectedDocumentPages.length

  function setSelection(months: number[]) {
    setSelected(new Set(months))
  }

  function toggle(month: number) {
    const next = new Set(selected)
    if (next.has(month)) next.delete(month)
    else next.add(month)
    setSelected(next)
  }

  function toggleQuarter(months: number[]) {
    const next = new Set(selected)
    const allSelected = months.every((month) => next.has(month))
    months.forEach((month) => {
      if (allSelected) next.delete(month)
      else next.add(month)
    })
    setSelected(next)
  }

  const presetButtons = [
    {
      label: 'Current month',
      caption: `${MONTH_NAMES_FULL[currentMonth - 1]} focus sheet`,
      onClick: () => setSelection(currentMonthPreset),
    },
    {
      label: 'Current quarter',
      caption: `${currentQuarter.label} strategic block`,
      onClick: () => setSelection(currentQuarter.months),
    },
    {
      label: 'Remaining year',
      caption: `${remainingMonthsPreset.length} month runway`,
      onClick: () => setSelection(remainingMonthsPreset),
    },
    {
      label: 'Full year',
      caption: 'All 12 month sections',
      onClick: () => setSelection(Array.from({ length: 12 }, (_, index) => index + 1)),
    },
  ]

  function patchOptions(patch: Partial<ExportOptions>) {
    setOptions((current) => ({ ...current, ...patch }))
  }

  function togglePage(pageId: string) {
    setSelectedPageIds((current) => {
      const next = new Set(current)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }

  function setAllPages(selected: boolean) {
    setSelectedPageIds(selected ? new Set(documentPages.map((page) => page.id)) : new Set())
  }

  useEffect(() => {
    setSelectedPageIds((current) => {
      const validIds = new Set(documentPages.map((page) => page.id))
      const next = new Set([...current].filter((id) => validIds.has(id)))
      const shouldSelectAll = current.size === 0 || next.size === 0
      if (shouldSelectAll) {
        documentPages.forEach((page) => next.add(page.id))
      }
      return next
    })
  }, [documentPages])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(2, 6, 23, 0.84)', backdropFilter: 'blur(10px)' }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-6xl rounded-t-3xl sm:rounded-[28px] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        style={{
          background: '#08101f',
          border: '1px solid #1e2d40',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 20px)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div
          className="flex items-start justify-between gap-4 p-5 sm:p-6 shrink-0"
          style={{
            borderBottom: '1px solid #1e2d40',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(10,14,26,0) 62%)',
          }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.28) 0%, rgba(212,175,55,0.08) 100%)',
                  border: '1px solid rgba(212,175,55,0.22)',
                }}
              >
                <FileDown size={18} style={{ color: '#d4af37' }} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">STRATUM Export Studio</p>
                <h2 id="export-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Build a report that feels intentional
                </h2>
              </div>
            </div>
            <p className="text-sm max-w-3xl" style={{ color: '#94a3b8' }}>
              Choose the planning window and export either a polished executive report or a dense forward planner built for print, markup, and review.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-colors hover:bg-white/5"
            aria-label="Close"
            style={{ color: '#94a3b8', border: '1px solid #1e2d40' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-6">
          <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] gap-5">
            <div className="space-y-5 min-w-0">
              <section
                className="rounded-[28px] p-5 sm:p-6 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(13,18,36,1) 0%, rgba(10,14,26,1) 60%, rgba(212,175,55,0.08) 100%)',
                  border: '1px solid #1e2d40',
                  position: 'relative',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle at top right, rgba(212,175,55,0.16), transparent 32%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: 'auto, 24px 24px, 24px 24px',
                    opacity: 0.55,
                    pointerEvents: 'none',
                  }}
                />
                <div className="relative space-y-5">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: '#d4af37' }}>
                        Report identity
                      </p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
                        {organizationName}
                      </h3>
                      <p className="text-sm mt-2" style={{ color: '#cbd5e1' }}>{plannerName}</p>
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl"
                      style={{ background: 'rgba(15, 23, 42, 0.78)', border: '1px solid rgba(212,175,55,0.22)' }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Coverage</p>
                      <p className="text-lg font-black mt-1" style={{ color: '#f8fafc' }}>{coverage}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Months', value: `${orderedMonths.length}`, tone: '#d4af37' },
                      { label: 'Month pages', value: `${monthPages || 0}`, tone: '#60a5fa' },
                      { label: 'Goals', value: `${selectedGoalCount}`, tone: '#34d399' },
                      { label: 'Themes', value: `${selectedThemeCount}`, tone: '#f97316' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl px-4 py-3"
                        style={{ background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(148,163,184,0.14)' }}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                        <p className="text-2xl font-black mt-1" style={{ color: item.tone }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Export mode</p>
                    <h3 className="text-lg font-black text-white mt-1">Choose the document shape</h3>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {([
                    ['executive-report', 'Executive Report', 'Strategic summary, goals, analysis, and calendar appendix.'],
                    ['forward-planner', 'Forward Planner', 'Readable month sheets for daily operational planning.'],
                  ] as const).map(([id, label, caption]) => {
                    const active = mode === id
                    return (
                      <button
                        key={id}
                        onClick={() => setMode(id)}
                        className="rounded-2xl p-4 text-left transition-all"
                        style={{
                          background: active ? 'rgba(212,175,55,0.14)' : '#08101f',
                          border: active ? '1px solid rgba(212,175,55,0.34)' : '1px solid #243447',
                        }}
                      >
                        <p className="text-base font-black" style={{ color: active ? '#fde68a' : '#f8fafc' }}>{label}</p>
                        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{caption}</p>
                      </button>
                    )
                  })}
                </div>
              </section>

              {mode === 'forward-planner' && (
                <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                  <div className="mb-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Forward planner layout</p>
                    <h3 className="text-lg font-black text-white mt-1">Choose the planning format</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    {([
                      ['quarter-overview', 'Quarter Overview', 'A4 landscape · 3 months per page, full-width columns. Best for at-a-glance planning.'],
                      ['monthly-detail', 'Monthly Detail', 'A4 landscape · One full-page month per sheet. Best for detailed daily review.'],
                      ['both', 'Both Formats', 'Quarter overview pages followed by monthly detail sheets. Complete planning pack.'],
                    ] as const).map(([id, label, caption]) => {
                      const active = (options.forwardPlannerLayout ?? 'quarter-overview') === id
                      return (
                        <button
                          key={id}
                          onClick={() => patchOptions({ forwardPlannerLayout: id })}
                          className="rounded-2xl p-4 text-left transition-all"
                          style={{
                            background: active ? 'rgba(212,175,55,0.14)' : '#08101f',
                            border: active ? '1px solid rgba(212,175,55,0.34)' : '1px solid #243447',
                          }}
                        >
                          <p className="text-sm font-black" style={{ color: active ? '#fde68a' : '#f8fafc' }}>{label}</p>
                          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{caption}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Year</p>
                    <h3 className="text-lg font-black text-white mt-1">Choose the report year</h3>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>Used for calendars and goals</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {yearOptions.map((year) => {
                    const active = selectedYear === year
                    return (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className="px-3 py-3 rounded-2xl text-sm font-black transition-all"
                        style={
                          active
                            ? {
                                background: '#d4af37',
                                color: '#08101f',
                                boxShadow: '0 10px 24px rgba(212,175,55,0.18)',
                              }
                            : {
                                background: '#111827',
                                color: '#94a3b8',
                                border: '1px solid #243447',
                              }
                        }
                      >
                        {year}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Print settings</p>
                    <h3 className="text-lg font-black text-white mt-1">Tune the export</h3>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="rounded-2xl p-4 flex items-center justify-between gap-4" style={{ background: '#08101f', border: '1px solid #243447' }}>
                    <span>
                      <span className="block text-sm font-bold text-white">Category legend</span>
                      <span className="block text-xs mt-1" style={{ color: '#94a3b8' }}>Show colour meaning on planner pages.</span>
                    </span>
                    <input type="checkbox" checked={options.includeLegend} onChange={(event) => patchOptions({ includeLegend: event.target.checked })} />
                  </label>
                  <label className="rounded-2xl p-4 flex items-center justify-between gap-4" style={{ background: '#08101f', border: '1px solid #243447' }}>
                    <span>
                      <span className="block text-sm font-bold text-white">Calendar appendix</span>
                      <span className="block text-xs mt-1" style={{ color: '#94a3b8' }}>
                        Add month sheets to the executive report.
                      </span>
                    </span>
                    <input type="checkbox" checked={options.includeAppendix} onChange={(event) => patchOptions({ includeAppendix: event.target.checked })} />
                  </label>
                  <div className="rounded-2xl p-4" style={{ background: '#08101f', border: '1px solid #243447' }}>
                    <p className="text-sm font-bold text-white mb-3">Density</p>
                    <div className="flex gap-2">
                      {(['compact', 'comfortable'] as const).map((density) => (
                        <button
                          key={density}
                          onClick={() => patchOptions({ density })}
                          className="compact-tap px-3 py-2 rounded-xl text-xs font-black uppercase tracking-[0.14em]"
                          style={options.density === density ? { background: '#d4af37', color: '#08101f' } : { background: '#111827', color: '#94a3b8', border: '1px solid #243447' }}
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: '#08101f', border: '1px solid #243447' }}>
                    <p className="text-sm font-bold text-white mb-3">Colour mode</p>
                    <div className="flex gap-2">
                      {(['full', 'economy'] as const).map((colourMode) => (
                        <button
                          key={colourMode}
                          onClick={() => patchOptions({ colourMode })}
                          className="compact-tap px-3 py-2 rounded-xl text-xs font-black uppercase tracking-[0.14em]"
                          style={options.colourMode === colourMode ? { background: '#d4af37', color: '#08101f' } : { background: '#111827', color: '#94a3b8', border: '1px solid #243447' }}
                        >
                          {colourMode === 'full' ? 'Full colour' : 'Economy'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Presets</p>
                    <h3 className="text-lg font-black text-white mt-1">Start from a strong export shape</h3>
                  </div>
                  <button
                    onClick={() => setSelection([])}
                    className="text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:text-white"
                    style={{ color: '#64748b' }}
                  >
                    Clear selection
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {presetButtons.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={preset.onClick}
                      className="rounded-2xl px-4 py-4 text-left transition-all hover:-translate-y-0.5"
                      style={{ background: '#08101f', border: '1px solid #243447' }}
                    >
                      <p className="text-sm font-black text-white">{preset.label}</p>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{preset.caption}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Month selection</p>
                    <h3 className="text-lg font-black text-white mt-1">Compose the calendar spread</h3>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>
                    {orderedMonths.length} selected
                  </p>
                </div>

                <div className="grid sm:grid-cols-4 gap-2.5 mb-4">
                  {QUARTERS.map((quarter) => {
                    const active = quarter.months.every((month) => selected.has(month))
                    return (
                      <button
                        key={quarter.label}
                        onClick={() => toggleQuarter(quarter.months)}
                        className="rounded-2xl px-3 py-3 text-left transition-all"
                        style={
                          active
                            ? {
                                background: 'rgba(212,175,55,0.14)',
                                color: '#f8fafc',
                                border: '1px solid rgba(212,175,55,0.32)',
                              }
                            : {
                                background: '#08101f',
                                color: '#94a3b8',
                                border: '1px solid #243447',
                              }
                        }
                      >
                        <p className="text-sm font-black">{quarter.label}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] mt-1">{quarter.title}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {MONTH_NAMES_FULL.map((name, index) => {
                    const month = index + 1
                    const active = selected.has(month)
                    const theme = monthThemes.get(month)
                    const isCurrentMonth = selectedYear === currentYear && month === currentMonth

                    return (
                      <button
                        key={month}
                        onClick={() => toggle(month)}
                        className="rounded-[22px] p-4 text-left transition-all"
                        style={
                          active
                            ? {
                                background: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.07) 100%)',
                                border: '1px solid rgba(212,175,55,0.34)',
                                boxShadow: '0 14px 28px rgba(0, 0, 0, 0.18)',
                              }
                            : {
                                background: '#08101f',
                                border: '1px solid #243447',
                              }
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: active ? '#fde68a' : '#64748b' }}>
                              {MONTH_SHORT[index]}
                            </p>
                            <p className="text-base font-black mt-1" style={{ color: active ? '#f8fafc' : '#cbd5e1' }}>
                              {name}
                            </p>
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              background: active ? '#d4af37' : '#111827',
                              border: active ? 'none' : '1px solid #243447',
                              color: active ? '#08101f' : '#64748b',
                            }}
                          >
                            {active ? <Check size={14} /> : <span className="text-[10px] font-black">+</span>}
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] leading-5 truncate" style={{ color: theme ? '#f59e0b' : '#64748b' }}>
                              {theme || QUARTERS[Math.floor(index / 3)].title}
                            </p>
                          </div>
                          {isCurrentMonth && (
                            <span
                              className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em] shrink-0"
                              style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.2)' }}
                            >
                              Live
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>

            <div className="space-y-5 min-w-0 xl:sticky xl:top-0 self-start">
              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} style={{ color: '#d4af37' }} />
                  <h3 className="text-lg font-black text-white">Report summary</h3>
                </div>

                <div className="rounded-2xl p-4 mb-4" style={{ background: '#08101f', border: '1px solid #243447' }}>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Coverage</p>
                  <p className="text-xl font-black text-white mt-2">{coverage}</p>
                  <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
                    {selectedEventCount} scheduled event{selectedEventCount === 1 ? '' : 's'} start inside this window.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: CalendarRange, label: 'Pages', value: `${totalPages || 0}` },
                    { icon: Layers3, label: 'Month sheets', value: `${monthPages || 0}` },
                    { icon: Target, label: 'Year goals', value: `${selectedGoalCount}` },
                    { icon: CalendarDays, label: 'Selected months', value: `${orderedMonths.length}` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl p-4"
                      style={{ background: '#08101f', border: '1px solid #243447' }}
                    >
                      <item.icon size={15} style={{ color: '#d4af37' }} />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] mt-3 text-slate-500">{item.label}</p>
                      <p className="text-2xl font-black mt-1 text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl p-4" style={{ background: '#08101f', border: '1px solid #243447' }}>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Document flow</p>
                  <div className="space-y-3 mt-3">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>1</span>
                      <div>
                        <p className="text-sm font-bold text-white">Authored cover page</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>Identity, year framing, metrics, and selected month themes.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd' }}>2</span>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {mode === 'forward-planner'
                            ? (options.forwardPlannerLayout === 'monthly-detail' ? 'Monthly detail sheets' : options.forwardPlannerLayout === 'both' ? 'Quarter overview + monthly detail' : 'Quarter overview pages')
                            : 'Report analysis'}
                        </p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>
                          {mode === 'forward-planner'
                            ? (options.forwardPlannerLayout === 'monthly-detail'
                                ? 'One full-page landscape sheet per month for detailed daily review.'
                                : options.forwardPlannerLayout === 'both'
                                ? 'Full A4 landscape quarterly spreads, then one page per month for detail.'
                                : 'Full A4 landscape pages — 3 months across the full width per quarter.')
                            : 'Year, quarter, category, and recurring rhythm intelligence.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(52,211,153,0.12)', color: '#6ee7b7' }}>3</span>
                      <div>
                        <p className="text-sm font-bold text-white">Strategic goals</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>
                          {selectedGoalCount > 0 ? 'Included automatically for the selected year.' : 'Included as a structured framework even before goals exist.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Page preview</p>
                    <h3 className="text-lg font-black text-white mt-1">Choose exactly what prints</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllPages(true)}
                      className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.14em]"
                      style={{ background: '#111827', color: '#f8fafc', border: '1px solid #243447' }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAllPages(false)}
                      className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.14em]"
                      style={{ background: '#111827', color: '#94a3b8', border: '1px solid #243447' }}
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {documentPages.map((page, index) => {
                    const active = selectedPageIds.has(page.id)
                    return (
                      <button
                        key={page.id}
                        onClick={() => togglePage(page.id)}
                        className="w-full rounded-2xl p-3.5 text-left transition-all"
                        style={{
                          background: active ? 'rgba(212,175,55,0.12)' : '#08101f',
                          border: active ? '1px solid rgba(212,175,55,0.32)' : '1px solid #243447',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
                            style={{
                              background: active ? '#d4af37' : '#111827',
                              color: active ? '#08101f' : '#64748b',
                              border: active ? 'none' : '1px solid #243447',
                            }}
                          >
                            {active ? <Check size={14} /> : index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-sm font-black" style={{ color: active ? '#f8fafc' : '#cbd5e1' }}>
                                {page.title}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-[0.16em] shrink-0" style={{ color: active ? '#fde68a' : '#64748b' }}>
                                {page.orientation}
                              </span>
                            </span>
                            <span className="block text-xs mt-1" style={{ color: '#94a3b8' }}>{page.description}</span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-[28px] p-5 sm:p-6" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
                <h3 className="text-lg font-black text-white mb-4">Theme carry-through</h3>
                {selectedThemeLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedThemeLabels.map((label) => (
                      <span
                        key={label}
                        className="px-3 py-2 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    No month themes are set for the selected range yet. Add them in the planner to give the exported cover stronger strategic framing.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3" style={{ borderTop: '1px solid #1e2d40', background: '#08101f' }}>
          <button
            onClick={onClose}
            className="sm:w-auto px-4 py-3 rounded-2xl text-sm font-bold transition-colors hover:bg-white/5"
            style={{ color: '#94a3b8', border: '1px solid #243447' }}
          >
            Cancel
          </button>

          <div className="flex-1 min-w-0 px-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Export action</p>
            <p className="text-sm truncate" style={{ color: '#94a3b8' }}>
              Generates {totalPages} selected page{totalPages === 1 ? '' : 's'} directly as a PDF — no browser dialog required.
            </p>
          </div>

          <button
            onClick={() => {
              if (orderedMonths.length === 0 || selectedDocumentPages.length === 0) return
              onExport({
                mode,
                year: selectedYear,
                months: orderedMonths,
                options: {
                  ...options,
                  pageIds: selectedDocumentPages.map((page) => page.id),
                },
              })
            }}
            disabled={orderedMonths.length === 0 || selectedDocumentPages.length === 0}
            className="sm:min-w-72 px-5 py-3.5 rounded-2xl text-sm font-black tracking-[0.16em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #f0d777 100%)',
              color: '#08101f',
              boxShadow: '0 16px 32px rgba(212,175,55,0.22)',
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              Generate {mode === 'forward-planner' ? 'Planner' : 'Report'}
              <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
