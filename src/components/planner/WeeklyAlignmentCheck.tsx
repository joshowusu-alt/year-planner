import { useState, useRef, useCallback } from 'react'
import { usePlanner } from '../../context/PlannerContext'
import type { WeeklyReview } from '../../types'

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTIONS: { key: keyof WeeklyReview['answers']; label: string }[] = [
  { key: 'movedForward', label: 'What moved your goals forward this week?' },
  { key: 'wastedTime', label: 'What wasted time this week?' },
  { key: 'nextVitalFew', label: "What are next week's vital few?" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function WeeklyAlignmentCheck() {
  const ctx = usePlanner()
  const { store, currentWeekStart, currentYear } = ctx

  const reviews: WeeklyReview[] = store.weeklyReviews ?? []
  const existing: WeeklyReview | undefined = reviews.find(
    (r: WeeklyReview) => r.weekStart === currentWeekStart,
  )

  const [manuallyStarted, setManuallyStarted] = useState(false)
  const started = !!existing || manuallyStarted

  // Derive local answers from existing review or empty defaults
  const [localAnswers, setLocalAnswers] = useState<WeeklyReview['answers']>(() => ({
    movedForward: existing?.answers.movedForward ?? '',
    wastedTime: existing?.answers.wastedTime ?? '',
    nextVitalFew: existing?.answers.nextVitalFew ?? '',
  }))

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = useCallback(
    (answers: WeeklyReview['answers']) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (existing) {
          ctx.editWeeklyReview(existing.id, { answers })
        } else {
          ctx.addWeeklyReview({
            weekStart: currentWeekStart,
            year: currentYear,
            answers,
          })
        }
      }, 600)
    },
    [existing, currentWeekStart, currentYear, ctx],
  )

  const handleChange = (key: keyof WeeklyReview['answers'], value: string) => {
    const next = { ...localAnswers, [key]: value }
    setLocalAnswers(next)
    debouncedSave(next)
  }

  const handleBlur = () => {
    // Flush pending debounced save immediately
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (existing) {
      ctx.editWeeklyReview(existing.id, { answers: localAnswers })
    } else if (
      localAnswers.movedForward ||
      localAnswers.wastedTime ||
      localAnswers.nextVitalFew
    ) {
      ctx.addWeeklyReview({
        weekStart: currentWeekStart,
        year: currentYear,
        answers: localAnswers,
      })
    }
  }

  const isFilled = (key: keyof WeeklyReview['answers']) =>
    localAnswers[key].trim().length > 0

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: '#1e2d40', background: '#0d1224' }}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(212,175,55,0.15)' }}>
          <svg
            className="h-4 w-4"
            style={{ color: '#d4af37' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[#e2e8f0]">
          Weekly Alignment Check
        </h2>
      </div>

      {/* Not started state */}
      {!started ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-center text-sm text-[#64748b]">
            Take a few minutes to reflect on your week and align next week&apos;s
            priorities.
          </p>
          <button
            type="button"
            onClick={() => setManuallyStarted(true)}
            className="flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: '#d4af37', color: '#0a0e1a' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Start Weekly Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {QUESTIONS.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-lg border p-4"
              style={{ borderColor: '#1e2d40', background: 'rgba(17,24,39,0.6)' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <label className="text-sm font-medium text-[#94a3b8]">
                  {label}
                </label>
                {isFilled(key) && (
                  <svg
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <textarea
                value={localAnswers[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={3}
                placeholder="Type your reflection…"
                className="w-full resize-y rounded-md border px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#64748b] outline-none transition-colors"
                style={{ borderColor: '#1e2d40', background: '#0a0e1a' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)')}
                onBlur={(e) => { handleBlur(); e.currentTarget.style.borderColor = '#1e2d40'; }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
