import { lazy, Suspense, useState, useEffect, useLayoutEffect, useCallback, useRef, type CSSProperties } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlannerProvider, usePlanner } from './context/PlannerContext'
import { UndoContext } from './context/UndoContext'
import { useUndoToast } from './hooks/useUndoToast'
import { Sidebar } from './components/layout/Sidebar'
import { MobileHeader } from './components/layout/MobileHeader'
import { NaturalLanguageInput } from './components/NaturalLanguageInput'
import { BottomNavigation } from './components/layout/BottomNavigation'
import { MobileDrawer } from './components/layout/MobileDrawer'
import { EventModal } from './components/planner/EventModal'
import { SharedPlannerView } from './components/SharedPlannerView'
import { useBreakpoint } from './hooks/useMediaQuery'
import { useReminders } from './hooks/useReminders'
import { hasCompletedOnboarding, markOnboardingCompleted } from './lib/onboarding'
import { PLANNER_PRINT_REQUEST_EVENT } from './lib/plannerNavigation'

const PlannerPage = lazy(() => import('./pages/PlannerPage').then(m => ({ default: m.PlannerPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })))
const NotesPage = lazy(() => import('./pages/NotesPage').then(m => ({ default: m.NotesPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const MonthlyCalendar = lazy(() => import('./components/planner/MonthlyCalendar').then(m => ({ default: m.MonthlyCalendar })))
const WeeklyView = lazy(() => import('./components/planner/WeeklyView').then(m => ({ default: m.WeeklyView })))
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })))
const StrategyPage = lazy(() => import('./pages/StrategyPage').then(m => ({ default: m.StrategyPage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
// PrintLayout and ExportModal are NOT lazy-loaded: PrintLayout adds `stratum-export-mode`
// to <body> in a useEffect, and window.print() fires 300ms after it mounts. A lazy chunk
// that hasn't loaded yet won't have run its useEffect, so the class never gets set and the
// print preview renders a solid black page. Keep these as static imports.
import { ExportModal } from './components/ExportModal'
import { PrintLayout } from './components/PrintLayout'
import type { ExportConfig } from './lib/exportIntelligence'
import { generateStratumPDF } from './lib/pdfExport'

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-slate-500 text-sm animate-pulse">Loading…</div>
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const { addEvent, conflictWarning, dismissConflict } = usePlanner()
  useReminders()
  const { pushUndo, toastNode } = useUndoToast()
  const location = useLocation()
  const navigate = useNavigate()
  const locationRef = useRef(location)
  const contentScrollRef = useRef<HTMLDivElement>(null)

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileAddEvent, setMobileAddEvent] = useState(false)
  const [showNLInput, setShowNLInput] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [pdfProgress, setPdfProgress] = useState({ page: 0, total: 0 })
  const pendingPrintRef = useRef(false)
  const [shareToken, setShareToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('share')
  })
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    locationRef.current = location
  }, [location])

  const resetMobileScroll = useCallback(() => {
    const root = contentScrollRef.current
    root?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    root
      ?.querySelectorAll<HTMLElement>('[data-route-scroll], .overflow-auto, .overflow-y-auto')
      .forEach((element) => {
        element.scrollTop = 0
        element.scrollLeft = 0
      })
  }, [])

  useLayoutEffect(() => {
    if (!isMobile) return
    resetMobileScroll()
    const frame = window.requestAnimationFrame(resetMobileScroll)
    return () => window.cancelAnimationFrame(frame)
  }, [isMobile, location.pathname, resetMobileScroll])

  useEffect(() => {
    const handleScrollTopRequest = () => resetMobileScroll()
    window.addEventListener('stratum:scroll-top', handleScrollTopRequest)
    return () => window.removeEventListener('stratum:scroll-top', handleScrollTopRequest)
  }, [resetMobileScroll])

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== '/') return
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable
    if (isEditable) return
    e.preventDefault()
    setShowNLInput(true)
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  useEffect(() => {
    if (!user?.id) return
    setShowOnboarding(!hasCompletedOnboarding(user.id))
  }, [user?.id])

  useEffect(() => {
    if (!exportConfig) return
    setIsGeneratingPDF(true)
    setPdfProgress({ page: 0, total: 0 })
    document.body.classList.add('stratum-generating-pdf')

    const id = window.setTimeout(async () => {
      const { mode, year } = exportConfig
      const filename = `STRATUM-${mode === 'forward-planner' ? 'Planner' : 'Report'}-${year}.pdf`
      try {
        await generateStratumPDF('stratum-print-layout', filename, {
          onProgress: (p) => setPdfProgress(p),
        })
      } catch (err) {
        console.error('[STRATUM] PDF generation failed:', err)
      } finally {
        setIsGeneratingPDF(false)
        document.body.classList.remove('stratum-generating-pdf')
        setExportConfig(null)
      }
    }, 400)

    return () => {
      window.clearTimeout(id)
      document.body.classList.remove('stratum-generating-pdf')
    }
  }, [exportConfig])

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  useEffect(() => {
    const handlePlannerPrintRequest = () => {
      const current = locationRef.current.pathname
      if (current === '/planner' || current === '/') {
        window.setTimeout(() => window.print(), 75)
        return
      }
      pendingPrintRef.current = true
      navigate('/planner')
    }
    window.addEventListener(PLANNER_PRINT_REQUEST_EVENT, handlePlannerPrintRequest)
    return () => window.removeEventListener(PLANNER_PRINT_REQUEST_EVENT, handlePlannerPrintRequest)
  }, [navigate])

  useEffect(() => {
    const current = location.pathname
    if ((current !== '/planner' && current !== '/') || !pendingPrintRef.current) return
    const id = window.setTimeout(() => {
      window.print()
      pendingPrintRef.current = false
    }, 75)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="text-slate-500 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  if (shareToken) {
    return (
      <Suspense fallback={<PageFallback />}>
        <SharedPlannerView
          token={shareToken}
          onClose={() => setShareToken(null)}
        />
      </Suspense>
    )
  }

  if (!user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <LoginPage />
      </Suspense>
    )
  }

  return (
    <UndoContext.Provider value={{ pushUndo }}>
      {conflictWarning && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-[300] flex items-center justify-between gap-3 px-4 py-2 text-sm"
          style={{ background: '#7c2d12', color: '#fed7aa', borderBottom: '1px solid #c2410c' }}
        >
          <span>⚠️ Your data was modified in another window or device. Reload to get the latest version.</span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 rounded font-semibold text-xs"
              style={{ background: '#c2410c', color: '#fff' }}
            >
              Reload
            </button>
            <button
              onClick={dismissConflict}
              className="px-3 py-1 rounded font-semibold text-xs"
              style={{ background: 'transparent', color: '#fed7aa', border: '1px solid #c2410c' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div id="app-shell" className="flex flex-col w-full max-w-full overflow-x-hidden md:flex-row" style={{ background: '#0a0e1a', color: '#e2e8f0', height: '100%' }}>
        <div className="hidden md:block">
          <Sidebar onExportRequest={() => setShowExportModal(true)} />
        </div>

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onExportRequest={() => setShowExportModal(true)}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
          {isMobile && (
            <MobileHeader
              onMenuToggle={() => setDrawerOpen(true)}
              onAddEvent={() => setMobileAddEvent(true)}
              onQuickAdd={() => setShowNLInput(true)}
            />
          )}

          <div
            ref={contentScrollRef}
            data-route-scroll
            className={isMobile ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-20' : 'flex-1 min-h-0 overflow-hidden'}
          >
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/planner" replace />} />
                <Route path="/planner"   element={<PlannerPage />} />
                <Route path="/monthly"   element={<MonthlyCalendar />} />
                <Route path="/weekly"    element={<WeeklyView />} />
                <Route path="/goals"     element={<GoalsPage />} />
                <Route path="/tasks"     element={<TasksPage />} />
                <Route path="/notes"     element={<NotesPage />} />
                <Route path="/strategy"  element={<StrategyPage />} />
                <Route path="/search"    element={<SearchPage />} />
                <Route path="/settings"  element={<SettingsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
              </Routes>
            </Suspense>
          </div>
        </div>

        <BottomNavigation />

        {showNLInput && (
          <NaturalLanguageInput onClose={() => setShowNLInput(false)} />
        )}

        {toastNode}

        <Suspense fallback={<PageFallback />}>
          {mobileAddEvent && (
            <EventModal
              onSave={(data) => {
                addEvent(data.date, data.title, data.category, data.notes, data.recurrence, data.startTime, data.endTime, data.reminder)
                setMobileAddEvent(false)
              }}
              onClose={() => setMobileAddEvent(false)}
            />
          )}

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

          {showExportModal && (
            <ExportModal
              onClose={() => setShowExportModal(false)}
              onExport={(config) => {
                setShowExportModal(false)
                setExportConfig(config)
              }}
            />
          )}
        </Suspense>
      </div>
      <Suspense fallback={<PageFallback />}>
        {exportConfig && (
          <PrintLayout
            year={exportConfig.year}
            months={exportConfig.months}
            mode={exportConfig.mode}
            options={exportConfig.options}
          />
        )}
      </Suspense>

      {/* PDF generation overlay — covers screen while html2canvas captures pages */}
      {isGeneratingPDF && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10, 14, 26, 0.97)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        } as CSSProperties}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(212, 175, 55, 0.25)',
            borderTopColor: '#d4af37',
            borderRadius: '50%',
            animation: 'stratum-spin 0.9s linear infinite',
          }} />
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em', margin: 0 }}>
            Generating PDF…
          </p>
          {pdfProgress.total > 0 && (
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
              Page {pdfProgress.page} of {pdfProgress.total}
            </p>
          )}
        </div>
      )}
    </UndoContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PlannerProvider>
        <HashRouter>
          <AppShell />
        </HashRouter>
      </PlannerProvider>
    </AuthProvider>
  )
}
