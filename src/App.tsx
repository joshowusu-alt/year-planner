import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlannerProvider } from './context/PlannerContext'
import { usePlanner } from './context/PlannerContext'
import { Sidebar, type Page } from './components/layout/Sidebar'
import { MobileHeader } from './components/layout/MobileHeader'
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
import { useBreakpoint } from './hooks/useMediaQuery'

function AppShell() {
  const { user, loading } = useAuth()
  const { addEvent } = usePlanner()
  const [page, setPage] = useState<Page>('planner')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileAddEvent, setMobileAddEvent] = useState(false)
  const { isMobile } = useBreakpoint()

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

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0e1a', color: '#e2e8f0' }}>
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

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <MobileHeader
            onMenuToggle={() => setDrawerOpen(true)}
            onAddEvent={() => setMobileAddEvent(true)}
          />
        )}

        {/* Main content — add bottom padding on mobile for bottom nav */}
        <div className={isMobile ? 'pb-16' : ''}>
          {page === 'planner'  && <PlannerPage />}
          {page === 'monthly'  && <MonthlyCalendar />}
          {page === 'weekly'   && <WeeklyView />}
          {page === 'goals'    && <GoalsPage />}
          {page === 'tasks'    && <TasksPage />}
          {page === 'notes'    && <NotesPage />}
          {page === 'strategy' && <StrategyPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavigation page={page} onNavigate={setPage} />

      {/* Mobile quick-add event modal */}
      {mobileAddEvent && (
        <EventModal
          onSave={(data) => {
            addEvent(data.date, data.title, data.category, data.notes, data.recurrence)
            setMobileAddEvent(false)
          }}
          onClose={() => setMobileAddEvent(false)}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            localStorage.setItem(`yearplanner_onboarded_${user!.id}`, 'true')
            setShowOnboarding(false)
          }}
        />
      )}
    </div>
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
