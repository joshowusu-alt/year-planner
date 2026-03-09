import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlannerProvider } from './context/PlannerContext'
import { usePlanner } from './context/PlannerContext'
import { UndoContext } from './context/UndoContext'
import { useUndoToast } from './hooks/useUndoToast'
import { Sidebar, type Page } from './components/layout/Sidebar'
import { MobileHeader } from './components/layout/MobileHeader'
import { NaturalLanguageInput } from './components/NaturalLanguageInput'
import { BottomNavigation } from './components/layout/BottomNavigation'
import { MobileDrawer } from './components/layout/MobileDrawer'
import { PlannerPage } from './pages/PlannerPage'
import { SettingsPage } from './pages/SettingsPage'
import { GoalsPage } from './pages/GoalsPage'
import { TasksPage } from './pages/TasksPage'
import { NotesPage } from './pages/NotesPage'
import { LoginPage } from './pages/LoginPage'
import { MonthlyCalendar } from './components/planner/MonthlyCalendar'
import { WeeklyView } from './components/planner/WeeklyView'
import { OnboardingModal } from './components/OnboardingModal'
import { EventModal } from './components/planner/EventModal'
import { StrategyPage } from './pages/StrategyPage'
import { SearchPage } from './pages/SearchPage'
import { SharedPlannerView } from './components/SharedPlannerView'
import { useBreakpoint } from './hooks/useMediaQuery'
import { useReminders } from './hooks/useReminders'

function AppShell() {
  const { user, loading } = useAuth()
  const { addEvent } = usePlanner()
  useReminders()
  const { pushUndo, toastNode } = useUndoToast()
  const [page, setPage] = useState<Page>('planner')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileAddEvent, setMobileAddEvent] = useState(false)
  const [showNLInput, setShowNLInput] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('share')
  })
  const { isMobile } = useBreakpoint()

  // Global '/' shortcut → open NL quick-add (skip if focus is in a text input)
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
    setShowOnboarding(!localStorage.getItem(`yearplanner_onboarded_${user.id}`))
  }, [user?.id])

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="text-slate-500 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  if (shareToken) {
    return (
      <SharedPlannerView
        token={shareToken}
        onClose={() => setShareToken(null)}
      />
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <UndoContext.Provider value={{ pushUndo }}>
    <div className="flex flex-col w-full max-w-full overflow-x-hidden md:flex-row" style={{ background: '#0a0e1a', color: '#e2e8f0', height: '100%' }}>
      {/* Desktop / Tablet sidebar */}
      <div className="hidden md:block">
        <Sidebar page={page} onNavigate={setPage} />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        page={page}
        onNavigate={setPage}
      />

      <div className="flex-1 min-h-0 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        {/* Mobile header */}
        {isMobile && (
          <MobileHeader
            onMenuToggle={() => setDrawerOpen(true)}
            onAddEvent={() => setMobileAddEvent(true)}
            onQuickAdd={() => setShowNLInput(true)}
          />
        )}

        {/* Main content — bottom padding on mobile for bottom nav + safe area */}
        <div className={isMobile ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-20' : 'flex-1 min-h-0'}>
          {page === 'planner'  && <PlannerPage />}
          {page === 'monthly'  && <MonthlyCalendar />}
          {page === 'weekly'   && <WeeklyView />}
          {page === 'goals'    && <GoalsPage />}
          {page === 'tasks'    && <TasksPage />}
          {page === 'notes'    && <NotesPage />}
          {page === 'strategy' && <StrategyPage />}
          {page === 'search'   && <SearchPage onNavigate={setPage} />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavigation page={page} onNavigate={setPage} />

      {/* Mobile quick-add event modal */}
      {mobileAddEvent && (
        <EventModal
          onSave={(data) => {
          addEvent(data.date, data.title, data.category, data.notes, data.recurrence, data.startTime, data.endTime, data.reminder)
            setMobileAddEvent(false)
          }}
          onClose={() => setMobileAddEvent(false)}
        />
      )}

      {/* Natural Language Quick-Add */}
      {showNLInput && (
        <NaturalLanguageInput onClose={() => setShowNLInput(false)} />
      )}

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            localStorage.setItem(`yearplanner_onboarded_${user!.id}`, 'true')
            setShowOnboarding(false)
          }}
        />
      )}
      {toastNode}
    </div>
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
