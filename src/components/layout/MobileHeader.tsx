import { Menu, Plus } from 'lucide-react'
import { usePlanner } from '../../context/PlannerContext'

interface Props {
  onMenuToggle: () => void
  onAddEvent: () => void
}

export function MobileHeader({ onMenuToggle, onAddEvent }: Props) {
  const { store } = usePlanner()

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 shrink-0 md:hidden"
      style={{ background: '#0d1224', borderBottom: '1px solid #1e2d40' }}
    >
      {/* Left: hamburger */}
      <button
        onClick={onMenuToggle}
        className="w-11 h-11 flex items-center justify-center rounded-xl active:bg-white/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-slate-300" />
      </button>

      {/* Center: app name */}
      <div className="text-center min-w-0">
        <h1
          className="text-sm font-black tracking-widest uppercase truncate"
          style={{ color: '#d4af37' }}
        >
          {store.organizationName || 'STRATUM'}
        </h1>
      </div>

      {/* Right: + Add Event */}
      <button
        onClick={onAddEvent}
        className="h-11 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold active:scale-95 transition-transform"
        style={{ background: '#d4af37', color: '#111827' }}
      >
        <Plus size={14} />
        <span className="hidden xs:inline">Event</span>
      </button>
    </header>
  )
}
