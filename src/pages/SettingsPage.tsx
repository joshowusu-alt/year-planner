import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Save, Upload, Plus, Trash2, Pencil, X, RotateCcw, Share2, Bell, BellOff, BellRing } from 'lucide-react'
import { requestNotificationPermission } from '../lib/notifications'
import { subscribeToPush, unsubscribeFromPush, getPushStatus, isIOS, isStandalonePWA, type PushStatus } from '../lib/pushSub'
import { usePlanner } from '../context/PlannerContext'
import type { EventCategoryDef } from '../types'
import { DEFAULT_CATEGORIES } from '../types'
import { OnboardingModal } from '../components/OnboardingModal'
import { ShareModal } from '../components/ShareModal'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, uploadLogoToStorage } from '../lib/supabase'
import { markOnboardingCompleted } from '../lib/onboarding'

/** Static set of built-in category IDs — these can be renamed/recoloured but not deleted. */
const DEFAULT_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id))

export function SettingsPage() {
  const { store, updateSettings, setMonthTheme, addCategory, updateCategory, removeCategory, resetCategories, currentYear } = usePlanner()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const canUseBackgroundPush = isSupabaseConfigured && userId !== null && userId !== 'local-guest'

  const [orgName, setOrgName] = useState(store.organizationName)
  const [title, setTitle] = useState(store.plannerTitle)
  const [accent, setAccent] = useState(store.accentColor)
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [testSent, setTestSent] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushStatus>('loading')
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPerm(Notification.permission)
  }, [])

  useEffect(() => {
    if (!canUseBackgroundPush) {
      setPushStatus('unsubscribed')
      return
    }
    getPushStatus().then(setPushStatus)
  }, [canUseBackgroundPush])

  async function handleEnablePush() {
    setPushError(null)
    if (!canUseBackgroundPush) {
      setPushStatus('unsubscribed')
      return
    }
    // iOS Safari (non-installed) doesn't support push — guide user to install first
    if (isIOS() && !isStandalonePWA()) {
      setPushError('IOS_NOT_INSTALLED')
      setPushStatus('unsubscribed')
      return
    }
    if (Notification.permission !== 'granted') {
      const perm = await requestNotificationPermission()
      setNotifPerm(perm)
      if (perm !== 'granted') return
    }
    setPushStatus('loading')
    const result = await subscribeToPush(userId ?? undefined)
    if (result.ok) {
      setPushStatus('subscribed')
    } else {
      setPushStatus('unsubscribed')
      setPushError(result.error ?? 'UNKNOWN')
    }
  }

  async function handleDisablePush() {
    if (!canUseBackgroundPush) {
      setPushStatus('unsubscribed')
      return
    }
    setPushStatus('loading')
    await unsubscribeFromPush()
    setPushStatus('unsubscribed')
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    setNotifPerm(result)
  }

  function handleTestNotification() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('STRATUM Reminder', { body: 'Test notification — reminders are working!', icon: '/icon.svg' })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    }
  }

  // Category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatColor, setNewCatColor] = useState('#60a5fa')
  const [newCatBg, setNewCatBg] = useState('#1e3a5f')

  const [themes, setThemes] = useState<Record<number, string>>(
    Object.fromEntries(
      store.monthMeta.map((m) => [m.month, m.theme])
    )
  )

  function handleSettingsSave(e: FormEvent) {
    e.preventDefault()
    updateSettings({ organizationName: orgName, plannerTitle: title, accentColor: accent })
    Object.entries(themes).forEach(([month, theme]) => {
      setMonthTheme(Number(month), currentYear, theme)
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // If Supabase Storage is available, upload the file and store only the URL.
    // This keeps the planner_data row lean (no large base64 blobs).
    if (isSupabaseConfigured && user?.id) {
      setLogoUploading(true)
      const url = await uploadLogoToStorage(user.id, file)
      setLogoUploading(false)
      if (url) { updateSettings({ logoUrl: url }); return }
      // Fall through to base64 if upload failed
    }

    // Fallback: read as data URL (localStorage-only mode)
    const reader = new FileReader()
    reader.onload = () => {
      updateSettings({ logoUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl pb-safe">
      <h2
        className="text-lg font-black tracking-widest uppercase mb-5"
        style={{ color: '#d4af37' }}
      >
        Settings
      </h2>

      <form onSubmit={handleSettingsSave} className="space-y-4">
        {/* ── Organisation ─────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Organisation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Org Name
              </label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Planner Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs font-mono text-slate-400">{accent}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Logo
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
                  style={{ border: '1px solid #243447', color: logoUploading ? '#d4af37' : '#94a3b8' }}
                >
                  <Upload size={12} className={logoUploading ? 'animate-spin' : ''} />
                  {logoUploading ? 'Uploading…' : 'Upload'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            {store.logoUrl && (
              <img
                src={store.logoUrl}
                alt="Logo"
                className="h-10 w-auto object-contain rounded"
              />
            )}
          </div>
        </section>

        {/* ── Month Themes ─────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-4"
          style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
            Month Themes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MONTH_NAMES.map((name, i) => {
              const month = i + 1
              return (
                <div key={month} className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider w-20 shrink-0"
                    style={{ color: '#d4af37' }}
                  >
                    {name}
                  </span>
                  <input
                    value={themes[month] ?? ''}
                    onChange={(e) =>
                      setThemes((prev) => ({ ...prev, [month]: e.target.value }))
                    }
                    placeholder="Theme or label…"
                    className="flex-1 px-2 py-1 rounded text-xs focus:outline-none"
                    style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                  />
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Event Categories ─────────────────────────────────────────── */}
        <section
          className="rounded-xl p-4"
          style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Event Categories
            </h3>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset to default categories? Your current categories will be replaced.')) {
                  resetCategories()
                }
              }}
              className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: '#94a3b8', border: '1px solid #243447' }}
            >
              Restore Defaults
            </button>
          </div>

          <div className="space-y-1.5 mb-3">
            {store.categories.map((cat) => {
              const isDefault = DEFAULT_CATEGORY_IDS.has(cat.id)
              return (
                <div key={cat.id} className="flex items-center gap-1">
                  {editingCatId === cat.id ? (
                    <EditCategoryRow
                      cat={cat}
                      onSave={(patch) => { updateCategory(cat.id, patch); setEditingCatId(null) }}
                      onCancel={() => setEditingCatId(null)}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(cat.id)}
                        className="flex flex-1 items-center gap-2 text-left py-1.5 px-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors min-w-0"
                      >
                        <span
                          className="inline-block w-3.5 h-3.5 rounded shrink-0"
                          style={{ background: cat.bgColor, border: `1px solid ${cat.color}` }}
                        />
                        <span className="flex-1 text-sm font-semibold truncate" style={{ color: cat.color }}>{cat.label}</span>
                        <Pencil size={11} className="text-slate-600 shrink-0" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Delete "${cat.label}"?`)) removeCategory(cat.id) }}
                        className="p-1.5 rounded transition-opacity disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5"
                        disabled={isDefault || store.categories.length <= 1}
                        title={isDefault ? 'Built-in categories cannot be deleted' : store.categories.length <= 1 ? 'Cannot delete the last category' : `Delete ${cat.label}`}
                      >
                        <Trash2 size={11} className="text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add new category */}
          <div className="flex items-center gap-2 pt-2 flex-wrap" style={{ borderTop: '1px solid #1e2d40' }}>
            <input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="New category name…"
              className="flex-1 min-w-28 px-2 py-1.5 rounded text-xs focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCatLabel.trim()) {
                  addCategory({ label: newCatLabel.trim(), color: newCatColor, bgColor: newCatBg })
                  setNewCatLabel('')
                }
              }}
            />
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500">Text</label>
              <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
                className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500">Fill</label>
              <input type="color" value={newCatBg} onChange={(e) => setNewCatBg(e.target.value)}
                className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newCatLabel.trim()) return
                addCategory({ label: newCatLabel.trim(), color: newCatColor, bgColor: newCatBg })
                setNewCatLabel('')
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37' }}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </section>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Notifications</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {notifPerm === 'granted' ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#34d399' }}>
                <Bell size={13} /> Notifications enabled
              </span>
            ) : notifPerm === 'denied' ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#f87171' }}>
                <BellOff size={13} /> Blocked — enable in your browser/OS settings
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37' }}
              >
                <Bell size={14} /> Enable Notifications
                </button>
              )}
              {notifPerm === 'granted' && (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: '#1e2d40', color: testSent ? '#34d399' : '#94a3b8', border: '1px solid #243447' }}
                >
                  <BellRing size={12} /> {testSent ? 'Sent!' : 'Send test'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Reminders fire while STRATUM is open in your browser. Set a start time on an event, then choose a reminder — the notification fires that many minutes before.
            </p>

            {/* Background push */}
            <div className="pt-3 mt-3" style={{ borderTop: '1px solid #1e2d40' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                Background Push (when app is closed)
              </p>
              {!canUseBackgroundPush ? (
                <p className="text-xs" style={{ color: '#64748b' }}>
                  Background push requires Supabase-backed accounts and a configured cron job.
                </p>
              ) : pushStatus === 'unsupported' ? (
                <p className="text-xs" style={{ color: '#64748b' }}>Not supported in this browser</p>
              ) : pushStatus === 'denied' ? (
                <p className="text-xs" style={{ color: '#f87171' }}>Blocked — enable notifications in browser settings first</p>
              ) : pushStatus === 'subscribed' ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#34d399' }}>
                    <Bell size={13} /> Push enabled ✓
                  </span>
                  <button
                    type="button"
                    onClick={handleDisablePush}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{ background: '#1e2d40', color: '#f87171', border: '1px solid #3b1e1e' }}
                  >
                    Disable
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={pushStatus === 'loading'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37', opacity: pushStatus === 'loading' ? 0.5 : 1, minHeight: '44px', cursor: pushStatus === 'loading' ? 'wait' : 'pointer' }}
                  >
                    <BellRing size={14} /> {pushStatus === 'loading' ? 'Checking…' : 'Enable Background Push'}
                  </button>
                  {pushError === 'IOS_NOT_INSTALLED' && (
                    <p className="mt-2 text-xs" style={{ color: '#f59e0b' }}>
                      📱 On iPhone/iPad, you must <strong>add STRATUM to your Home Screen</strong> first, then open it from there and try again.
                    </p>
                  )}
                  {pushError && pushError !== 'IOS_NOT_INSTALLED' && (
                    <p className="mt-2 text-xs" style={{ color: '#f87171' }}>
                      {pushError === 'PERMISSION_DENIED'
                        ? 'Permission denied — check browser notification settings.'
                        : pushError === 'SUPABASE_REQUIRED'
                        ? 'Background push requires Supabase-backed sync and a signed-in account.'
                        : pushError === 'SW_TIMEOUT'
                        ? 'Service worker timed out — try refreshing the page.'
                        : `Failed: ${pushError}`}
                    </p>
                  )}
                </>
              )}
              <p className="text-xs mt-2" style={{ color: '#475569' }}>
                Requires Supabase + cron job (/api/send-reminders every minute via cron-job.org).
              </p>
            </div>
        </section>

        {/* ── Sharing ───────────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Sharing
          </h3>
          {isSupabaseConfigured ? (
            <>
              <p className="text-xs text-slate-500">
                Create a read-only share link. Anyone with the link can view your planner without signing in.
              </p>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37' }}
              >
                <Share2 size={14} /> Manage Share Links
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Sharing requires Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.
            </p>
          )}
        </section>

        {/* ── Save ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ border: '1px solid #243447', color: '#64748b' }}
          >
            <RotateCcw size={12} />
            Setup Wizard
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors"
            style={{ background: saved ? '#16a34a' : '#d4af37', color: '#111827', minHeight: '44px' }}
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            if (user?.id) {
              markOnboardingCompleted(user.id)
            }
            setShowOnboarding(false)
          }}
        />
      )}

      {showShareModal && (
        <ShareModal onClose={() => setShowShareModal(false)} />
      )}
    </div>
  )
}

// ─── Inline edit row for a category ──────────────────────────────────────────

function EditCategoryRow({
  cat,
  onSave,
  onCancel,
}: {
  cat: EventCategoryDef
  onSave: (patch: Partial<EventCategoryDef>) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(cat.label)
  const [color, setColor] = useState(cat.color)
  const [bgColor, setBgColor] = useState(cat.bgColor)
  return (
    <div className="flex items-center gap-2 flex-1 flex-wrap">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1 min-w-24 px-2 py-1 rounded text-xs focus:outline-none"
        style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
      />
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Text</span>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Fill</span>
        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
          className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent" />
      </div>
      <button
        type="button"
        onClick={() => onSave({ label, color, bgColor })}
        className="p-1 rounded text-green-400 hover:bg-green-900/30"
      >
        <Save size={12} />
      </button>
      <button type="button" onClick={onCancel} className="p-1 rounded text-slate-500 hover:bg-white/5">
        <X size={12} />
      </button>
    </div>
  )
}
