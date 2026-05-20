import test from 'node:test'
import assert from 'node:assert/strict'
import { createSharedPlannerHandler } from '../shared-planner.ts'
import { createMockRequest, createMockResponse, setTestEnv } from './helpers.ts'

function setSharedPlannerEnv() {
  setTestEnv({
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  })
}

test('shared-planner requires a token', async () => {
  setSharedPlannerEnv()
  const handler = createSharedPlannerHandler()
  const req = createMockRequest({ method: 'GET', query: {} })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 400)
  assert.deepEqual(state.body, { error: 'Missing token' })
})

test('shared-planner returns 410 for expired tokens', async () => {
  setSharedPlannerEnv()
  const oldDate = new Date()
  oldDate.setDate(oldDate.getDate() - 91)
  const handler = createSharedPlannerHandler({
    createSupabaseClient: () => ({
      from(table: string) {
        assert.equal(table, 'planner_shares')
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return {
                      data: { owner_user_id: 'user-1', created_at: oldDate.toISOString() },
                      error: null,
                    }
                  },
                }
              },
            }
          },
        }
      },
    }),
  })
  const req = createMockRequest({ method: 'GET', query: { token: 'expired-token' } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 410)
  assert.deepEqual(state.body, { error: 'Share link has expired' })
})

test('shared-planner returns only public planner fields', async () => {
  setSharedPlannerEnv()
  const handler = createSharedPlannerHandler({
    createSupabaseClient: () => ({
      from(table: string) {
        if (table === 'planner_shares') {
          return {
            select() {
              return {
                eq() {
                  return {
                    async single() {
                      return {
                        data: { owner_user_id: 'user-1', created_at: new Date().toISOString() },
                        error: null,
                      }
                    },
                  }
                },
              }
            },
          }
        }

        assert.equal(table, 'planner_data')
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return {
                      data: {
                        store: {
                          schemaVersion: 1,
                          events: [{ id: 'event-1', title: 'Town Hall' }],
                          monthMeta: [{ year: 2026, month: 5, theme: 'Focus' }],
                          categories: [{ id: 'meeting', label: 'Meetings', color: '#fff', bgColor: '#000' }],
                          organizationName: 'STRATUM',
                          plannerTitle: 'Executive Planning System',
                          accentColor: '#d4af37',
                          tasks: [{ id: 'task-1' }],
                          notes: [{ id: 'note-1' }],
                          goals: [{ id: 'goal-1' }],
                          vitalFew: [{ id: 'vf-1' }],
                          weeklyReviews: [{ id: 'wr-1' }],
                        },
                      },
                      error: null,
                    }
                  },
                }
              },
            }
          },
        }
      },
    }),
  })
  const req = createMockRequest({ method: 'GET', query: { token: 'valid-token' } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 200)
  assert.deepEqual(state.body, {
    schemaVersion: 1,
    events: [{ id: 'event-1', title: 'Town Hall' }],
    monthMeta: [{ year: 2026, month: 5, theme: 'Focus' }],
    categories: [{ id: 'meeting', label: 'Meetings', color: '#fff', bgColor: '#000' }],
    organizationName: 'STRATUM',
    plannerTitle: 'Executive Planning System',
    accentColor: '#d4af37',
  })
  assert.equal(state.headers['Cache-Control'], 's-maxage=300, stale-while-revalidate=600')
  assert.equal('tasks' in (state.body as Record<string, unknown>), false)
  assert.equal('notes' in (state.body as Record<string, unknown>), false)
  assert.equal('goals' in (state.body as Record<string, unknown>), false)
  assert.equal('vitalFew' in (state.body as Record<string, unknown>), false)
  assert.equal('weeklyReviews' in (state.body as Record<string, unknown>), false)
})