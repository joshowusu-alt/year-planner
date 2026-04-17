import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Loader2, Upload, X, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import { importCalendarEventsFromIcs, type CalendarImportResult } from '../lib/calendarImport'

interface Props {
  onClose: () => void
}

export function IcsImportModal({ onClose }: Props) {
  const { store, bulkAddEvents } = usePlanner()
  const [selectedCategory, setSelectedCategory] = useState(
    store.categories.find((category) => category.id === 'general')?.id ?? store.categories[0]?.id ?? 'general',
  )
  const [fileName, setFileName] = useState('')
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [summary, setSummary] = useState<CalendarImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completedCount, setCompletedCount] = useState<number | null>(null)

  useEffect(() => {
    if (!rawText) return

    let cancelled = false
    setParsing(true)
    setError(null)

    importCalendarEventsFromIcs(rawText, store.events, selectedCategory)
      .then((result) => {
        if (!cancelled) {
          setSummary(result)
        }
      })
      .catch((importError) => {
        if (!cancelled) {
          setSummary(null)
          setError(importError instanceof Error ? importError.message : 'Could not read this calendar file.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setParsing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [rawText, selectedCategory, store.events])

  const previewEvents = useMemo(() => summary?.events.slice(0, 5) ?? [], [summary])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setCompletedCount(null)
    setSummary(null)
    setError(null)
    setFileName(file.name)

    const text = await file.text()
    setRawText(text)
  }

  function handleImport() {
    if (!summary || summary.events.length === 0) return
    bulkAddEvents(summary.events)
    setCompletedCount(summary.events.length)
    setRawText('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ics-import-title"
        style={{
          background: '#0d1224',
          border: '1px solid #1e2d40',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)',
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between p-5 pb-4 shrink-0"
          style={{ background: '#0d1224', borderBottom: '1px solid #1e2d40' }}
        >
          <div>
            <h2
              id="ics-import-title"
              className="text-lg font-black tracking-wider uppercase"
              style={{ color: '#d4af37' }}
            >
              Import Calendar
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              Upload an .ics file from Google Calendar, Apple Calendar, or Outlook. This is a one-time import.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            style={{ color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Imported event category
              </label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
              >
                {store.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </div>

            <label
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderColor: '#243447', color: '#94a3b8' }}
            >
              <FileUp size={20} style={{ color: '#d4af37' }} />
              <div>
                <p className="text-sm font-semibold text-white">Choose an .ics file</p>
                <p className="text-xs text-slate-500 mt-1">Recurring events with unsupported rules will be imported as one-time events.</p>
              </div>
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37' }}
              >
                <Upload size={14} /> Select file
              </span>
              <input type="file" accept=".ics,.ical,text/calendar" className="hidden" onChange={handleFileChange} />
            </label>

            {fileName && (
              <p className="text-xs text-slate-500">
                Selected file: <span className="text-slate-300">{fileName}</span>
              </p>
            )}
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
              <Loader2 size={16} className="animate-spin" />
              Parsing calendar file…
            </div>
          )}

          {error && (
            <div
              className="rounded-xl p-4 flex items-start gap-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {summary && !completedCount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Found', value: summary.totalFound },
                  { label: 'Ready', value: summary.events.length },
                  { label: 'Duplicates', value: summary.duplicateCount },
                  { label: 'Warnings', value: summary.unsupportedRecurrenceCount + summary.skippedCount },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3"
                    style={{ background: '#111827', border: '1px solid #1e2d40' }}
                  >
                    <p className="text-xs uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="text-lg font-bold text-white mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              {previewEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Preview
                  </p>
                  <div className="space-y-2">
                    {previewEvents.map((event) => (
                      <div
                        key={`${event.date}-${event.title}-${event.startTime ?? 'all-day'}`}
                        className="rounded-xl p-3"
                        style={{ background: '#111827', border: '1px solid #1e2d40' }}
                      >
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {event.date}{event.startTime ? ` at ${event.startTime}` : ' (all day)'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Import notes
                  </p>
                  <div className="space-y-2">
                    {summary.issues.slice(0, 6).map((issue, index) => (
                      <div
                        key={`${issue.title}-${index}`}
                        className="rounded-xl p-3 text-sm"
                        style={{ background: '#111827', border: '1px solid #1e2d40' }}
                      >
                        <p className="text-white font-medium">{issue.title}</p>
                        <p className="text-slate-500 mt-1">{issue.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {completedCount !== null && summary && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#4ade80' }}>
                <CheckCircle2 size={16} />
                Imported {completedCount} events
              </div>
              <p className="text-xs text-slate-400">
                {summary.duplicateCount} duplicate{summary.duplicateCount === 1 ? '' : 's'} skipped, {summary.unsupportedRecurrenceCount} recurring event{summary.unsupportedRecurrenceCount === 1 ? '' : 's'} imported as one-time, {summary.skippedCount} event{summary.skippedCount === 1 ? '' : 's'} skipped.
              </p>
            </div>
          )}
        </div>

        <div
          className="shrink-0 flex gap-2 justify-end px-5 py-4"
          style={{ borderTop: '1px solid #1e2d40', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg">
            {completedCount !== null ? 'Close' : 'Cancel'}
          </button>
          {completedCount === null && (
            <button
              onClick={handleImport}
              disabled={!summary || summary.events.length === 0 || parsing}
              className="px-5 py-2 rounded-lg text-sm font-bold"
              style={{
                background: '#d4af37',
                color: '#111827',
                opacity: !summary || summary.events.length === 0 || parsing ? 0.5 : 1,
                cursor: !summary || summary.events.length === 0 || parsing ? 'not-allowed' : 'pointer',
              }}
            >
              Import {summary?.events.length ?? 0} Events
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
