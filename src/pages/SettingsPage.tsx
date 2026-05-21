import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Save, Upload, Plus, Trash2, Pencil, X, RotateCcw, Share2, Bell, BellOff, BellRing, FileDown, Printer, FileSpreadsheet, FileUp } from 'lucide-react'
import { requestNotificationPermission } from '../lib/notifications'
import { subscribeToPush, unsubscribeFromPush, getPushStatus, isIOS, isStandalonePWA, type PushStatus } from '../lib/pushSub'
import { usePlanner } from '../context/PlannerContext'
import type { EventCategoryDef } from '../types'
import { DEFAULT_CATEGORIES } from '../types'
import { OnboardingModal } from '../components/OnboardingModal'
import { ShareModal } from '../components/ShareModal'
import { IcsImportModal } from '../components/IcsImportModal'
import { TableImportModal } from '../components/TableImportModal'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, uploadLogoToStorage } from '../lib/supabase'
import { markOnboardingCompleted } from '../lib/onboarding'
import { exportToCSV } from '../lib/storage'
import { downloadPlannerImportTemplate } from '../lib/tableImport'
import { requestPlannerPrintExport } from '../lib/plannerNavigation'

/** Static set of built-in category IDs — these can be renamed/recoloured but not deleted. */
const DEFAULT_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id))

