import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { X, Plus, Pencil, Trash2 } from 'lucide-react'
import { usePlanner } from '../../context/PlannerContext'
import type { PlannerEvent } from '../../types'
import { getCategoryStyle } from '../../types'

interface Props {
  date: string | null           // yyyy-MM-dd or null to close
  onClose: () => void
  onAddEvent: (date: string) => void
  onEditEvent: (event: PlannerEvent) => void
}

export function EventBottomSheet({ date, onClose, onAddEvent, onEditEvent }: Props) {
  const { getEventsForDate, removeEvent, store } = usePlanner()
  const [visible, setVisible] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Animate in
  useEffect(() => {
    if (date) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [date])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  if (!date) return null

  const events = getEventsForDate(date)
  const displayDate = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[75vh] flex flex-col transition-transform duration-300 ease-out md:hidden ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ background: '#111827', border: '1px solid #1e2d40', borderBottom: 'none' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-3"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <div>
            <h3 className="text-sm font-bold text-white">{displayDate}</h3>
            <p className="text-xs text-slate-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No events this day</p>
              <p className="text-xs text-slate-600 mt-1">Tap below to add one</p>
            </div>
          ) : (
            events.map((ev) => {
              const catStyle = getCategoryStyle(ev.category, store.categories)
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3 rounded-xl active:bg-white/5"
                  style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ background: catStyle.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: catStyle.color }}>
                      {ev.title}
                    </p>
                    {ev.notes && (
                      <p className="text-xs text-slate-500 truncate">{ev.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onEditEvent(ev)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10"
                  >
                    <Pencil size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${ev.title}"?`)) {
                        removeEvent(ev.id)
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-red-900/30"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Add event button */}
        <div className="px-5 py-4 safe-bottom" style={{ borderTop: '1px solid #1e2d40' }}>
          <button
            onClick={() => onAddEvent(date)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            <Plus size={16} />
            Add Event
          </button>
        </div>
      </div>
    </>
  )
}
