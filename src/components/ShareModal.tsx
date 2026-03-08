import { useState, useEffect } from 'react'
import { X, Link, Copy, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  createShareToken,
  revokeShareToken,
  getShareTokens,
  type ShareRecord,
} from '../lib/sharing'
import { useAuth } from '../context/AuthContext'

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

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setLoading(false)
      return
    }
    getShareTokens(user.id).then((list) => {
      setTokens(list)
      setLoading(false)
    })
  }, [user?.id])

  function buildShareUrl(token: string) {
    return `${window.location.origin}/?share=${token}`
  }

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(buildShareUrl(token))
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      // Fallback for browsers that block clipboard
      const url = buildShareUrl(token)
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    }
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
      // Auto-copy the new link
      await handleCopy(token)
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: '#0d1224',
          border: '1px solid #1e2d40',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 pb-4"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <div>
            <h2
              className="text-lg font-black tracking-wider uppercase"
              style={{ color: '#d4af37' }}
            >
              Share Your Planner
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              Share a read-only view of your planner with anyone
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
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
          ) : (
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
                        className="flex items-center gap-2 p-3 rounded-xl"
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
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
                            <>
                              <CheckCircle2 size={12} /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy
                            </>
                          )}
                        </button>

                        {/* Revoke button */}
                        <button
                          onClick={() => handleRevoke(record.token)}
                          disabled={revoking === record.token}
                          className="p-1.5 rounded-lg hover:bg-red-900/20 transition-colors shrink-0 disabled:opacity-40"
                          style={{ color: '#f87171' }}
                          title="Revoke link"
                        >
                          {revoking === record.token ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate()
                      }}
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: '#d4af37', color: '#111827' }}
                  >
                    {creating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Link size={14} /> Generate Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
