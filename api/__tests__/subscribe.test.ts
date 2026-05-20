import test from 'node:test'
import assert from 'node:assert/strict'
import { createSubscribeHandler } from '../subscribe.ts'
import { createMockRequest, createMockResponse, setTestEnv } from './helpers.ts'

function setSubscribeEnv() {
  setTestEnv({
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  })
}

test('subscribe rejects requests without auth headers', async () => {
  setSubscribeEnv()
  const handler = createSubscribeHandler()
  const req = createMockRequest({ method: 'POST', body: { subscription: { endpoint: 'https://push.example/sub-1' } } })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 401)
  assert.deepEqual(state.body, { error: 'Missing Authorization header' })
})

test('subscribe rejects invalid tokens', async () => {
  setSubscribeEnv()
  const handler = createSubscribeHandler({
    createSupabaseClient: (_url, key) => {
      if (key === 'anon-key') {
        return {
          auth: {
            async getUser() {
              return { data: { user: null }, error: { message: 'bad token' } }
            },
          },
          from() {
            throw new Error('Unexpected DB access')
          },
        }
      }
      throw new Error('Unexpected service client')
    },
  })
  const req = createMockRequest({
    method: 'POST',
    headers: { authorization: 'Bearer invalid-token' },
    body: { subscription: { endpoint: 'https://push.example/sub-1' } },
  })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 401)
  assert.deepEqual(state.body, { error: 'Invalid or expired token' })
})

test('subscribe writes subscriptions using the verified user id', async () => {
  setSubscribeEnv()
  const upserts: Array<{ row: Record<string, unknown>; options: Record<string, unknown> | undefined }> = []
  const handler = createSubscribeHandler({
    createSupabaseClient: (_url, key, options) => {
      if (key === 'anon-key') {
        assert.equal((options?.global as { headers?: { Authorization?: string } })?.headers?.Authorization, 'Bearer valid-token')
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

      assert.equal(key, 'service-key')
      return {
        from(table: string) {
          assert.equal(table, 'push_subscriptions')
          return {
            async upsert(row: Record<string, unknown>, upsertOptions?: Record<string, unknown>) {
              upserts.push({ row, options: upsertOptions })
              return { error: null }
            },
          }
        },
      }
    },
  })
  const req = createMockRequest({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: {
      subscription: { endpoint: 'https://push.example/sub-1' },
      userId: 'forged-user',
    },
  })
  const { response, state } = createMockResponse()

  await handler(req, response)

  assert.equal(state.statusCode, 200)
  assert.equal(upserts.length, 1)
  assert.equal(upserts[0].row.user_id, 'user-123')
  assert.equal(upserts[0].row.endpoint, 'https://push.example/sub-1')
  assert.deepEqual(upserts[0].options, { onConflict: 'endpoint' })
})