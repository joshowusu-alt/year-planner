import { CalendarDays, CalendarRange, Calendar, Target, Search } from 'lucide-react'
import type { Page } from './Sidebar'

interface Props {
  page: Page
  onNavigate: (p: Page) => void
}

const tabs: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'planner',  label: 'Annual',   icon: CalendarDays },
  { id: 'monthly',  label: 'Monthly',  icon: CalendarRange },
  { id: 'weekly',   label: 'Weekly',   icon: Calendar },
  { id: 'goals',    label: 'Goals',    icon: Target },
  { id: 'search',   label: 'Search',   icon: Search },
]

export function BottomNavigation({ page, onNavigate }: Props) {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden safe-bottom"
      style={{
        background: '#0d1224',
        borderTop: '1px solid #1e2d40',
      }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = page === id
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className="focus-ring flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 active:bg-white/5 transition-colors"
            style={{ color: active ? '#d4af37' : '#64748b' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[10px] font-semibold tracking-wide">
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
