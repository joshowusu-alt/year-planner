import { useState, useMemo, useEffect, type FormEvent } from 'react'
import { X, Trash2, Save, RotateCcw, ChevronDown, Clock, Bell, AlertTriangle, Globe } from 'lucide-react'
import { canShowNotifications } from '../../lib/notifications'
import type { PlannerEvent, RecurrenceRule, RecurrenceType } from '../../types'
import { RECURRENCE_LABELS, getBaseEventId } from '../../types'
import { usePlanner } from '../../context/PlannerContext'

interface Props {
  /** null = add mode */
  event?: PlannerEvent | null
  /** Pre-fill date when adding from a cell */
  defaultDate?: string
  /** Pre-fill start time when adding from a time slot */
  defaultStartTime?: string
  onSave: (data: {
    date: string
    title: string
    category: string
    notes?: string
    recurrence?: RecurrenceRule
    startTime?: string
    endTime?: string
    reminder?: number | null
    timezone?: string
  }) => void
  onDelete?: (id: string) => void
  onClose: () => void
}


export function EventModal({ event, defaultDate, defaultStartTime, onSave, onDelete, onClose }: Props) {
  const isEdit = Boolean(event)
  const { store, editEventInstance, removeEventOccurrence } = usePlanner()
  const { categories } = store

  const [date, setDate] = useState(event?.date ?? defaultDate ?? '')
  const [title, setTitle] = useState(event?.title ?? '')
  const [category, setCategory] = useState<string>(
    event?.category ?? (categories[0]?.id ?? '')
  )
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [startTime, setStartTime] = useState(event?.startTime ?? defaultStartTime ?? '')
  const [endTime, setEndTime] = useState(event?.endTime ?? '')
  const [showTime, setShowTime] = useState(Boolean(event?.startTime) || Boolean(defaultStartTime))
  const [reminder, setReminder] = useState<number | null>(event?.reminder ?? null)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    event?.recurrence?.type ?? 'none'
  )
  const [recurrenceUntil, setRecurrenceUntil] = useState(event?.recurrence?.until ?? '')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [timezone, setTimezone] = useState<string>(
    event?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  // When editing a virtual occurrence: 'this' = only this date, 'all' = all occurrences
  const [scope, setScope] = useState<'this' | 'all'>(event?.id.includes('__') ? 'this' : 'all')

  // If editing a virtual occurrence, show the base id for context
  const isVirtual = Boolean(event && event.id.includes('__'))

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Sort categories by event usage frequency (most used first)
  const sortedCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    store.events.forEach((ev) => {
      counts[ev.category] = (counts[ev.category] ?? 0) + 1
    })
    return [...categories].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
  }, [categories, store.events])

  const TOP_N = 4
  const visibleCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, TOP_N)
  const hasMore = sortedCategories.length > TOP_N

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return

    if (isVirtual && scope === 'this') {
      // Save overrides for this date only — does NOT touch other occurrences
      editEventInstance(getBaseEventId(event!.id), event!.date, {
        title: title.trim(),
        category,
        notes: notes.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      })
      onClose()
      return
    }

    const recurrence: RecurrenceRule | undefined =
      recurrenceType !== 'none'
        ? { type: recurrenceType, until: recurrenceUntil || undefined }
        : undefined
    onSave({ date, title: title.trim(), category, notes: notes.trim() || undefined, recurrence, startTime: startTime || undefined, endTime: endTime || undefined, reminder: (showTime && startTime) ? reminder : null, timezone: showTime ? timezone : undefined })
    onClose()
  }

  function handleDelete() {
    if (!event) return
    if (isVirtual && scope === 'this') {
      // Skip just this occurrence — all other dates remain
      removeEventOccurrence(getBaseEventId(event.id), event.date)
      onClose()
      return
    }
    if (onDelete) {
      if (window.confirm(`Delete "${event.title}"? This will remove all occurrences.`)) {
        onDelete(event.id)
        onClose()
      }
    }
  }

  return (
    /* Backdrop — bottom-sheet on mobile, centered on sm+ */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        style={{
          background: '#111827',
          border: '1px solid #1e2d40',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)',
        }}
      >
        {/* Header — sticky */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl sm:rounded-t-xl shrink-0"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <h2 id="event-modal-title" className="text-lg font-bold tracking-wide" style={{ color: '#d4af37' }}>
            {isEdit ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="focus-ring p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Form — scrollable fields + sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              readOnly={isVirtual && scope === 'this'}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                background: '#1e2d40',
                border: '1px solid #243447',
                color: '#e2e8f0',
                colorScheme: 'dark',
                opacity: isVirtual && scope === 'this' ? 0.6 : 1,
                cursor: isVirtual && scope === 'this' ? 'default' : 'auto',
              }}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Event / Activity
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. BREAKTHROUGH TIME"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                background: '#1e2d40',
                border: '1px solid #243447',
                color: '#e2e8f0',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Category
            </label>
            {sortedCategories.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No categories yet — add some in Settings.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {visibleCategories.map((cat) => {
                    const active = category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all"
                        style={{
                          background: active ? cat.bgColor : 'transparent',
                          color: cat.color,
                          border: `1px solid ${active ? cat.color : '#243447'}`,
                          outline: active ? `2px solid ${cat.color}` : 'none',
                          outlineOffset: '2px',
                        }}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((v) => !v)}
                    className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    <ChevronDown
                      size={12}
                      className="transition-transform"
                      style={{ transform: showAllCategories ? 'rotate(180deg)' : 'none' }}
                    />
                    {showAllCategories ? 'Show less' : `Show all ${sortedCategories.length} categories`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Recurring event: scope toggle */}
          {isVirtual && (
            <div style={{ background: '#0d1224', border: '1px solid #243447', borderRadius: 8, padding: '10px 12px' }}>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Edit scope</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('this')}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={scope === 'this'
                    ? { background: '#d4af37', color: '#111827', border: '1px solid #d4af37' }
                    : { background: 'transparent', color: '#94a3b8', border: '1px solid #243447' }}
                >
                  This date only
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={scope === 'all'
                    ? { background: '#d4af37', color: '#111827', border: '1px solid #d4af37' }
                    : { background: 'transparent', color: '#94a3b8', border: '1px solid #243447' }}
                >
                  All occurrences
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional details..."
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
              style={{
                background: '#1e2d40',
                border: '1px solid #243447',
                color: '#e2e8f0',
              }}
            />
          </div>

          {/* Time — optional */}
          <div>
            <button
              type="button"
              onClick={() => { setShowTime((v) => !v); if (showTime) { setStartTime(''); setEndTime('') } }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-yellow-400 transition-colors uppercase tracking-wider mb-2"
            >
              <Clock size={11} />
              {showTime ? 'Remove time' : 'Add time (optional)'}
            </button>
            {showTime && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Start</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">End</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}
            {showTime && startTime && (
              <div className="mt-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Bell size={11} />
                  Reminder
                </label>
                <select
                  value={reminder ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setReminder(v === '' ? null : Number(v))
                  }}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none w-full"
                  style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                >
                  <option value="">No reminder</option>
                  <option value="0">At time of event</option>
                  <option value="5">5 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="120">2 hours before</option>
                  <option value="1440">1 day before</option>
                </select>
                {reminder !== null && !canShowNotifications() && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
                    <AlertTriangle size={10} />
                    Notifications not enabled — go to Settings to allow them.
                  </p>
                )}
              </div>
            )}
            {showTime && (
              <div className="mt-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Globe size={11} />
                  Timezone
                </label>
                <input
                  list="tz-list"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                  placeholder="e.g. Europe/London"
                />
                <datalist id="tz-list">
                  {(typeof Intl.supportedValuesOf === 'function'
                    ? Intl.supportedValuesOf('timeZone')
                    : ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney']
                  ).map((tz) => <option key={tz} value={tz} />)}
                </datalist>
              </div>
            )}
          </div>

          {/* Recurrence — hidden when editing a single instance */}
          {!(isVirtual && scope === 'this') && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              <RotateCcw size={11} />
              Repeat
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setRecurrenceType(rt)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: recurrenceType === rt ? '#d4af37' : 'transparent',
                    color: recurrenceType === rt ? '#111827' : '#94a3b8',
                    border: `1px solid ${recurrenceType === rt ? '#d4af37' : '#243447'}`,
                  }}
                >
                  {RECURRENCE_LABELS[rt]}
                </button>
              ))}
            </div>
            {recurrenceType !== 'none' && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Repeat Until (optional)
                </label>
                <input
                  type="date"
                  value={recurrenceUntil}
                  onChange={(e) => setRecurrenceUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: '#1e2d40',
                    border: '1px solid #243447',
                    color: '#e2e8f0',
                    colorScheme: 'dark',
                  }}
                />
                <p className="mt-1 text-xs text-slate-500">Leave blank to repeat indefinitely.</p>
              </div>
            )}
          </div>
          )}

        </div>
        {/* Sticky action footer — outside scroll area, respects safe-area-inset-bottom */}
        <div
          className="shrink-0 flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #1e2d40', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {isEdit && (onDelete || isVirtual) && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-red-900/40"
              style={{ color: '#f87171', border: '1px solid #991b1b' }}
            >
              <Trash2 size={14} />
              {isVirtual && scope === 'this' ? 'Skip this date' : 'Delete all'}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            <Save size={14} />
            {!isEdit ? 'Add Event' : isVirtual && scope === 'this' ? 'Save this date' : 'Update all'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
