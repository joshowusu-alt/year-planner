import { useState, useMemo } from 'react'
import { Search, CalendarDays, Target, CheckSquare, FileText, X } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import type { Page } from '../components/layout/Sidebar'

interface Props {
  onNavigate: (p: Page) => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function highlight(text: string, query: string) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: '#d4af3740', color: '#d4af37', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

export function SearchPage({ onNavigate }: Props) {
  const { store } = usePlanner()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!q) return { events: [], goals: [], tasks: [], notes: [] }

    const events = store.events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    )

    const goals = store.goals.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
    )

    const tasks = store.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    )

    const notes = store.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q)
    )

    return { events, goals, tasks, notes }
  }, [q, store.events, store.goals, store.tasks, store.notes])

  const totalResults = results.events.length + results.goals.length + results.tasks.length + results.notes.length

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0e1a', minHeight: '100%' }}>
      {/* Search header */}
      <div
        className="shrink-0 px-4 py-4"
        style={{ borderBottom: '1px solid #1e2d40' }}
      >
        <h1 className="text-lg font-black tracking-widest uppercase mb-3" style={{ color: '#d4af37' }}>
          Search
        </h1>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          {/* font-size ≥ 16px prevents iOS Safari zoom */}
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, goals, tasks, notes…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:ring-2"
            style={{
              background: '#1e2d40',
              border: '1px solid #243447',
              color: '#e2e8f0',
              fontSize: 'max(16px, 0.875rem)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-slate-500 hover:text-slate-300 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {!q && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">Type to search across all your data</p>
            <p className="text-slate-600 text-xs mt-1">Events, goals, tasks, and notes</p>
          </div>
        )}

        {q && totalResults === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Events */}
        {results.events.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Events ({results.events.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {results.events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onNavigate('planner')}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                  style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
                >
                  <p className="text-sm font-semibold text-white">
                    {highlight(ev.title, query.trim())}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ev.date}
                    {ev.startTime && ` · ${ev.startTime}`}
                    {ev.notes && ` · ${ev.notes.slice(0, 60)}${ev.notes.length > 60 ? '…' : ''}`}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Goals */}
        {results.goals.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Goals ({results.goals.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {results.goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onNavigate('goals')}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                  style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
                >
                  <p className="text-sm font-semibold text-white">
                    {highlight(g.title, query.trim())}
                  </p>
                  {g.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {highlight(g.description.slice(0, 80), query.trim())}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">Q{g.quarter} {g.year} · {g.status}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tasks */}
        {results.tasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tasks ({results.tasks.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onNavigate('tasks')}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                  style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
                >
                  <p className={`text-sm font-semibold ${t.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                    {highlight(t.title, query.trim())}
                  </p>
                  {t.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {highlight(t.description.slice(0, 80), query.trim())}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">{t.priority} · {t.period}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {results.notes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} style={{ color: '#d4af37' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notes ({results.notes.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {results.notes.map((n) => {
                const plain = stripHtml(n.content)
                return (
                  <button
                    key={n.id}
                    onClick={() => onNavigate('notes')}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                    style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
                  >
                    <p className="text-sm font-semibold text-white">
                      {highlight(n.title, query.trim())}
                    </p>
                    {plain && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {plain.slice(0, 120)}{plain.length > 120 ? '…' : ''}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">{n.periodType} · {n.periodRef}</p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Bottom padding — clears mobile bottom nav + safe area */}
        <div className="h-20" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  )
}
