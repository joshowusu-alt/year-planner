import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, loadCreateSupabaseClient, type ServerSupabaseClientFactory } from './runtime'

type UnsubscribeDeps = {
  createSupabaseClient: ServerSupabaseClientFactory
}

export function createUnsubscribeHandler(overrides: Partial<UnsubscribeDeps> = {}) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    try {
      if (req.method !== 'POST') return res.status(405).end()

      const accessToken = getBearerToken(req.headers['authorization'])
      if (!accessToken) {
        return res.status(401).json({ error: 'Missing Authorization header' })
      }

      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Missing Supabase env vars' })
      }

      const createSupabaseClient = overrides.createSupabaseClient ?? await loadCreateSupabaseClient()
      const userClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      }) as {
        auth: {
          getUser: () => Promise<{
            data: { user: { id: string } | null }
            error: { message: string } | null
          }>
        }
      }
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }

      const { endpoint } = req.body as { endpoint: string }
      if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' })

      const serviceClient = createSupabaseClient(supabaseUrl, supabaseServiceKey)
      const subscriptionsTable = serviceClient.from('push_subscriptions') as {
        delete: () => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
          }
        }
      }
      const { error } = await subscriptionsTable
        .delete()
        .eq('endpoint', endpoint)
        .eq('user_id', user.id)

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('unsubscribe handler crash:', msg)
      return res.status(500).json({ error: msg })
    }
  }
}

const handler = createUnsubscribeHandler()

export default handler
