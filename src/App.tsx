import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlannerProvider } from './context/PlannerContext'
import { Sidebar, type Page } from './components/layout/Sidebar'
import { PlannerPage } from './pages/PlannerPage'
import { SettingsPage } from './pages/SettingsPage'
import { GoalsPage } from './pages/GoalsPage'
import { TasksPage } from './pages/TasksPage'
import { NotesPage } from './pages/NotesPage'
import { LoginPage } from './pages/LoginPage'
import { MonthlyCalendar } from './components/planner/MonthlyCalendar'
import { WeeklyView } from './components/planner/WeeklyView'
import { OnboardingModal } from './components/OnboardingModal'

function AppShell() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState<Page>('planner')
  // Onboarding is keyed to the user so each account gets it once
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    setShowOnboarding(!localStorage.getItem(`yearplanner_onboarded_${user.id}`))
  }, [user?.id])

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
      <Sidebar page={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col min-w-0">
        {page === 'planner'  && <PlannerPage />}
        {page === 'monthly'  && <MonthlyCalendar />}
        {page === 'weekly'   && <WeeklyView />}
        {page === 'goals'    && <GoalsPage />}
        {page === 'tasks'    && <TasksPage />}
        {page === 'notes'    && <NotesPage />}
        {page === 'settings' && <SettingsPage />}
      </div>
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
