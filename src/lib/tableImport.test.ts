import test from 'node:test'
import assert from 'node:assert/strict'
import type { PlannerEvent } from '../types/index.ts'
import { DEFAULT_CATEGORIES } from '../types/index.ts'
import { importCalendarEventsFromRows } from './tableImport.ts'

const EMPTY_EVENTS: PlannerEvent[] = []

test('imports spreadsheet rows with category labels, times, recurrence, and reminders', () => {
  const result = importCalendarEventsFromRows(
    [
      {
        Date: '2026-02-03',
        Title: 'Leadership Review',
        Category: 'Meetings',
        'Start Time': '9:30 am',
        'End Time': '10:15 am',
        Notes: 'Quarterly alignment',
        Recurrence: 'monthly',
        Reminder: '15',
      },
    ],
    EMPTY_EVENTS,
    DEFAULT_CATEGORIES,
    'general',
  )

  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].category, 'meeting')
  assert.equal(result.events[0].startTime, '09:30')
  assert.equal(result.events[0].endTime, '10:15')
  assert.equal(result.events[0].recurrence?.type, 'monthly')
  assert.equal(result.events[0].reminder, 15)
})

test('falls back to the selected category when spreadsheet category does not exist', () => {
  const result = importCalendarEventsFromRows(
    [
      {
        Date: '2026-02-10',
        Title: 'Town Hall',
        Category: 'All Hands',
      },
    ],
    EMPTY_EVENTS,
    DEFAULT_CATEGORIES,
    'general',
  )

  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].category, 'general')
  assert.match(result.issues[0]?.reason ?? '', /does not exist/i)
})

test('skips duplicate spreadsheet events already in the planner', () => {
  const existing: PlannerEvent[] = [
    {
      id: 'existing',
      date: '2026-02-12',
      title: 'Board Pack Review',
      category: 'meeting',
      startTime: '13:00',
      endTime: '14:00',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ]

  const result = importCalendarEventsFromRows(
    [
      {
        Date: '2026-02-12',
        Title: 'Board Pack Review',
        'Start Time': '13:00',
        'End Time': '14:00',
      },
    ],
    existing,
    DEFAULT_CATEGORIES,
    'meeting',
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.duplicateCount, 1)
})

test('imports Excel-style numeric dates and warns on unsupported recurrence', () => {
  const result = importCalendarEventsFromRows(
    [
      {
        Date: 46074,
        Title: 'Daily Ops',
        Recurrence: 'daily',
      },
    ],
    EMPTY_EVENTS,
    DEFAULT_CATEGORIES,
    'general',
  )

  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].date, '2026-02-21')
  assert.equal(result.events[0].recurrence, undefined)
  assert.equal(result.unsupportedRecurrenceCount, 1)
})
