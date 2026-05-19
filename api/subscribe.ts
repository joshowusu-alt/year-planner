import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).end()

    const authHeader = req.headers['authorization']
    const accessToken = authHeader?.toString().replace(/^Bearer\s+/i, '')
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing Authorization header' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Missing Supabase env vars' })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { subscription } = req.body as { subscription: PushSubscriptionJSON }
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Missing subscription' })
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await serviceClient.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      subscription: subscription,
      user_id: user.id,
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
