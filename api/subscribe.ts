import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).end()
    const { subscription, userId } = req.body as { subscription: PushSubscriptionJSON; userId?: string }
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Missing subscription' })

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase env vars' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      subscription: subscription,
      user_id: userId ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('subscribe handler crash:', msg)
    return res.status(500).json({ error: msg })
  }
}
