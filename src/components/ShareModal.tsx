import { useState, useEffect } from 'react'
import { X, Link, Copy, Trash2, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  createShareToken,
  revokeShareToken,
  getShareTokens,
  checkSharesTableExists,
  SHARE_LINK_TTL_DAYS,
  type ShareRecord,
} from '../lib/sharing'
import { useAuth } from '../context/AuthContext'

const SETUP_SQL = `create table if not exists public.planner_shares (
  token text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz default now() not null
);
create index if not exists planner_shares_owner_idx on public.planner_shares(owner_user_id);
alter table public.planner_shares enable row level security;
create policy "Owners manage their own shares"
  on public.planner_shares for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
-- Public token resolution is handled by the server-side /api/shared-planner route.
-- No direct public client select policy is required.`

interface Props {
  onClose: () => void
}

export function ShareModal({ onClose }: Props) {
  const { user } = useAuth()
  const [tokens, setTokens] = useState<ShareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [tableStatus, setTableStatus] = useState<'checking' | 'exists' | 'missing' | 'unknown'>('checking')
  const [sqlCopied, setSqlCopied] = useState(false)
  const [unknownDismissed, setUnknownDismissed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function loadData() {
    if (!user?.id || !isSupabaseConfigured) {
      setTableStatus('exists')
      setLoading(false)
      return
    }
    setTableStatus('checking')
    setLoading(true)
    const [status, list] = await Promise.all([
      checkSharesTableExists(),
      getShareTokens(user.id),
    ])
    setTableStatus(status)
    if (status === 'exists' || status === 'unknown') {
      setTokens(list)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [user?.id])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function buildShareUrl(token: string) {
    return `${window.location.origin}/?share=${token}`
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCopy(token: string) {
    const url = buildShareUrl(token)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function handleRevoke(token: string) {
    if (!user?.id) return
    if (!confirm('Revoke this share link? Anyone with the link will no longer be able to view your planner.')) return
    setRevoking(token)
    const ok = await revokeShareToken(token, user.id)
    setRevoking(null)
    if (ok) {
      setTokens((prev) => prev.filter((t) => t.token !== token))
    }
  }

  async function handleCreate() {
    if (!user?.id) return
    setCreating(true)
    const token = await createShareToken(user.id, newLabel.trim() || undefined)
    setCreating(false)
    if (token) {
      const newRecord: ShareRecord = {
        token,
        owner_user_id: user.id,
        created_at: new Date().toISOString(),
        label: newLabel.trim() || undefined,
      }
      setTokens((prev) => [newRecord, ...prev])
      setNewLabel('')
      await handleCopy(token)
      showToast('Link copied to clipboard ✓')
    }
  }

  async function handleCopySql() {
    try {
      await navigator.clipboard.writeText(SETUP_SQL)
    } catch {
      const el = document.createElement('textarea')
      el.value = SETUP_SQL
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setSqlCopied(true)
    setTimeout(() => setSqlCopied(false), 2000)
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  const showNormalUI =
    tableStatus === 'exists' || (tableStatus === 'unknown' && unknownDismissed)

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          style={{
            background: '#0d1224',
            border: '1px solid #1e2d40',
            maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)',
          }}
        >
          {/* Header — sticky so it doesn't scroll away */}
          <div
            className="sticky top-0 z-10 flex items-start justify-between p-5 pb-4 shrink-0"
            style={{ background: '#0d1224', borderBottom: '1px solid #1e2d40' }}
          >
            <div>
              <h2
                id="share-modal-title"
                className="text-lg font-black tracking-wider uppercase"
                style={{ color: '#d4af37' }}
              >
                Share Your Planner
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                Share a read-only view of your planner with anyone. Links expire after {SHARE_LINK_TTL_DAYS} days.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="focus-ring p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
              style={{ color: '#94a3b8' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-6">
            {!isSupabaseConfigured ? (
              <div
                className="flex items-start gap-3 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}
              >
                <span className="text-lg leading-none mt-0.5">⚠️</span>
                <p style={{ color: '#d4af37' }}>
                  Sharing requires Supabase. Configure your{' '}
                  <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
                  <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> environment
                  variables.
                </p>
              </div>
            ) : tableStatus === 'checking' ? (
              <div className="flex items-center gap-2 py-4" style={{ color: '#94a3b8' }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Checking setup…</span>
              </div>
            ) : tableStatus === 'missing' ? (
              /* ── Setup instructions card ── */
              <div
                className="rounded-xl p-4 space-y-4"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5 shrink-0">⚠️</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                      One-time setup required
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                      The <code className="font-mono">planner_shares</code> table doesn't exist yet
                      in your Supabase project.
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                      Run this SQL in your{' '}
                      <strong style={{ color: '#e2e8f0' }}>Supabase dashboard → SQL Editor</strong>{' '}
                      to enable sharing:
                    </p>
                  </div>
                </div>

                <pre
                  style={{
                    background: '#0a0e1a',
                    border: '1px solid #243447',
                    borderRadius: '8px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#94a3b8',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '120px',
                    whiteSpace: 'pre',
                    margin: 0,
                  }}
                >
                  {SETUP_SQL}
                </pre>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: sqlCopied ? 'rgba(52,211,153,0.15)' : '#1e2d40',
                      color: sqlCopied ? '#34d399' : '#e2e8f0',
                      border: `1px solid ${sqlCopied ? '#34d399' : '#243447'}`,
                    }}
                  >
                    {sqlCopied ? (
                      <><CheckCircle2 size={12} /> Copied!</>
                    ) : (
                      <><Copy size={12} /> Copy SQL</>
                    )}
                  </button>
                  <a
                    href="https://app.supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                    style={{
                      background: '#1e2d40',
                      color: '#94a3b8',
                      border: '1px solid #243447',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} /> Open Supabase Dashboard
                  </a>
                </div>

                <div style={{ borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '12px' }}>
                  <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>
                    After running the SQL, click{' '}
                    <strong style={{ color: '#e2e8f0' }}>Retry</strong> to continue.
                  </p>
                  <button
                    onClick={() => { setUnknownDismissed(false); loadData() }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: '#f59e0b', color: '#111827' }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : tableStatus === 'unknown' && !unknownDismissed ? (
              /* ── Unknown status warning ── */
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <p className="text-sm" style={{ color: '#f59e0b' }}>
                  ⚠️ Could not verify table status — you may need to run the setup SQL. Try sharing
                  anyway?
                </p>
                <button
                  onClick={() => setUnknownDismissed(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: '#1e2d40', color: '#e2e8f0', border: '1px solid #243447' }}
                >
                  Try anyway
                </button>
              </div>
            ) : showNormalUI ? (
              <>
                {/* Existing share links */}
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: '#94a3b8' }}
                  >
                    Your Share Links
                  </h3>

                  {loading ? (
                    <div className="flex items-center gap-2 py-4" style={{ color: '#94a3b8' }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : tokens.length === 0 ? (
                    <p className="text-sm py-2" style={{ color: '#94a3b8' }}>
                      No share links yet. Generate one below.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tokens.map((record) => (
                        <div
                          key={record.token}
                          className="flex items-center gap-2 p-3 rounded-xl min-h-11"
                          style={{ background: '#0a0e1a', border: '1px solid #1e2d40' }}
                        >
                          <Link size={14} className="shrink-0" style={{ color: '#d4af37' }} />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-semibold truncate"
                              style={{ color: '#e2e8f0' }}
                            >
                              {record.label || 'Share link'}
                            </p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>
                              Created {formatDate(record.created_at)}
                            </p>
                          </div>

                          {/* Copy button */}
                          <button
                            onClick={() => handleCopy(record.token)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 min-h-11 sm:min-h-0"
                            style={{
                              background: copiedToken === record.token
                                ? 'rgba(52,211,153,0.15)'
                                : '#1e2d40',
                              color: copiedToken === record.token ? '#34d399' : '#94a3b8',
                              border: `1px solid ${copiedToken === record.token ? '#34d399' : '#243447'}`,
                            }}
                            title="Copy link"
                          >
                            {copiedToken === record.token ? (
                              <><CheckCircle2 size={16} /> Copied!</>
                            ) : (
                              <><Copy size={16} /> Copy</>
                            )}
                          </button>

                          {/* Revoke button */}
                          <button
                            onClick={() => handleRevoke(record.token)}
                            disabled={revoking === record.token}
                            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-red-900/20 transition-colors shrink-0 disabled:opacity-40 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
                            style={{ color: '#f87171' }}
                            title="Revoke link"
                          >
                            {revoking === record.token ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #1e2d40' }} />

                {/* Create new link */}
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: '#94a3b8' }}
                  >
                    Create New Share Link
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label
                        className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: '#94a3b8' }}
                      >
                        Label (optional)
                      </label>
                      <input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="e.g. Q1 2026 Readout"
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{
                          background: '#1e2d40',
                          border: '1px solid #243447',
                          color: '#e2e8f0',
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                      />
                    </div>
                    {/* Stack vertically on mobile, side-by-side on sm+ */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
                        style={{ background: '#d4af37', color: '#111827' }}
                      >
                        {creating ? (
                          <><Loader2 size={14} className="animate-spin" /> Generating…</>
                        ) : (
                          <><Link size={14} /> Generate Link</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile toast — fixed at bottom, auto-dismisses after 3s */}
      {toast && (
        <div
          className="fixed bottom-0 left-0 right-0 z-60 flex items-center justify-center px-4"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            pointerEvents: 'none',
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: 'rgba(52,211,153,0.95)',
              color: '#111827',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            <CheckCircle2 size={16} />
            {toast}
          </div>
        </div>
      )}
    </>
  )
}

