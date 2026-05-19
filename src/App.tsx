import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlannerProvider, usePlanner } from './context/PlannerContext'
import { UndoContext } from './context/UndoContext'
import { useUndoToast } from './hooks/useUndoToast'
import { Sidebar, type Page } from './components/layout/Sidebar'
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

  const getPageFromHash = (): Page => {
    const hash = window.location.hash.slice(1) as Page
    const validPages: Page[] = ['planner','monthly','weekly','goals','tasks','notes','settings','strategy','search','dashboard']
    return validPages.includes(hash) ? hash : 'planner'
  }

  const [page, setPage] = useState<Page>(getPageFromHash)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileAddEvent, setMobileAddEvent] = useState(false)
  const [showNLInput, setShowNLInput] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportConfig, setExportConfig] = useState<{ year: number; months: number[] } | null>(null)
  const pageRef = useRef<Page>('planner')
  const pendingPrintRef = useRef(false)
  const [shareToken, setShareToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('share')
  })
  const { isMobile } = useBreakpoint()

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
    pageRef.current = page
    // PKCE: code comes in via ?code= query param; implicit: token in #access_token= hash.
    // In both cases, leave the URL untouched while Supabase processes the callback.
    const sp = new URLSearchParams(window.location.search)
    if (
      window.location.hash.startsWith('#access_token') ||
      window.location.hash.startsWith('#error_description') ||
      sp.has('code') ||
      sp.has('error')
    ) return
    const newHash = page === 'planner' ? '' : `#${page}`
    if (window.location.hash !== newHash) {
      if (page === 'planner') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      } else {
        window.history.pushState(null, '', window.location.pathname + window.location.search + `#${page}`)
      }
    }
  }, [page])

  useEffect(() => {
    const handlePopState = () => setPage(getPageFromHash())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!exportConfig) return
    const id = window.setTimeout(() => window.print(), 300)
    return () => window.clearTimeout(id)
  }, [exportConfig])

  useEffect(() => {
    if (!exportConfig) return
    const cleanup = () => setExportConfig(null)
    window.addEventListener('afterprint', cleanup)
    return () => window.removeEventListener('afterprint', cleanup)
  }, [exportConfig])

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  useEffect(() => {
    const handlePlannerPrintRequest = () => {
      if (pageRef.current === 'planner') {
        window.setTimeout(() => window.print(), 75)
        return
      }

      pendingPrintRef.current = true
      setPage('planner')
    }

    window.addEventListener(PLANNER_PRINT_REQUEST_EVENT, handlePlannerPrintRequest)
    return () => window.removeEventListener(PLANNER_PRINT_REQUEST_EVENT, handlePlannerPrintRequest)
  }, [])

  useEffect(() => {
    if (page !== 'planner' || !pendingPrintRef.current) return

    const timeoutId = window.setTimeout(() => {
      window.print()
      pendingPrintRef.current = false
    }, 75)

    return () => window.clearTimeout(timeoutId)
  }, [page])

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
          <Sidebar page={page} onNavigate={setPage} onExportRequest={() => setShowExportModal(true)} />
        </div>

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          page={page}
          onNavigate={setPage}
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

          <div className={isMobile ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-20' : 'flex-1 min-h-0 overflow-hidden'}>
            <Suspense fallback={<PageFallback />}>
              {page === 'planner'   && <PlannerPage />}
              {page === 'monthly'   && <MonthlyCalendar />}
              {page === 'weekly'    && <WeeklyView />}
              {page === 'goals'     && <GoalsPage onNavigate={setPage} />}
              {page === 'tasks'     && <TasksPage />}
              {page === 'notes'     && <NotesPage />}
              {page === 'strategy'  && <StrategyPage />}
              {page === 'search'    && <SearchPage onNavigate={setPage} />}
              {page === 'settings'  && <SettingsPage />}
              {page === 'dashboard' && <DashboardPage />}
            </Suspense>
          </div>
        </div>

        <BottomNavigation page={page} onNavigate={setPage} />

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
              onExport={(year, months) => {
                setShowExportModal(false)
                setExportConfig({ year, months })
              }}
            />
          )}
        </Suspense>
      </div>
      <Suspense fallback={<PageFallback />}>
        {exportConfig && <PrintLayout year={exportConfig.year} months={exportConfig.months} />}
      </Suspense>
    </UndoContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PlannerProvider>
        <AppShell />
      </PlannerProvider>
    </AuthProvider>
  )
}
