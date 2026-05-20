export type ServerSupabaseClientFactory = (
  url: string,
  key: string,
  options?: Record<string, unknown>,
) => {
  auth?: {
    getUser: () => Promise<{
      data: { user: { id: string } | null }
      error: { message: string } | null
    }>
  }
  from: (table: string) => unknown
}

export function getBearerToken(authHeader: string | string[] | undefined): string | undefined {
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const token = value?.toString().replace(/^Bearer\s+/i, '')
  return token || undefined
}

export async function loadCreateSupabaseClient(): Promise<ServerSupabaseClientFactory> {
  const module = await import('@supabase/supabase-js')
  return module.createClient as ServerSupabaseClientFactory
}