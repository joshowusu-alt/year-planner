import type { VercelRequest, VercelResponse } from '@vercel/node'

export function setTestEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }
    process.env[key] = value
  }
}

export function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'GET',
    headers: {},
    query: {},
    body: undefined,
    ...overrides,
  } as VercelRequest
}

export function createMockResponse() {
  const state: {
    statusCode: number
    body: unknown
    headers: Record<string, string>
    ended: boolean
  } = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
  }

  const response = {
    status(code: number) {
      state.statusCode = code
      return this
    },
    json(payload: unknown) {
      state.body = payload
      return this
    },
    end() {
      state.ended = true
      return this
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value
      return this
    },
  } as unknown as VercelResponse

  return { response, state }
}