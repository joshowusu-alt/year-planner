import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Will be null/undefined if env vars aren't set — app falls back to localStorage
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'implicit',      // tokens returned in URL hash — no PKCE code exchange needed
          detectSessionInUrl: true,  // auto-reads #access_token= on page load
          persistSession: true,
        },
      })
    : null

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// ─── Storage helpers ──────────────────────────────────────────────────────────

const LOGO_BUCKET = 'logos'

/**
 * Uploads a logo file to Supabase Storage under `logos/<userId>/<filename>`
 * and returns the public URL. Falls back to null on error.
 */
export async function uploadLogoToStorage(
  userId: string,
  file: File
): Promise<string | null> {
  if (!supabase) return null
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${userId}/logo.${ext}`
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) {
    console.error('Logo upload failed:', error.message)
    return null
  }
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
