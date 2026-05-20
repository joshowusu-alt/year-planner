import { CalendarDays, CalendarRange, Calendar, Target, CheckSquare, FileText, Settings, ChevronRight, LogOut, Layers, Search, BarChart2, FileDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePlanner } from '../../context/PlannerContext'
import { useAuth } from '../../context/AuthContext'
import { SyncStatusIndicator } from './SyncStatusIndicator'

interface Props {
  onExportRequest?: () => void
}

const mainItems: { path: string; label: string; icon: React.ElementType }[] = [
  { path: '/planner',   label: 'Annual View',  icon: CalendarDays },
  { path: '/monthly',   label: 'Monthly View', icon: CalendarRange },
  { path: '/weekly',    label: 'Weekly View',  icon: Calendar },
  { path: '/goals',     label: 'Goals',        icon: Target },
  { path: '/tasks',     label: 'Tasks',        icon: CheckSquare },
  { path: '/strategy',  label: 'Strategy',     icon: Layers },
  { path: '/dashboard', label: 'Dashboard',    icon: BarChart2 },
  { path: '/notes',     label: 'Notes',        icon: FileText },
  { path: '/search',    label: 'Search',       icon: Search },
]

const bottomItems: { path: string; label: string; icon: React.ElementType }[] = [
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ onExportRequest }: Props) {
  const { store, isSyncing, forceSync, lastSyncedAt, syncError, syncMode } = usePlanner()
  const { user, signOut, isConfigured } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: '#0d1224',
        borderRight: '1px solid #1e2d40',
      }}
    >
      {/* Logo / Org name */}
      <div
        className="px-5 py-5 flex flex-col gap-1"
        style={{ borderBottom: '1px solid #1e2d40' }}
      >
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt="Logo"
            className="h-10 w-auto object-contain mb-1"
          />
        ) : (
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="STRATUM" className="h-9 w-9 rounded-lg shrink-0" />
            <div
              className="text-xl font-black tracking-widest"
              style={{ color: '#d4af37' }}
            >
              {store.organizationName || 'My Planner'}
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500 leading-tight uppercase tracking-wider">
          {store.plannerTitle || 'Executive Planning System'}
        </p>
      </div>

      {/* Main nav */}
      <nav role="navigation" aria-label="Main navigation" className="flex-1 py-4 px-3 space-y-1">
        {mainItems.map(({ path, label, icon: Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              title={label}
              className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active ? { background: '#1e2d40', color: '#d4af37' } : { color: '#94a3b8' }}
            >
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </button>
          )
        })}
      </nav>

      {/* Bottom: settings + user */}
      <div className="px-3 pb-4 space-y-1" style={{ borderTop: '1px solid #1e2d40', paddingTop: '0.75rem' }}>
        {onExportRequest && (
          <button
            onClick={onExportRequest}
            className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#94a3b8' }}
            title="Export as PDF"
          >
            <FileDown size={16} />
            Export PDF
          </button>
        )}
        {bottomItems.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-current={pathname === path ? 'page' : undefined}
            aria-label={label}
            title={label}
            className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={pathname === path ? { background: '#1e2d40', color: '#d4af37' } : { color: '#94a3b8' }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}

        {user && user.id !== 'local-guest' && (
          <div
            className="rounded-lg px-3 py-2.5 space-y-2"
            style={{ background: '#111827', border: '1px solid #1e2d40' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt={user.fullName ?? ''} className="w-6 h-6 rounded-full shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{user.fullName ?? user.email}</p>
                {isConfigured && (
                  <SyncStatusIndicator
                    syncMode={syncMode}
                    lastSyncedAt={lastSyncedAt}
                    syncError={syncError}
                    onForceSync={forceSync}
                    disabled={isSyncing}
                    compact
                  />
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-red-900/30"
              style={{ color: '#f87171', border: '1px solid #3f1515' }}
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
