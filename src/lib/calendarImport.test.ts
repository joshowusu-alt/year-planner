import test from 'node:test'
import assert from 'node:assert/strict'
import type { PlannerEvent } from '../types/index.ts'
import { importCalendarEventsFromIcs } from './calendarImport.ts'

const EMPTY_EVENTS: PlannerEvent[] = []

test('imports a timed weekly recurring event from ICS', async () => {
  const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-1
SUMMARY:Team Sync
DTSTART:20260420T090000
DTEND:20260420T100000
RRULE:FREQ=WEEKLY
DESCRIPTION:Weekly planning call
END:VEVENT
END:VCALENDAR`

  const result = await importCalendarEventsFromIcs(ics, EMPTY_EVENTS, 'meeting')

  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].title, 'Team Sync')
  assert.equal(result.events[0].date, '2026-04-20')
  assert.equal(result.events[0].startTime, '09:00')
  assert.equal(result.events[0].endTime, '10:00')
  assert.equal(result.events[0].category, 'meeting')
  assert.equal(result.events[0].recurrence?.type, 'weekly')
  assert.equal(result.issues.length, 0)
})

test('imports unsupported daily recurrence as a one-time event with a warning', async () => {
  const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-2
SUMMARY:Daily Standup
DTSTART:20260421T090000
RRULE:FREQ=DAILY
END:VEVENT
END:VCALENDAR`

  const result = await importCalendarEventsFromIcs(ics, EMPTY_EVENTS, 'meeting')

  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].recurrence, undefined)
  assert.equal(result.unsupportedRecurrenceCount, 1)
  assert.match(result.issues[0]?.reason ?? '', /one-time event/i)
})

test('skips duplicate events already in the planner', async () => {
  const existing: PlannerEvent[] = [
    {
      id: 'existing',
      date: '2026-04-22',
      title: 'Board Meeting',
      category: 'meeting',
      startTime: '13:00',
      endTime: '14:00',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    },
  ]
  const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-3
SUMMARY:Board Meeting
DTSTART:20260422T130000
DTEND:20260422T140000
END:VEVENT
END:VCALENDAR`

  const result = await importCalendarEventsFromIcs(ics, existing, 'meeting')

  assert.equal(result.events.length, 0)
  assert.equal(result.duplicateCount, 1)
})

test('imports all-day events without times', async () => {
  const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-4
SUMMARY:Conference Day
DTSTART;VALUE=DATE:20260503
DTEND;VALUE=DATE:20260504
END:VEVENT
END:VCALENDAR`

  const result = await importCalendarEventsFromIcs(ics, EMPTY_EVENTS, 'general')

  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].date, '2026-05-03')
  assert.equal(result.events[0].startTime, undefined)
  assert.equal(result.events[0].endTime, undefined)
})
