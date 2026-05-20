import { CalendarDays, CalendarRange, Calendar, Target, BarChart2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const tabs: { path: string; label: string; icon: React.ElementType }[] = [
  { path: '/planner',   label: 'Annual',    icon: CalendarDays },
  { path: '/monthly',   label: 'Monthly',   icon: CalendarRange },
  { path: '/weekly',    label: 'Weekly',    icon: Calendar },
  { path: '/goals',     label: 'Goals',     icon: Target },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart2 },
]

export function BottomNavigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

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
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
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
