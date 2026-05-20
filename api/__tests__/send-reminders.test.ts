import test from 'node:test'
import assert from 'node:assert/strict'
import { createSendRemindersHandler } from '../send-reminders.ts'
import { createMockRequest, createMockResponse } from './helpers.ts'

function createSupabaseStub() {
  const calls: string[] = []
  const deletedEndpoints: string[] = []

  const client = {
    from(table: string) {
      calls.push(table)
      if (table === 'planner_data') {
        return {
          async select() {
            return {
              data: [
                {
                  user_id: 'user-1',
                  store: {
                    events: [
                      {
                        id: 'event-1',
                        title: 'Standup',
                        date: '2026-05-20',
                        startTime: '10:00',
                        reminder: 15,
                        recurrence: { type: 'none' },
                      },
                    ],
                  },
                },
              ],
              error: null,
            }
          },
          delete() {
            return {
              async eq(column: string, value: string) {
                if (column === 'endpoint') {
                  deletedEndpoints.push(value)
                }
                return { error: null }
              },
            }
          },
        }
      }

      if (table === 'push_subscriptions') {
        return {
          async select() {
            return {
              data: [
                {
                  user_id: 'user-1',
                  endpoint: 'https://push.example/sub-1',
                  subscription: { endpoint: 'https://push.example/sub-1' },
                },
              ],
              error: null,
            }
          },
          delete() {
            return {
              async eq(column: string, value: string) {
                if (column === 'endpoint') {
                  deletedEndpoints.push(value)
                }
                return { error: null }
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }

  return { client, calls, deletedEndpoints }
}

function setReminderEnv() {
  process.env.CRON_SECRET = 'cron-secret'
  process.env.SUPABASE_URL = 'https://supabase.example'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  process.env.VAPID_PUBLIC_KEY = 'public-key'
  process.env.VAPID_PRIVATE_KEY = 'private-key'
}

test('send-reminders returns 500 when CRON_SECRET is missing', async () => {
  delete process.env.CRON_SECRET
  const handler = createSendRemindersHandler()
  const req = createMockRequest({ method: 'GET' })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 500)
  assert.deepEqual(state.body, { error: 'Missing CRON_SECRET' })
})

test('send-reminders returns 401 when secret is invalid', async () => {
  setReminderEnv()
  const handler = createSendRemindersHandler()
  const req = createMockRequest({ method: 'GET', headers: { authorization: 'Bearer wrong' } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 401)
  assert.deepEqual(state.body, { error: 'Unauthorized' })
})

test('send-reminders reaches Supabase when secret is valid', async () => {
  setReminderEnv()
  const { client, calls } = createSupabaseStub()
  const sendCalls: string[] = []
  const handler = createSendRemindersHandler({
    createSupabaseClient: () => client,
    webpushClient: {
      setVapidDetails() {},
      async sendNotification(_subscription, payload) {
        sendCalls.push(payload)
      },
    },
    now: () => new Date('2026-05-20T09:45:00'),
    reminderLookbackMs: 5 * 60_000,
    reminderLookaheadMs: 30_000,
  })
  const req = createMockRequest({ method: 'GET', query: { secret: 'cron-secret' } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 200)
  assert.deepEqual(calls, ['planner_data', 'push_subscriptions'])
  assert.equal(sendCalls.length, 1)
})

test('send-reminders deletes expired subscriptions after 410 responses', async () => {
  setReminderEnv()
  const { client, deletedEndpoints } = createSupabaseStub()
  const handler = createSendRemindersHandler({
    createSupabaseClient: () => client,
    webpushClient: {
      setVapidDetails() {},
      async sendNotification() {
        throw { statusCode: 410 }
      },
    },
    now: () => new Date('2026-05-20T09:45:00'),
    reminderLookbackMs: 5 * 60_000,
    reminderLookaheadMs: 30_000,
  })
  const req = createMockRequest({ method: 'GET', query: { secret: 'cron-secret' } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 200)
  assert.deepEqual(deletedEndpoints, ['https://push.example/sub-1'])
})