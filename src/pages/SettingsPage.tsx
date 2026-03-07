import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Save, Upload, Plus, Trash2, Pencil, X, RotateCcw } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import type { EventCategoryDef } from '../types'
import { OnboardingModal } from '../components/OnboardingModal'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, uploadLogoToStorage } from '../lib/supabase'

export function SettingsPage() {
  const { store, updateSettings, setMonthTheme, addCategory, updateCategory, removeCategory } = usePlanner()
  const { user } = useAuth()

  const [orgName, setOrgName] = useState(store.organizationName)
  const [title, setTitle] = useState(store.plannerTitle)
  const [accent, setAccent] = useState(store.accentColor)
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
      setMonthTheme(Number(month), 2026, theme)
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
    <div className="p-6 max-w-2xl">
      <h2
        className="text-xl font-black tracking-widest uppercase mb-6"
        style={{ color: '#d4af37' }}
      >
        Settings
      </h2>

      <form onSubmit={handleSettingsSave} className="space-y-8">
        {/* Organisation */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Organisation
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Organisation Name
              </label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{
                  background: '#1e2d40',
                  border: '1px solid #243447',
                  color: '#e2e8f0',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Planner Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{
                  background: '#1e2d40',
                  border: '1px solid #243447',
                  color: '#e2e8f0',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Accent Colour
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-sm font-mono text-slate-400">{accent}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Logo
              </label>
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-white/5"
                  style={{ border: '1px solid #243447', color: logoUploading ? '#d4af37' : '#94a3b8' }}
                >
                  <Upload size={13} className={logoUploading ? 'animate-spin' : ''} />
                  {logoUploading ? 'Uploading…' : 'Upload Logo'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </label>
              {store.logoUrl && (
                <img
                  src={store.logoUrl}
                  alt="Logo preview"
                  className="mt-2 h-12 w-auto object-contain rounded"
                />
              )}
            </div>
          </div>
        </section>

        {/* Month Themes */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Month Themes / Labels
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MONTH_NAMES.map((name, i) => {
              const month = i + 1
              return (
                <div key={month} className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider w-24 shrink-0"
                    style={{ color: '#d4af37' }}
                  >
                    {name}
                  </span>
                  <input
                    value={themes[month] ?? ''}
                    onChange={(e) =>
                      setThemes((prev) => ({ ...prev, [month]: e.target.value }))
                    }
                    placeholder="Monthly theme or label..."
                    className="flex-1 px-2 py-1.5 rounded text-xs focus:outline-none"
                    style={{
                      background: '#1e2d40',
                      border: '1px solid #243447',
                      color: '#e2e8f0',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Event Categories
          </h3>
          <div className="space-y-2 mb-4">
            {store.categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 group">
                {editingCatId === cat.id ? (
                  <EditCategoryRow
                    cat={cat}
                    onSave={(patch) => { updateCategory(cat.id, patch); setEditingCatId(null) }}
                    onCancel={() => setEditingCatId(null)}
                  />
                ) : (
                  <>
                    <span
                      className="inline-block w-4 h-4 rounded shrink-0"
                      style={{ background: cat.bgColor, border: `1px solid ${cat.color}` }}
                    />
                    <span className="flex-1 text-sm font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                    <button
                      type="button"
                      onClick={() => setEditingCatId(cat.id)}
                      className="opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity p-1 rounded"
                    >
                      <Pencil size={12} className="text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Delete "${cat.label}"?`)) removeCategory(cat.id) }}
                      className="opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity p-1 rounded"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new category */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="New category name..."
              className="flex-1 min-w-32 px-2 py-1.5 rounded text-xs focus:outline-none"
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
                className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500">Fill</label>
              <input type="color" value={newCatBg} onChange={(e) => setNewCatBg(e.target.value)}
                className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
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

        {/* Save */}
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
          style={{ background: saved ? '#16a34a' : '#d4af37', color: '#111827' }}
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>

      {/* Re-run onboarding */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid #1e2d40' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Onboarding</h3>
        <button
          type="button"
          onClick={() => setShowOnboarding(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
          style={{ border: '1px solid #243447', color: '#94a3b8' }}
        >
          <RotateCcw size={13} />
          Re-run Setup Wizard
        </button>
      </div>

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            localStorage.setItem('yearplanner_onboarded', 'true')
            setShowOnboarding(false)
          }}
        />
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
