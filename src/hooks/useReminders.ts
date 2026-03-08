import { useEffect } from 'react'
import { usePlanner } from '../context/PlannerContext'
import { scheduleReminders, canShowNotifications } from '../lib/notifications'

export function useReminders() {
  const { store } = usePlanner()

  useEffect(() => {
    if (!canShowNotifications()) return
    scheduleReminders(store.events)
    return () => {} // don't cancel on unmount — keep reminders alive
  }, [store.events])

  // Re-schedule when tab becomes visible again
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && canShowNotifications()) {
        scheduleReminders(store.events)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [store.events])
}
