import { useState, useRef } from 'react'
import { usePlanner } from '../../context/PlannerContext'
import type { VitalFew } from '../../types'

// ─── Component ───────────────────────────────────────────────────────────────

export function VitalFewPanel() {
  const ctx = usePlanner()
  const { store, currentWeekStart, currentYear } = ctx

  const items: VitalFew[] = (store.vitalFew ?? []).filter(
    (v: VitalFew) => v.weekStart === currentWeekStart,
  )

  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const atMax = items.length >= 5

  const handleAdd = () => {
    const title = newTitle.trim()
    if (!title) return
    ctx.addVitalFew({
      title,
      weekStart: currentWeekStart,
      year: currentYear,
      completed: false,
    })
    setNewTitle('')
    setIsAdding(false)
  }

  const handleToggle = (item: VitalFew) => {
    ctx.editVitalFew(item.id, { completed: !item.completed })
  }

  const handleDelete = (id: string) => {
    if (pendingDeleteId === id) {
      ctx.removeVitalFew(id)
      setPendingDeleteId(null)
    } else {
      setPendingDeleteId(id)
    }
  }

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: '#1e2d40', background: '#0d1224' }}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(212,175,55,0.15)' }}>
          <svg
            className="h-4 w-4"
            style={{ color: '#d4af37' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[#e2e8f0]">
          This Week&apos;s Vital Few
        </h2>
      </div>

      {/* Priority list */}
      {items.length === 0 && !isAdding ? (
        <p className="py-6 text-center text-sm text-[#64748b]">
          Set your 3–5 highest impact priorities for the week
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="group flex items-start gap-3 rounded-lg border p-3 transition-colors"
              style={{ borderColor: '#1e2d40', background: 'rgba(17,24,39,0.6)' }}
            >
              {/* Number badge */}
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}>
                {idx + 1}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium leading-snug ${
                    item.completed
                      ? 'text-[#64748b] line-through'
                      : 'text-[#e2e8f0]'
                  }`}
                >
                  {item.title}
                </span>
                {item.goalId && (
                  <span className="mt-0.5 block text-xs text-[#94a3b8]">
                    Linked to goal
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {/* Toggle completed */}
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:bg-white/10 hover:text-[#e2e8f0]"
                  aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {item.completed ? (
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  )}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    pendingDeleteId === item.id
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-[#64748b] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400'
                  }`}
                  aria-label={pendingDeleteId === item.id ? 'Confirm delete' : 'Delete'}
                  title={pendingDeleteId === item.id ? 'Click again to confirm' : 'Delete priority'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Inline add form */}
      {isAdding && (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setIsAdding(false)
                setNewTitle('')
              }
            }}
            placeholder="Priority title…"
            autoFocus
            className="min-h-11 flex-1 rounded-lg border px-3 text-sm text-[#e2e8f0] placeholder-[#64748b] outline-none transition-colors"
            style={{ borderColor: '#1e2d40', background: '#111827' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d40')}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: '#d4af37', color: '#0a0e1a' }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false)
              setNewTitle('')
            }}
            className="flex h-11 items-center justify-center rounded-lg border px-3 text-sm text-[#94a3b8] transition-colors hover:bg-white/10"
            style={{ borderColor: '#1e2d40' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add button */}
      {!isAdding && (
        <button
          type="button"
          onClick={() => {
            setIsAdding(true)
            setPendingDeleteId(null)
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
          disabled={atMax}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-sm text-[#94a3b8] transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#94a3b8]"
          style={{ borderColor: '#1e2d40' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {atMax ? 'Maximum 5 priorities reached' : 'Add Priority'}
        </button>
      )}
    </div>
  )
}
