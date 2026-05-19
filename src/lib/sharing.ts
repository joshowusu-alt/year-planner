import { supabase } from './supabase'
import type { PlannerStore } from '../types'

export interface ShareRecord {
  token: string
  owner_user_id: string
  created_at: string
  label?: string
}

export const SHARE_LINK_TTL_DAYS = 90

function getShareExpiryCutoff(): string {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - SHARE_LINK_TTL_DAYS)
  return cutoff.toISOString()
}

/**
 * Creates a new share token for the given userId.
 * Inserts into `planner_shares` table.
 * Returns the token string, or null on error.
 */
export async function createShareToken(
  userId: string,
  label?: string,
): Promise<string | null> {
  if (!supabase) return null
  try {
    const token = crypto.randomUUID()
    const { error } = await supabase.from('planner_shares').insert({
      token,
      owner_user_id: userId,
      label: label ?? null,
    })
    if (error) {
      console.error('createShareToken error:', error.message)
      return null
    }
    return token
  } catch (err) {
    console.error('createShareToken exception:', err)
    return null
  }
}

/**
 * Revokes (deletes) a share token.
 * Returns true on success, false on error.
 */
export async function revokeShareToken(
  token: string,
  userId: string,
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('planner_shares')
      .delete()
      .eq('token', token)
      .eq('owner_user_id', userId)
    if (error) {
      console.error('revokeShareToken error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('revokeShareToken exception:', err)
    return false
  }
}

/**
 * Returns all share tokens created by the given userId.
 */
export async function getShareTokens(userId: string): Promise<ShareRecord[]> {
  if (!supabase) return []
  try {
    await supabase
      .from('planner_shares')
      .delete()
      .eq('owner_user_id', userId)
      .lt('created_at', getShareExpiryCutoff())

    const { data, error } = await supabase
      .from('planner_shares')
      .select('token, owner_user_id, created_at, label')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getShareTokens error:', error.message)
      return []
    }
    return (data ?? []) as ShareRecord[]
  } catch (err) {
    console.error('getShareTokens exception:', err)
    return []
  }
}

/**
 * Fetches the planner data for the owner of the given share token.
 * Calls the /api/shared-planner serverless function (service-role) instead
 * of querying planner_data directly — the anon client would be blocked by RLS.
 * Returns null if token doesn't exist, is expired, or the request fails.
 */
export async function fetchSharedPlannerData(
  token: string,
): Promise<PlannerStore | null> {
  try {
    const res = await fetch(`/api/shared-planner?token=${encodeURIComponent(token)}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Network error' }))
      console.error('fetchSharedPlannerData – API error:', res.status, body.error)
      return null
    }
    return await res.json() as PlannerStore
  } catch (err) {
    console.error('fetchSharedPlannerData exception:', err)
    return null
  }
}

/**
 * Checks whether the planner_shares table exists.
 * Returns 'exists' | 'missing' | 'unknown'
 */
export async function checkSharesTableExists(): Promise<'exists' | 'missing' | 'unknown'> {
  if (!supabase) return 'unknown'
  try {
    const { error } = await supabase.from('planner_shares').select('token').limit(1)
    if (!error) return 'exists'
    if (error.code === '42P01') return 'missing'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

