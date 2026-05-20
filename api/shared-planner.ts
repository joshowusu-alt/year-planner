import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadCreateSupabaseClient, type ServerSupabaseClientFactory } from './runtime'

const SHARE_LINK_TTL_DAYS = 90

type SharedPlannerDeps = {
  createSupabaseClient: ServerSupabaseClientFactory
}

export function createSharedPlannerHandler(overrides: Partial<SharedPlannerDeps> = {}) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).end()

    const token = req.query['token']
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Missing token' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase env vars' })
    }

    const createSupabaseClient = overrides.createSupabaseClient ?? await loadCreateSupabaseClient()
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    const sharesTable = supabase.from('planner_shares') as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{
            data: { owner_user_id: string; created_at: string } | null
            error: { message: string } | null
          }>
        }
      }
    }
    const { data: shareRow, error: shareErr } = await sharesTable
      .select('owner_user_id, created_at')
      .eq('token', token)
      .single()

    if (shareErr || !shareRow) {
      return res.status(404).json({ error: 'Share token not found' })
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - SHARE_LINK_TTL_DAYS)
    if (new Date(shareRow.created_at) < cutoff) {
      return res.status(410).json({ error: 'Share link has expired' })
    }

    const plannerDataTable = supabase.from('planner_data') as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{
            data: { store: Record<string, unknown> } | null
            error: { message: string } | null
          }>
        }
      }
    }
    const { data: planRow, error: planErr } = await plannerDataTable
      .select('store')
      .eq('user_id', shareRow.owner_user_id)
      .single()

    if (planErr || !planRow?.store) {
      return res.status(404).json({ error: 'Planner data not found' })
    }

    const store = planRow.store as Record<string, unknown>
    const sanitized = {
      schemaVersion: typeof store.schemaVersion === 'number' ? store.schemaVersion : 1,
      events: store.events ?? [],
      monthMeta: store.monthMeta ?? [],
      categories: store.categories ?? [],
      organizationName: store.organizationName ?? '',
      plannerTitle: store.plannerTitle ?? '',
      accentColor: store.accentColor ?? '#d4af37',
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(sanitized)
  }
}

const handler = createSharedPlannerHandler()

export default handler
