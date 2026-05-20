import { X, FileText, Settings, LogOut, CheckSquare, Layers, BarChart2, Search, FileDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePlanner } from '../../context/PlannerContext'
import { SyncStatusIndicator } from './SyncStatusIndicator'

interface Props {
  open: boolean
  onClose: () => void
  onExportRequest?: () => void
}

const drawerItems: { path: string; label: string; icon: React.ElementType }[] = [
  { path: '/tasks',     label: 'Tasks',     icon: CheckSquare },
  { path: '/strategy',  label: 'Strategy',  icon: Layers },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { path: '/search',    label: 'Search',    icon: Search },
  { path: '/notes',     label: 'Notes',     icon: FileText },
  { path: '/settings',  label: 'Settings',  icon: Settings },
]

export function MobileDrawer({ open, onClose, onExportRequest }: Props) {
  const { user, signOut, isConfigured } = useAuth()
  const { store, isSyncing, forceSync, lastSyncedAt, syncError, syncMode } = usePlanner()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleNav(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col md:hidden transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0d1224', borderRight: '1px solid #1e2d40' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-14"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <div
            className="text-lg font-black tracking-widest uppercase"
            style={{ color: '#d4af37' }}
          >
            {store.organizationName || 'STRATUM'}
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <p className="px-5 pt-2 text-xs text-slate-500 uppercase tracking-wider">
          {store.plannerTitle || 'Executive Planning System'}
        </p>

        {/* Nav items not in bottom bar */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {drawerItems.map(({ path, label, icon: Icon }) => {
            const active = pathname === path
            return (
              <button
                key={path}
                onClick={() => handleNav(path)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:bg-white/10"
                style={active ? { background: '#1e2d40', color: '#d4af37' } : { color: '#94a3b8' }}
              >
                <Icon size={18} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Export PDF */}
        {onExportRequest && (
          <div className="px-4 pb-3">
            <button
              onClick={() => { onExportRequest(); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:bg-white/10"
              style={{ color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)' }}
            >
              <FileDown size={18} />
              Export PDF
            </button>
          </div>
        )}

        {/* User section */}
        {user && user.id !== 'local-guest' && (
          <div
            className="mx-4 mb-4 rounded-xl p-4 space-y-3"
            style={{ background: '#111827', border: '1px solid #1e2d40' }}
          >
            <div className="flex items-center gap-3">
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300 truncate">{user.fullName ?? user.email}</p>
                {isConfigured && (
                  <SyncStatusIndicator
                    syncMode={syncMode}
                    lastSyncedAt={lastSyncedAt}
                    syncError={syncError}
                    onForceSync={forceSync}
                    disabled={isSyncing}
                  />
                )}
              </div>
            </div>
            <button
              onClick={() => { signOut(); onClose() }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors active:bg-red-900/30"
              style={{ color: '#f87171', border: '1px solid #3f1515' }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  )
}
