import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { PlannerSyncMode } from '../../context/PlannerContext'

interface Props {
  syncMode: PlannerSyncMode
  lastSyncedAt: string | null
  syncError: string | null
  onForceSync: () => void
  disabled: boolean
  compact?: boolean
}

function getStatusMeta(syncMode: PlannerSyncMode, lastSyncedAt: string | null) {
  switch (syncMode) {
    case 'local':
      return { label: 'Local only', color: 'text-slate-400', Icon: CloudOff, title: 'Changes are stored locally on this device only.' }
    case 'syncing':
      return { label: 'Syncing...', color: 'text-amber-500', Icon: RefreshCw, title: 'Saving your latest planner changes to Supabase.' }
    case 'conflict':
      return { label: 'Conflict detected', color: 'text-amber-500', Icon: AlertTriangle, title: 'Remote data changed since your last sync. Force sync to reload the latest planner state.' }
    case 'error':
      return { label: 'Sync failed', color: 'text-red-400', Icon: AlertTriangle, title: 'The last sync attempt failed.' }
    case 'synced':
    default:
      if (!lastSyncedAt) {
        return { label: 'Synced just now', color: 'text-emerald-500', Icon: CheckCircle2, title: 'Your planner is synced.' }
      }

      return {
        label: `Synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`,
        color: 'text-emerald-500',
        Icon: CheckCircle2,
        title: `Last synced ${format(new Date(lastSyncedAt), 'PPp')}`,
      }
  }
}

export function SyncStatusIndicator({ syncMode, lastSyncedAt, syncError, onForceSync, disabled, compact = false }: Props) {
  const { label, color, Icon, title } = getStatusMeta(syncMode, lastSyncedAt)
  const textSize = compact ? 'text-[10px]' : 'text-xs'
  const buttonSize = compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 ${textSize} ${color}`} title={title}>
        <Icon size={compact ? 10 : 12} className={syncMode === 'syncing' ? 'animate-spin' : undefined} />
        <span>{label}</span>
      </div>
      <button
        onClick={onForceSync}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-md border border-slate-700 text-slate-300 transition-opacity hover:opacity-80 disabled:cursor-default ${buttonSize}`}
        title="Reload from Supabase now"
      >
        <RefreshCw size={compact ? 10 : 12} className={syncMode === 'syncing' ? 'animate-spin' : undefined} />
        Force sync
      </button>
      {syncError && syncMode === 'error' && (
        <p className={`${textSize} text-red-400 leading-tight`} title={syncError}>{syncError}</p>
      )}
    </div>
  )
}