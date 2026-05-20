import test from 'node:test'
import assert from 'node:assert/strict'
import { createUnsubscribeHandler } from '../unsubscribe.ts'
import { createMockRequest, createMockResponse, setTestEnv } from './helpers.ts'

function setUnsubscribeEnv() {
  setTestEnv({
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  })
}

test('unsubscribe rejects missing auth headers', async () => {
  setUnsubscribeEnv()
  const handler = createUnsubscribeHandler()
  const req = createMockRequest({ method: 'POST', body: { endpoint: 'https://push.example/sub-1' } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 401)
  assert.deepEqual(state.body, { error: 'Missing Authorization header' })
})

test('unsubscribe deletes only the authenticated user subscription', async () => {
  setUnsubscribeEnv()
  const filters: Array<[string, string]> = []
  const handler = createUnsubscribeHandler({
    createSupabaseClient: (_url, key) => {
      if (key === 'anon-key') {
        return {
          auth: {
            async getUser() {
              return { data: { user: { id: 'user-123' } }, error: null }
            },
          },
          from() {
            throw new Error('Unexpected anon DB access')
          },
        }
      }

      return {
        from(table: string) {
          assert.equal(table, 'push_subscriptions')
          return {
            delete() {
              const chain = {
                eq(column: string, value: string) {
                  filters.push([column, value])
                  if (filters.length < 2) return chain
                  return Promise.resolve({ error: null })
                },
              }
              return chain
            },
          }
        },
      }
    },
  })
  const req = createMockRequest({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: { endpoint: 'https://push.example/sub-1' },
  })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 200)
  assert.deepEqual(filters, [
    ['endpoint', 'https://push.example/sub-1'],
    ['user_id', 'user-123'],
  ])
})