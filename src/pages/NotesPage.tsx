import { useState } from 'react'
import { Plus, Trash2, Pin, Search, Tag, FileText, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { usePlanner } from '../context/PlannerContext'
import type { Note, NotePeriod, PriorityLevel } from '../types'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../types'
import { ModalSheet } from '../components/ModalSheet'

// ─── Note modal ───────────────────────────────────────────────────────────────

function NoteModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Note>
  onSave: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
}) {
  const { currentYear } = usePlanner()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [period, setPeriod] = useState<NotePeriod>(initial?.periodType ?? 'week')
  const [priority, setPriority] = useState<PriorityLevel>(initial?.priority ?? 'medium')
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '))
  const [pinned, setPinned] = useState(initial?.pinned ?? false)

  const pinButton = (
    <button
      onClick={() => setPinned(!pinned)}
      aria-label={pinned ? 'Unpin note' : 'Pin note'}
      className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1.5 ${
        pinned ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-500 hover:bg-white/5'
      }`}
    >
      <Pin size={12} />
      {pinned ? 'Pinned' : 'Pin'}
    </button>
  )

  const footer = (
    <div className="flex gap-2 justify-end px-4 py-3">
      <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg">
        Cancel
      </button>
      <button
        onClick={() => {
          if (!title.trim()) return
          const tags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
          onSave({
            title: title.trim(),
            content: content.trim(),
            periodType: period,
            periodRef: '',
            year: currentYear,
            priority,
            tags,
            pinned,
          })
          onClose()
        }}
        className="px-5 py-2 rounded-lg text-sm font-bold"
        style={{ background: '#d4af37', color: '#111827' }}
      >
        Save Note
      </button>
    </div>
  )

  return (
    <ModalSheet
      title={initial?.id ? 'Edit Note' : 'New Note'}
      onClose={onClose}
      footer={footer}
      maxWidth="sm:max-w-lg"
      headerActions={pinButton}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
        style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note here..."
        rows={4}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
        style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0', lineHeight: '1.6' }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as NotePeriod)}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Tags (comma separated)</label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. ministry, budget, vision"
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
        />
      </div>
    </ModalSheet>
  )
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: Note }) {
  const { removeNote, editNote } = usePlanner()
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const preview = note.content.length > 120 && !expanded
  const displayContent = preview ? note.content.slice(0, 120) + '…' : note.content

  return (
    <>
      <div
        className="px-3 py-2.5 rounded-xl group transition-all relative"
        style={{ background: '#0d1224', border: `1px solid ${note.pinned ? '#d4af3740' : '#1e2d40'}` }}
      >
        {note.pinned && (
          <Pin size={10} className="absolute top-3 right-10 text-yellow-400 opacity-60" />
        )}

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: PRIORITY_COLORS[note.priority ?? 'medium'] }}
              />
              <h3 className="font-semibold text-sm text-white truncate">{note.title}</h3>
            </div>

            <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
              {displayContent}
            </p>

            {note.content.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs mt-1 flex items-center gap-1 text-slate-500 hover:text-slate-300"
              >
                <ChevronDown size={10} className={expanded ? 'rotate-180' : ''} />
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-slate-600 uppercase tracking-wider">{note.periodType}</span>
              {(note.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#1e2d40', color: '#64748b' }}
                >
                  #{tag}
                </span>
              ))}
              <span className="ml-auto text-xs text-slate-700">
                {note.updatedAt ? format(new Date(note.updatedAt), 'MMM d, yyyy') : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              aria-label={`Edit note: ${note.title}`}
              className="p-1.5 rounded hover:bg-white/10 text-slate-400"
              onClick={() => setEditing(true)}
            >
              <FileText size={13} />
            </button>
            <button
              aria-label={`Delete note: ${note.title}`}
              className="p-1.5 rounded hover:bg-red-900/30 text-red-400"
              onClick={() => { if (confirm('Delete note?')) removeNote(note.id) }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <NoteModal
          initial={note}
          onSave={(data) => editNote(note.id, data)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

// ─── Notes page ───────────────────────────────────────────────────────────────

export function NotesPage() {
  const { store, addNote, currentYear } = usePlanner()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState<NotePeriod | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string>('')

  const yearNotes = store.notes.filter((n) => n.year === currentYear)

  // Collect all tags across notes
  const allTags = Array.from(new Set(yearNotes.flatMap((n) => n.tags ?? [])))

  const filtered = yearNotes.filter((n) => {
    const searchOk =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const periodOk = periodFilter === 'all' || n.periodType === periodFilter
    const tagOk = !tagFilter || (n.tags ?? []).includes(tagFilter)
    return searchOk && periodOk && tagOk
  })

  // Pinned first, then by updatedAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '')
  })

  const pinnedCount = yearNotes.filter((n) => n.pinned).length

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 overflow-auto" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
        <div>
          <h2 className="text-xl font-black tracking-widest uppercase" style={{ color: '#d4af37' }}>
            Notes & Priorities
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentYear} · {yearNotes.length} notes · {pinnedCount} pinned
          </p>
        </div>
        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: '#111827', border: '1px solid #1e2d40' }}
        >
          <Search size={13} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="bg-transparent text-sm focus:outline-none w-48"
            style={{ color: '#e2e8f0' }}
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#d4af37', color: '#111827' }}
        >
          <Plus size={14} /> New Note
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'day', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodFilter(p)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize"
            style={
              periodFilter === p
                ? { background: '#d4af37', color: '#111827' }
                : { color: '#94a3b8', border: '1px solid #243447' }
            }
          >
            {p === 'all' ? 'All periods' : p}
          </button>
        ))}
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <Tag size={12} className="text-slate-500 self-center" />
          <button
            onClick={() => setTagFilter('')}
            className={`text-xs px-2 py-0.5 rounded-full ${
              !tagFilter ? 'bg-slate-600 text-white' : 'text-slate-500 border border-slate-700'
            }`}
          >
            All tags
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t === tagFilter ? '' : (t ?? ''))}
              className={`text-xs px-2 py-0.5 rounded-full ${
                tagFilter === t ? 'bg-slate-600 text-white' : 'text-slate-500 border border-slate-700'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Notes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
        {sorted.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(212,175,55,0.1)' }}>
              <FileText size={28} style={{ color: '#d4af37' }} />
            </div>
            <p className="text-sm font-black text-white mb-1">
              {search ? 'No notes match that search' : 'No notes yet'}
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {search ? `Try a different search term.` : 'Capture insights, decisions, and reflections as you plan.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: '#d4af37', color: '#0a0e1a' }}>
                + Add First Note
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <NoteModal
          onSave={(data) => addNote(data)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
