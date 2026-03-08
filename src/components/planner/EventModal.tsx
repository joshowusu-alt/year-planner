import { useState, useMemo, type FormEvent } from 'react'
import { X, Trash2, Save, RotateCcw, ChevronDown } from 'lucide-react'
import type { PlannerEvent, RecurrenceRule, RecurrenceType } from '../../types'
import { RECURRENCE_LABELS } from '../../types'
import { usePlanner } from '../../context/PlannerContext'

interface Props {
  /** null = add mode */
  event?: PlannerEvent | null
  /** Pre-fill date when adding from a cell */
  defaultDate?: string
  onSave: (data: {
    date: string
    title: string
    category: string
    notes?: string
    recurrence?: RecurrenceRule
  }) => void
  onDelete?: (id: string) => void
  onClose: () => void
}


export function EventModal({ event, defaultDate, onSave, onDelete, onClose }: Props) {
  const isEdit = Boolean(event)
  const { store } = usePlanner()
  const { categories } = store

  const [date, setDate] = useState(event?.date ?? defaultDate ?? '')
  const [title, setTitle] = useState(event?.title ?? '')
  const [category, setCategory] = useState<string>(
    event?.category ?? (categories[0]?.id ?? '')
  )
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    event?.recurrence?.type ?? 'none'
  )
  const [recurrenceUntil, setRecurrenceUntil] = useState(event?.recurrence?.until ?? '')
  const [showAllCategories, setShowAllCategories] = useState(false)

  // If editing a virtual occurrence, show the base id for context
  const isVirtual = Boolean(event && event.id.includes('__'))

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
    const recurrence: RecurrenceRule | undefined =
      recurrenceType !== 'none'
        ? { type: recurrenceType, until: recurrenceUntil || undefined }
        : undefined
    onSave({ date, title: title.trim(), category, notes: notes.trim() || undefined, recurrence })
    onClose()
  }

  function handleDelete() {
    if (event && onDelete) {
      if (window.confirm(`Delete "${event.title}"?`)) {
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
          <h2 className="text-lg font-bold tracking-wide" style={{ color: '#d4af37' }}>
            {isEdit ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
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
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                background: '#1e2d40',
                border: '1px solid #243447',
                color: '#e2e8f0',
                colorScheme: 'dark',
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

          {/* Recurring event notice */}
          {isVirtual && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#94a3b8' }}
            >
              <RotateCcw size={12} className="shrink-0" style={{ color: '#d4af37' }} />
              Changes to this recurring event will apply to <strong className="text-slate-300">all occurrences</strong>.
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

          {/* Recurrence */}
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

        </div>
        {/* Sticky action footer — outside scroll area, respects safe-area-inset-bottom */}
        <div
          className="shrink-0 flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #1e2d40', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-red-900/40"
              style={{ color: '#f87171', border: '1px solid #991b1b' }}
            >
              <Trash2 size={14} />
              Delete
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
            {isEdit ? 'Update' : 'Add Event'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
