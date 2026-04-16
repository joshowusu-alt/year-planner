import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CATEGORIES } from '../types/index.ts'
import { parseNaturalLanguage } from './naturalLanguage.ts'

test('parses a meeting with relative date, time, and duration', () => {
  const today = new Date('2026-04-16T09:00:00')
  const parsed = parseNaturalLanguage('team meeting tomorrow at 3pm for 1h', today, DEFAULT_CATEGORIES)

  assert.ok(parsed)
  assert.equal(parsed.title, 'Team meeting')
  assert.equal(parsed.date, '2026-04-17')
  assert.equal(parsed.startTime, '15:00')
  assert.equal(parsed.endTime, '16:00')
  assert.equal(parsed.category, 'meeting')
  assert.equal(parsed.confidence, 'high')
})

test('marks slash dates as ambiguous when both formats are possible', () => {
  const today = new Date('2026-04-16T09:00:00')
  const parsed = parseNaturalLanguage('review 05/04', today, DEFAULT_CATEGORIES)

  assert.ok(parsed)
  assert.equal(parsed._dateAmbiguous, true)
  assert.equal(parsed.date, '2026-05-04')
  assert.equal(parsed.title, 'Review')
})

test('rolls month-name dates into the next year when already passed', () => {
  const today = new Date('2026-12-20T09:00:00')
  const parsed = parseNaturalLanguage('budget review jan 5', today, DEFAULT_CATEGORIES)

  assert.ok(parsed)
  assert.equal(parsed.date, '2027-01-05')
  assert.equal(parsed.title, 'Budget review')
})

test('detects recurring weekly events from weekday phrasing', () => {
  const today = new Date('2026-04-16T09:00:00')
  const parsed = parseNaturalLanguage('weekly sync every monday at 9am', today, DEFAULT_CATEGORIES)

  assert.ok(parsed)
  assert.equal(parsed.recurrence?.type, 'weekly')
  assert.equal(parsed.startTime, '09:00')
  assert.equal(parsed.category, 'meeting')
})
