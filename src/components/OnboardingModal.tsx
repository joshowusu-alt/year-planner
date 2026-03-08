/**
 * Onboarding wizard — shown to first-time users
 * Steps: Welcome → Organisation Setup → Categories → Done
 */
import { useState } from 'react'
import { ChevronRight, Check, Plus, Trash2 } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import type { EventCategoryDef } from '../types'
import { DEFAULT_CATEGORIES } from '../types'

interface Props {
  onComplete: () => void
}

type Step = 'welcome' | 'org' | 'categories' | 'done'

const STEPS: Step[] = ['welcome', 'org', 'categories', 'done']

export function OnboardingModal({ onComplete }: Props) {
  const { store, updateSettings, addCategory, removeCategory } = usePlanner()
  const [step, setStep] = useState<Step>('welcome')

  const [orgName, setOrgName] = useState(store.organizationName || '')
  const [plannerTitle, setPlannerTitle] = useState(store.plannerTitle || '')

  // Local category draft — starts from store.categories (which have DEFAULT_CATEGORIES initially)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#60a5fa')
  const [newBg, setNewBg] = useState('#1e3a5f')

  const stepIndex = STEPS.indexOf(step)
  const progressPct = (stepIndex / (STEPS.length - 1)) * 100

  function next() {
    if (step === 'org') {
      updateSettings({ organizationName: orgName.trim(), plannerTitle: plannerTitle.trim() })
    }
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
  }

  function finish() {
    onComplete()
  }

  function addCat() {
    if (!newLabel.trim()) return
    addCategory({ label: newLabel.trim(), color: newColor, bgColor: newBg })
    setNewLabel('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ background: '#0d1224', border: '1px solid #1e2d40', maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)' }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: '#1e2d40' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: '#d4af37' }}
          />
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-8">
          {/* ── Step: Welcome ── */}
          {step === 'welcome' && (
            <div className="space-y-6 text-center">
              <div>
                <div className="text-4xl font-black tracking-widest uppercase mb-2" style={{ color: '#d4af37' }}>
                  Welcome
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Your STRATUM workspace is ready. Let's take 60 seconds to personalise it for you.
                </p>
              </div>
              <ul className="text-left space-y-2 text-sm text-slate-300">
                {[
                  'Set your organisation name & planner title',
                  'Configure your own event categories with custom colours',
                  'Plan across the full year with monthly & weekly views',
                  'Track goals, tasks, and notes in one place',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={14} style={{ color: '#d4af37', marginTop: 2, flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={next}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#d4af37', color: '#111827' }}
              >
                Get Started <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step: Organisation ── */}
          {step === 'org' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black tracking-widest uppercase mb-1" style={{ color: '#d4af37' }}>
                  Your Organisation
                </h2>
                <p className="text-xs text-slate-500">These appear in the sidebar and on exports. Leave blank to skip.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Organisation Name
                  </label>
                  <input
                    autoFocus
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Planner Title
                  </label>
                  <input
                    value={plannerTitle}
                    onChange={(e) => setPlannerTitle(e.target.value)}
                    placeholder="e.g. STRATUM Executive Planning 2026"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={next}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                  style={{ background: '#d4af37', color: '#111827' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Categories ── */}
          {step === 'categories' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black tracking-widest uppercase mb-1" style={{ color: '#d4af37' }}>
                  Event Categories
                </h2>
                <p className="text-xs text-slate-500">Customise the categories used to colour-code your events. You can always edit these in Settings.</p>
              </div>

              {/* Current categories */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {store.categories.length === 0 && (
                  <p className="text-xs text-slate-600 italic">No categories yet — add some below.</p>
                )}
                {store.categories.map((cat: EventCategoryDef) => (
                  <div key={cat.id} className="flex items-center gap-2 group py-1">
                    <span
                      className="inline-block w-4 h-4 rounded shrink-0"
                      style={{ background: cat.bgColor, border: `1px solid ${cat.color}` }}
                    />
                    <span className="flex-1 text-sm font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Remove "${cat.label}"?`)) removeCategory(cat.id) }}
                      className="opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity p-1"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t" style={{ borderColor: '#1e2d40' }}>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Category name..."
                  className="flex-1 min-w-32 px-2 py-1.5 rounded text-xs focus:outline-none"
                  style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCat() }}
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Text</span>
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                    className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Fill</span>
                  <input type="color" value={newBg} onChange={(e) => setNewBg(e.target.value)}
                    className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
                </div>
                <button
                  type="button"
                  onClick={addCat}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#1e2d40', color: '#d4af37', border: '1px solid #d4af37' }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {/* Restore defaults */}
              {store.categories.length === 0 && (
                <button
                  type="button"
                  onClick={() => DEFAULT_CATEGORIES.forEach((c) => addCategory({ label: c.label, color: c.color, bgColor: c.bgColor }))}
                  className="text-xs text-yellow-500 hover:text-yellow-400 underline-offset-2 hover:underline"
                >
                  Restore default categories
                </button>
              )}

              <button
                onClick={next}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                style={{ background: '#d4af37', color: '#111827' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && (
            <div className="space-y-6 text-center">
              <div>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#d4af37' }}
                >
                  <Check size={32} style={{ color: '#111827' }} />
                </div>
                <h2 className="text-2xl font-black tracking-widest uppercase mb-2" style={{ color: '#d4af37' }}>
                  You're all set!
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Your planner is personalised and ready. Jump straight into the Year View to start planning.
                </p>
              </div>
              <div className="text-xs text-slate-600">
                You can revisit these settings anytime via <strong className="text-slate-400">Settings</strong> in the sidebar.
              </div>
              <button
                onClick={finish}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                style={{ background: '#d4af37', color: '#111827' }}
              >
                Start Planning <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Step indicator dots */}
        <div className="shrink-0 flex justify-center gap-1.5 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {STEPS.map((s) => (
            <div
              key={s}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: s === step ? '#d4af37' : '#243447' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
