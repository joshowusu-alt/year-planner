import { supabase } from './supabase'
import type { PlannerStore } from '../types'

export interface ShareRecord {
  token: string
  owner_user_id: string
  created_at: string
  label?: string
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
 * Returns null if token doesn't exist or is invalid.
 */
export async function fetchSharedPlannerData(
  token: string,
): Promise<PlannerStore | null> {
  if (!supabase) return null
  try {
    // 1. Resolve token → owner_user_id
    const { data: shareRow, error: shareErr } = await supabase
      .from('planner_shares')
      .select('owner_user_id, label')
      .eq('token', token)
      .single()
    if (shareErr || !shareRow) {
      console.error('fetchSharedPlannerData – token lookup failed:', shareErr?.message)
      return null
    }

    const ownerId = shareRow.owner_user_id as string

    // 2. Fetch planner data for that owner
    const { data: planRow, error: planErr } = await supabase
      .from('planner_data')
      .select('store')
      .eq('user_id', ownerId)
      .single()
    if (planErr || !planRow?.store) {
      console.error('fetchSharedPlannerData – planner data not found:', planErr?.message)
      return null
    }

    return planRow.store as PlannerStore
  } catch (err) {
    console.error('fetchSharedPlannerData exception:', err)
    return null
  }
}
