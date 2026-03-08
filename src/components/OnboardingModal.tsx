/**
 * Onboarding wizard — shown to first-time users
 * Steps: Welcome → Organisation → Categories → Features → Notifications → First Event → Done
 */
import { useState, useEffect } from 'react'
import { ChevronRight, Check, Plus, Trash2, Bell, Calendar, Clock, Zap, Target } from 'lucide-react'
import { usePlanner } from '../context/PlannerContext'
import type { EventCategoryDef } from '../types'
import { DEFAULT_CATEGORIES } from '../types'

interface Props {
  onComplete: () => void
}

type Step = 'welcome' | 'org' | 'categories' | 'features' | 'notifications' | 'first_event' | 'done'

const STEPS: Step[] = ['welcome', 'org', 'categories', 'features', 'notifications', 'first_event', 'done']

export function OnboardingModal({ onComplete }: Props) {
  const { store, updateSettings, addCategory, removeCategory, addEvent } = usePlanner()
  const [step, setStep] = useState<Step>('welcome')

  const [orgName, setOrgName] = useState(store.organizationName || '')
  const [plannerTitle, setPlannerTitle] = useState(store.plannerTitle || '')

  // Local category draft — starts from store.categories (which have DEFAULT_CATEGORIES initially)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#60a5fa')
  const [newBg, setNewBg] = useState('#1e3a5f')

  // Notifications step state
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  // First event step state
  const [firstDate, setFirstDate] = useState(() => new Date().toISOString().split('T')[0])
  const [firstTitle, setFirstTitle] = useState('')
  const [firstCategory, setFirstCategory] = useState(() => store.categories[0]?.id ?? '')
  const [eventAdded, setEventAdded] = useState(false)

  // Auto-advance to done after event added
  useEffect(() => {
    if (eventAdded) {
      const t = setTimeout(() => setStep('done'), 1500)
      return () => clearTimeout(t)
    }
  }, [eventAdded])

  const stepIndex = STEPS.indexOf(step)
  const progressPct = (stepIndex / (STEPS.length - 1)) * 100

  function next() {
    if (step === 'org') {
      updateSettings({ organizationName: orgName.trim(), plannerTitle: plannerTitle.trim() })
    }
    const nextStep = STEPS[stepIndex + 1]
    if (nextStep) setStep(nextStep)
  }

  function finish() {
    onComplete()
  }

  function addCat() {
    if (!newLabel.trim()) return
    addCategory({ label: newLabel.trim(), color: newColor, bgColor: newBg })
    setNewLabel('')
  }

  async function requestNotifications() {
    try {
      const result = await Notification.requestPermission()
      setNotifStatus(result)
    } catch {
      // ignore
    }
  }

  function handleAddFirstEvent() {
    if (!firstTitle.trim()) return
    const cat = firstCategory || store.categories[0]?.id || ''
    addEvent(firstDate, firstTitle.trim(), cat)
    setEventAdded(true)
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
                <div
                  className="text-5xl font-black uppercase mb-1"
                  style={{ color: '#d4af37', letterSpacing: '0.25em' }}
                >
                  STRATUM
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>
                  Executive Planning System
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Your workspace is ready. Let's take 60 seconds to personalise it for you.
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

          {/* ── Step: Features ── */}
          {step === 'features' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2
                  className="text-xl font-black uppercase mb-1"
                  style={{ color: '#d4af37', letterSpacing: '0.15em' }}
                >
                  YOUR COMMAND CENTRE
                </h2>
                <p className="text-xs text-slate-500">Everything you need to plan with clarity.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { Icon: Calendar, title: 'Year Planner', desc: 'See your entire year at a glance with colour-coded events' },
                  { Icon: Clock,    title: 'Time Grid',   desc: 'Hourly weekly view — drag events to reschedule' },
                  { Icon: Zap,      title: 'Quick Add',   desc: 'Press / anywhere to add events in plain English' },
                  { Icon: Target,   title: 'Goals & Tasks', desc: 'Track milestones and daily tasks alongside events' },
                ].map(({ Icon, title, desc }) => (
                  <div
                    key={title}
                    className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ background: '#0a0e1a', border: '1px solid #243447' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(212,175,55,0.15)' }}
                    >
                      <Icon size={16} style={{ color: '#d4af37' }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold mb-0.5" style={{ color: '#e2e8f0' }}>{title}</div>
                      <div className="text-xs leading-snug" style={{ color: '#94a3b8' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={next}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#d4af37', color: '#111827' }}
              >
                Next →
              </button>
            </div>
          )}

          {/* ── Step: Notifications ── */}
          {step === 'notifications' && (
            <div className="space-y-6 text-center">
              <div>
                <h2
                  className="text-xl font-black uppercase mb-1"
                  style={{ color: '#d4af37', letterSpacing: '0.15em' }}
                >
                  STAY ON TRACK
                </h2>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}
                >
                  <Bell size={28} style={{ color: '#d4af37' }} />
                </div>
                <div>
                  <div className="text-base font-bold mb-2" style={{ color: '#e2e8f0' }}>Never miss an event</div>
                  <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                    STRATUM can send you browser notifications before events start. You can set reminders per-event.
                  </p>
                </div>
                <div className="w-full">
                  {notifStatus === 'granted' && (
                    <div
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
                    >
                      <Check size={15} />
                      Notifications enabled ✓
                    </div>
                  )}
                  {notifStatus === 'denied' && (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                      Notifications blocked — enable in browser settings
                    </p>
                  )}
                  {notifStatus === 'default' && (
                    <button
                      onClick={requestNotifications}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: '#d4af37', color: '#111827' }}
                    >
                      <Bell size={15} /> Enable Notifications
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                {notifStatus !== 'default' && (
                  <button
                    onClick={next}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: '#d4af37', color: '#111827' }}
                  >
                    Next →
                  </button>
                )}
                <button
                  onClick={next}
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: '#94a3b8' }}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ── Step: First Event ── */}
          {step === 'first_event' && (
            <div className="space-y-5">
              <div>
                <h2
                  className="text-xl font-black uppercase mb-1"
                  style={{ color: '#d4af37', letterSpacing: '0.15em' }}
                >
                  ADD YOUR FIRST EVENT
                </h2>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  Add something to celebrate getting started 🎉
                </p>
              </div>

              {eventAdded ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}
                  >
                    <Check size={26} style={{ color: '#34d399' }} />
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#34d399' }}>
                    Event added! Check the Year Planner.
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={firstDate}
                        onChange={(e) => setFirstDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                        style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0', colorScheme: 'dark' }}
                      />
                    </div>
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
                        Title
                      </label>
                      <input
                        autoFocus
                        type="text"
                        value={firstTitle}
                        onChange={(e) => setFirstTitle(e.target.value)}
                        placeholder="e.g. Strategy planning session"
                        className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                        style={{ background: '#1e2d40', border: '1px solid #243447', color: '#e2e8f0' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddFirstEvent() }}
                      />
                    </div>
                    {/* Category pills */}
                    {store.categories.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
                          Category
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {store.categories.map((cat: EventCategoryDef) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setFirstCategory(cat.id)}
                              className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                              style={{
                                background: firstCategory === cat.id ? cat.bgColor : '#1e2d40',
                                color: firstCategory === cat.id ? cat.color : '#94a3b8',
                                border: `1px solid ${firstCategory === cat.id ? cat.color : '#243447'}`,
                              }}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddFirstEvent}
                    disabled={!firstTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#d4af37', color: '#111827' }}
                  >
                    Add Event
                  </button>
                </>
              )}

              <button
                onClick={() => setStep('done')}
                className="w-full text-xs transition-opacity hover:opacity-80"
                style={{ color: '#94a3b8' }}
              >
                Skip
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
                <h2 className="text-2xl font-black uppercase mb-2" style={{ color: '#d4af37', letterSpacing: '0.1em' }}>
                  YOU'RE READY TO PLAN
                </h2>
                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#94a3b8' }}>
                  Your planner is personalised and ready. Here are a few shortcuts to get you moving fast:
                </p>
              </div>

              <div className="text-left space-y-3">
                {[
                  { key: '/', desc: 'Quick Add an event in plain English' },
                  { key: '← →', desc: 'Navigate between weeks and months' },
                ].map(({ key, desc }) => (
                  <div key={key} className="flex items-center gap-3">
                    <kbd
                      style={{
                        background: '#1e2d40',
                        border: '1px solid #243447',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontFamily: 'monospace',
                        color: '#d4af37',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {key}
                    </kbd>
                    <span className="text-sm" style={{ color: '#94a3b8' }}>{desc}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs" style={{ color: '#94a3b8' }}>
                Revisit settings anytime via <strong style={{ color: '#e2e8f0' }}>Settings</strong> in the sidebar.
              </div>
              <button
                onClick={finish}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
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
