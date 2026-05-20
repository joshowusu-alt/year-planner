import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createEvent,
  bulkCreateEvents,
  updateEvent,
  deleteEvent,
  updateEventInstance,
  deleteEventOccurrence,
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  createTask,
  updateTask,
  deleteTask,
  createNote,
  updateNote,
  deleteNote,
  createVitalFew,
  updateVitalFew,
  deleteVitalFew,
} from './store-ops.ts'
import { DEFAULT_CATEGORIES } from '../types/index.ts'
import type { PlannerStore } from '../types/index.ts'

function emptyStore(): PlannerStore {
  return {
    schemaVersion: 1,
    events: [],
    monthMeta: [],
    goals: [],
    tasks: [],
    notes: [],
    vitalFew: [],
    weeklyReviews: [],
    categories: DEFAULT_CATEGORIES,
    organizationName: '',
    plannerTitle: '',
    accentColor: '#d4af37',
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────

test('createEvent adds an event with generated id and timestamps', () => {
  const store = emptyStore()
  const next = createEvent(store, { date: '2026-06-01', title: 'Standup', category: 'meeting' })
  assert.equal(next.events.length, 1)
  const ev = next.events[0]
  assert.ok(ev.id.length > 0)
  assert.equal(ev.title, 'Standup')
  assert.equal(ev.date, '2026-06-01')
  assert.ok(ev.createdAt)
  assert.ok(ev.updatedAt)
  assert.equal(store.events.length, 0, 'original store is not mutated')
})

test('bulkCreateEvents adds multiple events atomically', () => {
  const store = emptyStore()
  const next = bulkCreateEvents(store, [
    { date: '2026-06-01', title: 'A', category: 'general' },
    { date: '2026-06-02', title: 'B', category: 'general' },
    { date: '2026-06-03', title: 'C', category: 'general' },
  ])
  assert.equal(next.events.length, 3)
  const ids = new Set(next.events.map((e) => e.id))
  assert.equal(ids.size, 3, 'each event gets a unique id')
})

test('updateEvent patches only the target event', () => {
  const s1 = createEvent(emptyStore(), { date: '2026-06-01', title: 'Original', category: 'meeting' })
  const s2 = createEvent(s1, { date: '2026-06-02', title: 'Other', category: 'general' })
  const targetId = s2.events[0].id
  const next = updateEvent(s2, targetId, { title: 'Updated' })
  assert.equal(next.events[0].title, 'Updated')
  assert.equal(next.events[1].title, 'Other', 'sibling event is untouched')
})

test('deleteEvent removes the event by id', () => {
  const s1 = createEvent(emptyStore(), { date: '2026-06-01', title: 'Keep', category: 'general' })
  const s2 = createEvent(s1, { date: '2026-06-02', title: 'Remove', category: 'general' })
  const removeId = s2.events[1].id
  const next = deleteEvent(s2, removeId)
  assert.equal(next.events.length, 1)
  assert.equal(next.events[0].title, 'Keep')
})

test('updateEventInstance stores an override for a specific occurrence date', () => {
  const s1 = createEvent(emptyStore(), {
    date: '2026-06-02',
    title: 'Weekly',
    category: 'meeting',
    recurrence: { type: 'weekly' },
  })
  const baseId = s1.events[0].id
  const next = updateEventInstance(s1, baseId, '2026-06-09', { title: 'Renamed occurrence' })
  assert.deepEqual(next.events[0].instanceOverrides?.['2026-06-09'], { title: 'Renamed occurrence' })
  assert.equal(next.events[0].title, 'Weekly', 'base title unchanged')
})

test('updateEventInstance merges with existing overrides', () => {
  const s1 = createEvent(emptyStore(), { date: '2026-06-02', title: 'Weekly', category: 'meeting', recurrence: { type: 'weekly' } })
  const baseId = s1.events[0].id
  const s2 = updateEventInstance(s1, baseId, '2026-06-09', { title: 'Renamed' })
  const s3 = updateEventInstance(s2, baseId, '2026-06-09', { notes: 'Added note' })
  assert.equal(s3.events[0].instanceOverrides?.['2026-06-09']?.title, 'Renamed')
  assert.equal(s3.events[0].instanceOverrides?.['2026-06-09']?.notes, 'Added note')
})

test('deleteEventOccurrence adds the date to deletedDates', () => {
  const s1 = createEvent(emptyStore(), { date: '2026-06-02', title: 'Weekly', category: 'meeting', recurrence: { type: 'weekly' } })
  const baseId = s1.events[0].id
  const next = deleteEventOccurrence(s1, baseId, '2026-06-09')
  assert.deepEqual(next.events[0].deletedDates, ['2026-06-09'])
})

test('deleteEventOccurrence appends without duplicates on repeated calls', () => {
  const s1 = createEvent(emptyStore(), { date: '2026-06-02', title: 'Weekly', category: 'meeting', recurrence: { type: 'weekly' } })
  const baseId = s1.events[0].id
  const s2 = deleteEventOccurrence(s1, baseId, '2026-06-09')
  const s3 = deleteEventOccurrence(s2, baseId, '2026-06-16')
  assert.deepEqual(s3.events[0].deletedDates, ['2026-06-09', '2026-06-16'])
})

// ─── Goals ───────────────────────────────────────────────────────────────────

test('createGoal adds a goal with empty milestones', () => {
  const store = emptyStore()
  const next = createGoal(store, {
    title: 'Ship v1',
    year: 2026,
    progress: 0,
    status: 'not-started',
    priority: 'high',
  })
  assert.equal(next.goals.length, 1)
  assert.equal(next.goals[0].title, 'Ship v1')
  assert.deepEqual(next.goals[0].milestones, [])
})

test('updateGoal patches the target goal and sets updatedAt', () => {
  const s1 = createGoal(emptyStore(), { title: 'Ship v1', year: 2026, progress: 0, status: 'not-started', priority: 'high' })
  const id = s1.goals[0].id
  const before = s1.goals[0].updatedAt
  const next = updateGoal(s1, id, { progress: 50, status: 'in-progress' })
  assert.equal(next.goals[0].progress, 50)
  assert.equal(next.goals[0].status, 'in-progress')
  assert.ok(next.goals[0].updatedAt >= before)
})

test('deleteGoal removes the goal by id', () => {
  const s1 = createGoal(emptyStore(), { title: 'A', year: 2026, progress: 0, status: 'not-started', priority: 'low' })
  const s2 = createGoal(s1, { title: 'B', year: 2026, progress: 0, status: 'not-started', priority: 'low' })
  const removeId = s2.goals[0].id
  const next = deleteGoal(s2, removeId)
  assert.equal(next.goals.length, 1)
  assert.equal(next.goals[0].title, 'B')
})

test('addMilestone attaches a milestone to the correct goal', () => {
  const s1 = createGoal(emptyStore(), { title: 'Ship v1', year: 2026, progress: 0, status: 'not-started', priority: 'high' })
  const goalId = s1.goals[0].id
  const next = addMilestone(s1, goalId, { title: 'Alpha release', completed: false })
  assert.equal(next.goals[0].milestones.length, 1)
  assert.equal(next.goals[0].milestones[0].goalId, goalId)
})

test('updateMilestone toggles completion state', () => {
  const s1 = createGoal(emptyStore(), { title: 'Goal', year: 2026, progress: 0, status: 'not-started', priority: 'medium' })
  const goalId = s1.goals[0].id
  const s2 = addMilestone(s1, goalId, { title: 'M1', completed: false })
  const milestoneId = s2.goals[0].milestones[0].id
  const next = updateMilestone(s2, goalId, milestoneId, { completed: true })
  assert.equal(next.goals[0].milestones[0].completed, true)
})

test('deleteMilestone removes the milestone from its goal', () => {
  const s1 = createGoal(emptyStore(), { title: 'Goal', year: 2026, progress: 0, status: 'not-started', priority: 'low' })
  const goalId = s1.goals[0].id
  const s2 = addMilestone(s1, goalId, { title: 'M1', completed: false })
  const s3 = addMilestone(s2, goalId, { title: 'M2', completed: false })
  const removeId = s3.goals[0].milestones[0].id
  const next = deleteMilestone(s3, goalId, removeId)
  assert.equal(next.goals[0].milestones.length, 1)
  assert.equal(next.goals[0].milestones[0].title, 'M2')
})

// ─── Tasks ───────────────────────────────────────────────────────────────────

test('createTask adds a task with correct defaults', () => {
  const store = emptyStore()
  const next = createTask(store, { title: 'Review PR', year: 2026, period: 'day', priority: 'medium', completed: false })
  assert.equal(next.tasks.length, 1)
  assert.ok(next.tasks[0].id)
  assert.equal(next.tasks[0].completed, false)
})

test('updateTask marks task completed', () => {
  const s1 = createTask(emptyStore(), { title: 'Task', year: 2026, period: 'week', priority: 'low', completed: false })
  const id = s1.tasks[0].id
  const next = updateTask(s1, id, { completed: true })
  assert.equal(next.tasks[0].completed, true)
})

test('deleteTask removes by id', () => {
  const s1 = createTask(emptyStore(), { title: 'A', year: 2026, period: 'day', priority: 'low', completed: false })
  const s2 = createTask(s1, { title: 'B', year: 2026, period: 'day', priority: 'low', completed: false })
  const next = deleteTask(s2, s2.tasks[0].id)
  assert.equal(next.tasks.length, 1)
  assert.equal(next.tasks[0].title, 'B')
})

// ─── Notes ───────────────────────────────────────────────────────────────────

test('createNote sets pinned false and assigns id', () => {
  const store = emptyStore()
  const next = createNote(store, { title: 'Q1 retro', content: '<p>Done</p>', periodType: 'quarter', periodRef: '2026-Q1', year: 2026, pinned: false })
  assert.equal(next.notes.length, 1)
  assert.ok(next.notes[0].id)
  assert.equal(next.notes[0].pinned, false)
})

test('updateNote changes content', () => {
  const s1 = createNote(emptyStore(), { title: 'Draft', content: 'v1', periodType: 'month', periodRef: '2026-06', year: 2026, pinned: false })
  const id = s1.notes[0].id
  const next = updateNote(s1, id, { content: 'v2', pinned: true })
  assert.equal(next.notes[0].content, 'v2')
  assert.equal(next.notes[0].pinned, true)
})

test('deleteNote removes by id', () => {
  const s1 = createNote(emptyStore(), { title: 'A', content: '', periodType: 'day', periodRef: '2026-06-01', year: 2026, pinned: false })
  const s2 = createNote(s1, { title: 'B', content: '', periodType: 'day', periodRef: '2026-06-02', year: 2026, pinned: false })
  const next = deleteNote(s2, s2.notes[0].id)
  assert.equal(next.notes.length, 1)
  assert.equal(next.notes[0].title, 'B')
})

// ─── VitalFew ────────────────────────────────────────────────────────────────

test('createVitalFew adds a priority with id and timestamps', () => {
  const store = emptyStore()
  const next = createVitalFew(store, { title: 'Close deal', weekStart: '2026-06-01', year: 2026, completed: false })
  assert.equal(next.vitalFew.length, 1)
  assert.ok(next.vitalFew[0].id)
})

test('updateVitalFew marks item completed', () => {
  const s1 = createVitalFew(emptyStore(), { title: 'Do the thing', weekStart: '2026-06-01', year: 2026, completed: false })
  const id = s1.vitalFew[0].id
  const next = updateVitalFew(s1, id, { completed: true })
  assert.equal(next.vitalFew[0].completed, true)
})

test('deleteVitalFew removes by id', () => {
  const s1 = createVitalFew(emptyStore(), { title: 'A', weekStart: '2026-06-01', year: 2026, completed: false })
  const s2 = createVitalFew(s1, { title: 'B', weekStart: '2026-06-01', year: 2026, completed: false })
  const next = deleteVitalFew(s2, s2.vitalFew[0].id)
  assert.equal(next.vitalFew.length, 1)
  assert.equal(next.vitalFew[0].title, 'B')
})

// ─── Immutability ─────────────────────────────────────────────────────────────

test('none of the CRUD functions mutate the original store', () => {
  const store = emptyStore()
  const snap = JSON.stringify(store)

  createEvent(store, { date: '2026-01-01', title: 'X', category: 'general' })
  createGoal(store, { title: 'G', year: 2026, progress: 0, status: 'not-started', priority: 'low' })
  createTask(store, { title: 'T', year: 2026, period: 'day', priority: 'low', completed: false })
  createNote(store, { title: 'N', content: '', periodType: 'day', periodRef: '2026-01-01', year: 2026, pinned: false })

  assert.equal(JSON.stringify(store), snap)
})
