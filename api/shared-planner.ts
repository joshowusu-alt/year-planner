import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SHARE_LINK_TTL_DAYS = 90

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Resolve token → owner
  const { data: shareRow, error: shareErr } = await supabase
    .from('planner_shares')
    .select('owner_user_id, created_at')
    .eq('token', token)
    .single()

  if (shareErr || !shareRow) {
    return res.status(404).json({ error: 'Share token not found' })
  }

  // 2. Check expiry
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - SHARE_LINK_TTL_DAYS)
  if (new Date(shareRow.created_at) < cutoff) {
    return res.status(410).json({ error: 'Share link has expired' })
  }

  // 3. Fetch planner data via service role (never exposed to public client)
  const { data: planRow, error: planErr } = await supabase
    .from('planner_data')
    .select('store')
    .eq('user_id', shareRow.owner_user_id)
    .single()

  if (planErr || !planRow?.store) {
    return res.status(404).json({ error: 'Planner data not found' })
  }

  // 4. Return sanitized read-only subset (goals/tasks/notes are private)
  const store = planRow.store as Record<string, unknown>
  const sanitized = {
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
