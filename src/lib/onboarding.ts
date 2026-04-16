const LEGACY_ONBOARDING_KEY = 'yearplanner_onboarded'

export function getOnboardingStorageKey(userId: string): string {
  return `${LEGACY_ONBOARDING_KEY}_${userId}`
}

export function hasCompletedOnboarding(userId: string): boolean {
  const key = getOnboardingStorageKey(userId)
  const userScoped = localStorage.getItem(key) === 'true'
  if (userScoped) return true

  const legacy = localStorage.getItem(LEGACY_ONBOARDING_KEY) === 'true'
  if (legacy) {
    localStorage.setItem(key, 'true')
    localStorage.removeItem(LEGACY_ONBOARDING_KEY)
    return true
  }

  return false
}

export function markOnboardingCompleted(userId: string): void {
  localStorage.setItem(getOnboardingStorageKey(userId), 'true')
  localStorage.removeItem(LEGACY_ONBOARDING_KEY)
}