export function SettingsPage() {
  const { store, updateSettings, setMonthTheme, addCategory, updateCategory, removeCategory, resetCategories, recategorizePrelateEvents, currentYear } = usePlanner()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const canUseBackgroundPush = isSupabaseConfigured && userId !== null && userId !== 'local-guest'

  const [orgName, setOrgName] = useState(store.organizationName)
  const [title, setTitle] = useState(store.plannerTitle)
  const [accent, setAccent] = useState(store.accentColor)
  const [yearTheme, setYearTheme] = useState(store.yearTheme ?? '')
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showIcsImport, setShowIcsImport] = useState(false)
  const [showTableImport, setShowTableImport] = useState(false)
  const [prelateRecategorizedCount, setPrelateRecategorizedCount] = useState<number | null>(null)
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
    const result = await subscribeToPush()
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
    updateSettings({ organizationName: orgName, plannerTitle: title, accentColor: accent, yearTheme: yearTheme.trim() || undefined })
    Object.entries(themes).forEach(([month, theme]) => {
      setMonthTheme(Number(month), currentYear, theme)
    })
    setSaved(true)
    setIsDirty(false)
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
    <div className="p-4 md:p-6 max-w-4xl pb-safe relative">
      <h2
        className="text-lg font-black tracking-widest uppercase mb-5"
        style={{ color: '#d4af37' }}
      >
        Settings
      </h2>

      {/* Floating dirty-state save bar */}
      {isDirty && !saved && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-xl shadow-xl"
          style={{ background: '#111827', border: '1px solid #d4af37', boxShadow: '0 0 24px rgba(212,175,55,0.2)' }}
        >
          <span className="text-xs text-slate-400">Unsaved changes</span>
          <button
            type="submit"
            form="settings-form"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            <Save size={12} /> Save Settings
          </button>
        </div>
      )}

      <form id="settings-form" onSubmit={handleSettingsSave} className="space-y-4">

        {/* ── 1. Identity ─────────────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Identity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Organisation</label>
              <input value={orgName} onChange={(e) => { setOrgName(e.target.value); setIsDirty(true) }} placeholder="Your organisation…"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Planner Title</label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }} placeholder="STRATUM 2026…"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }} />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Accent Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setIsDirty(true) }}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-xs font-mono text-slate-400">{accent}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Logo</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
                  style={{ border: '1px solid #243447', color: logoUploading ? '#d4af37' : '#94a3b8' }}>
                  <Upload size={12} className={logoUploading ? 'animate-spin' : ''} />
                  {logoUploading ? 'Uploading…' : 'Upload'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            {store.logoUrl && (
              <img src={store.logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded" />
            )}
          </div>
        </section>

        {/* ── 2. Planning Language ─────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-4" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Planning Language</h3>

          {/* Year Theme */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Year Theme / Vision</label>
            <input
              value={yearTheme}
              onChange={(e) => { setYearTheme(e.target.value); setIsDirty(true) }}
              placeholder={`What frames ${currentYear} for you? e.g. "Year of Foundations" or "Build, grow, ship"`}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
            />
            <p className="text-xs text-slate-600 mt-1">Shown on the Dashboard and in exports as a guiding statement for the year.</p>
          </div>

          {/* Month Themes — grouped by quarter */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Month Themes</p>
            <div className="space-y-4">
              {[
                { label: 'Q1 — Foundation', months: [1, 2, 3] },
                { label: 'Q2 — Execution',  months: [4, 5, 6] },
                { label: 'Q3 — Expansion',  months: [7, 8, 9] },
                { label: 'Q4 — Finish',     months: [10, 11, 12] },
              ].map(({ label, months }) => (
                <div key={label}>
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">{label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {months.map((month) => {
                      const name = MONTH_NAMES[month - 1]
                      return (
                        <div key={month} className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider w-7 shrink-0" style={{ color: '#d4af37' }}>
                            {name.slice(0, 3)}
                          </span>
                          <input
                            value={themes[month] ?? ''}
                            onChange={(e) => { setThemes((prev) => ({ ...prev, [month]: e.target.value })); setIsDirty(true) }}
                            placeholder="Theme…"
                            className="flex-1 px-2 py-1 rounded text-xs focus:outline-none"
                            style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Event Categories ──────────────────────────────────────── */}
        <section className="rounded-xl p-4" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Event Categories</h3>
            <button type="button"
              onClick={() => { if (confirm('Reset to default categories?')) resetCategories() }}
              className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: '#94a3b8', border: '1px solid #243447' }}>
              Restore Defaults
            </button>
          </div>
          <div className="space-y-1.5 mb-4">
            {store.categories.map((cat) => {
              const isDefault = DEFAULT_CATEGORY_IDS.has(cat.id)
              return (
                <div key={cat.id} className="flex items-center gap-1">
                  {editingCatId === cat.id ? (
                    <EditCategoryRow cat={cat}
                      onSave={(patch) => { updateCategory(cat.id, patch); setEditingCatId(null) }}
                      onCancel={() => setEditingCatId(null)} />
                  ) : (
                    <>
                      <button type="button" onClick={() => setEditingCatId(cat.id)}
                        className="flex flex-1 items-center gap-2 text-left py-1.5 px-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors min-w-0">
                        <span className="inline-block w-3 h-3 rounded-sm shrink-0"
                          style={{ background: cat.bgColor, borderLeft: `3px solid ${cat.color}` }} />
                        <span className="flex-1 text-sm font-semibold truncate" style={{ color: cat.color }}>{cat.label}</span>
                        <Pencil size={11} className="text-slate-600 shrink-0" />
                      </button>
                      <button type="button"
                        onClick={() => { if (confirm(`Delete "${cat.label}"?`)) removeCategory(cat.id) }}
                        className="p-1.5 rounded transition-opacity disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5"
                        disabled={isDefault || store.categories.length <= 1}
                        title={isDefault ? 'Built-in categories cannot be deleted' : 'Delete'}>
                        <Trash2 size={11} className="text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {/* Add category — stacked on mobile */}
          <div className="pt-3 space-y-2" style={{ borderTop: '1px solid #1e2d40' }}>
            <input value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="New category name…"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCatLabel.trim()) {
                  addCategory({ label: newCatLabel.trim(), color: newCatColor, bgColor: newCatBg })
                  setNewCatLabel('')
                }
              }} />
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Text colour</label>
                <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Fill colour</label>
                <input type="color" value={newCatBg} onChange={(e) => setNewCatBg(e.target.value)}
                  className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
              </div>
              <button type="button"
                onClick={() => { if (!newCatLabel.trim()) return; addCategory({ label: newCatLabel.trim(), color: newCatColor, bgColor: newCatBg }); setNewCatLabel('') }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ml-auto"
                style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37', minHeight: '40px' }}>
                <Plus size={13} /> Add Category
              </button>
            </div>
          </div>
        </section>

        {/* ── 4. Notifications ─────────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Notifications</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {notifPerm === 'granted' ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#4ade80' }}>
                <Bell size={13} /> Notifications enabled
              </span>
            ) : notifPerm === 'denied' ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#f87171' }}>
                <BellOff size={13} /> Blocked — enable in your browser/OS settings
              </span>
            ) : (
              <button type="button" onClick={handleEnableNotifications}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37', minHeight: '44px' }}>
                <Bell size={14} /> Enable Notifications
              </button>
            )}
            {notifPerm === 'granted' && (
              <button type="button" onClick={handleTestNotification}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: '#1e2d40', color: testSent ? '#4ade80' : '#94a3b8', border: '1px solid #243447' }}>
                <BellRing size={12} /> {testSent ? 'Sent!' : 'Send test'}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Reminders fire while STRATUM is open. Set a start time on an event, choose a reminder offset — the notification fires that many minutes before.
          </p>
          {/* Background push */}
          <div className="pt-3" style={{ borderTop: '1px solid #1e2d40' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
              Background Push <span className="text-slate-600 font-normal normal-case">(when app is closed)</span>
            </p>
            {!canUseBackgroundPush ? (
              <p className="text-xs text-slate-600">Requires a signed-in account and Supabase configuration.</p>
            ) : pushStatus === 'unsupported' ? (
              <p className="text-xs text-slate-600">Not supported in this browser.</p>
            ) : pushStatus === 'denied' ? (
              <p className="text-xs" style={{ color: '#f87171' }}>Blocked — enable notifications in browser settings first.</p>
            ) : pushStatus === 'subscribed' ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#4ade80' }}>
                  <Bell size={13} /> Push enabled ✓
                </span>
                <button type="button" onClick={handleDisablePush}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: '#1e2d40', color: '#f87171', border: '1px solid #3b1e1e' }}>
                  Disable
                </button>
              </div>
            ) : (
              <>
                <button type="button" onClick={handleEnablePush} disabled={pushStatus === 'loading'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37', opacity: pushStatus === 'loading' ? 0.5 : 1, minHeight: '44px', cursor: pushStatus === 'loading' ? 'wait' : 'pointer' }}>
                  <BellRing size={14} /> {pushStatus === 'loading' ? 'Checking…' : 'Enable Background Push'}
                </button>
                {pushError === 'IOS_NOT_INSTALLED' && (
                  <p className="mt-2 text-xs" style={{ color: '#f59e0b' }}>
                    📱 Add STRATUM to your Home Screen first, then open it from there and try again.
                  </p>
                )}
                {pushError && pushError !== 'IOS_NOT_INSTALLED' && (
                  <p className="mt-2 text-xs" style={{ color: '#f87171' }}>
                    {pushError === 'PERMISSION_DENIED' ? 'Permission denied — check browser settings.'
                      : pushError === 'SUPABASE_REQUIRED' ? 'Requires Supabase sync and a signed-in account.'
                      : pushError === 'SW_TIMEOUT' ? 'Service worker timed out — try refreshing.'
                      : `Failed: ${pushError}`}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── 5. Import ────────────────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Import</h3>
          <p className="text-xs text-slate-500">Bring plans in from calendar files or spreadsheets. All imports include a preview before anything is saved.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowIcsImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37', minHeight: '44px' }}>
              <Upload size={14} /> Import .ics Calendar
            </button>
            <button type="button" onClick={() => setShowTableImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37', minHeight: '44px' }}>
              <FileSpreadsheet size={14} /> Import CSV / Excel
            </button>
            <button type="button" onClick={downloadPlannerImportTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#111827', color: '#94a3b8', border: '1px solid #243447', minHeight: '44px' }}>
              <FileUp size={14} /> Download Template
            </button>
          </div>
        </section>

        {/* ── 6. Export ────────────────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Export</h3>
          <p className="text-xs text-slate-500">Export a working data file, generate a PDF-ready printout, or open the full Export Studio.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => exportToCSV(store)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#111827', color: '#94a3b8', border: '1px solid #243447', minHeight: '44px' }}>
              <FileDown size={14} /> Export CSV
            </button>
            <button type="button" onClick={requestPlannerPrintExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#111827', color: '#94a3b8', border: '1px solid #243447', minHeight: '44px' }}>
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </section>

        {/* ── 7. Share ─────────────────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Share</h3>
          <p className="text-xs text-slate-500">Create read-only share links for your planner. Viewers cannot edit — they see a snapshot of your data.</p>
          {isSupabaseConfigured ? (
            <button type="button" onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#111827', color: '#94a3b8', border: '1px solid #243447', minHeight: '44px' }}>
              <Share2 size={14} /> Manage Share Links
            </button>
          ) : (
            <p className="text-xs text-slate-600">
              Share links require Supabase. Add <code className="text-slate-400">VITE_SUPABASE_URL</code> and <code className="text-slate-400">VITE_SUPABASE_ANON_KEY</code> to enable.
            </p>
          )}
        </section>

        {/* ── 8. Advanced ──────────────────────────────────────────────── */}
        <section className="rounded-xl p-4 space-y-3" style={{ background: '#0d1224', border: '1px solid #1e2d40' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Advanced</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowOnboarding(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-white/5"
              style={{ border: '1px solid #243447', color: '#64748b', minHeight: '44px' }}>
              <RotateCcw size={13} /> Setup Wizard
            </button>
            <button type="button"
              onClick={() => setPrelateRecategorizedCount(recategorizePrelateEvents())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#111827', color: '#64748b', border: '1px solid #243447', minHeight: '44px' }}>
              <RotateCcw size={14} /> Apply Imported Planner Colours
            </button>
          </div>
          {prelateRecategorizedCount !== null && (
            <p className="text-xs" style={{ color: prelateRecategorizedCount > 0 ? '#4ade80' : '#94a3b8' }}>
              {prelateRecategorizedCount > 0
                ? `Updated ${prelateRecategorizedCount} event${prelateRecategorizedCount === 1 ? '' : 's'}.`
                : 'No events needed updating.'}
            </p>
          )}
        </section>

        {/* ── Save ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end pt-2 pb-4">
          <button type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{ background: saved ? '#16a34a' : '#d4af37', color: '#111827', minHeight: '44px' }}>
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>

      {showOnboarding && (
        <OnboardingModal onComplete={() => { if (user?.id) markOnboardingCompleted(user.id); setShowOnboarding(false) }} />
      )}
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
      {showIcsImport && <IcsImportModal onClose={() => setShowIcsImport(false)} />}
      {showTableImport && <TableImportModal onClose={() => setShowTableImport(false)} />}
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

