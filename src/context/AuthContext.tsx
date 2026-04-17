import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthContextValue {
  user: UserProfile | null
  supabaseUser: User | null
  loading: boolean
  signInWithGoogle: () => Promise<string | null>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Guest user for localStorage-only mode ──────────────────────────────────────────────

const GUEST_USER: UserProfile = {
  id: 'local-guest',
  email: 'local@device',
  fullName: 'Local User',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // onAuthStateChange fires automatically when:
    //   - a new session starts (including after OAuth redirect with #access_token in hash)
    //   - an existing session is restored from storage
    //   - the user signs out
    // detectSessionInUrl: true (set on the client) handles the hash token automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      setLoading(false)
    })

    // Fallback: if there is no hash token on this load, resolve the existing session
    // immediately so loading isn't stuck. onAuthStateChange will also fire for existing
    // sessions, but getSession() ensures we don't wait unnecessarily.
    if (!window.location.hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data }) => {
        setSupabaseUser(data.session?.user ?? null)
        setLoading(false)
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle(): Promise<string | null> {
    if (!supabase) return 'Authentication is not configured.'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })
    return error ? error.message : null
  }

  function signInAsGuest() {
    setGuestMode(true)
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSupabaseUser(null)
    setGuestMode(false)
  }

  const user: UserProfile | null = isSupabaseConfigured
    ? supabaseUser
      ? {
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
          fullName: supabaseUser.user_metadata?.full_name,
          avatarUrl: supabaseUser.user_metadata?.avatar_url,
        }
      : guestMode ? GUEST_USER : null
    : GUEST_USER  // No Supabase → always "logged in" as local guest

  return (
    <AuthContext.Provider
      value={{ user, supabaseUser, loading, signInWithGoogle, signInAsGuest, signOut, isConfigured: isSupabaseConfigured }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
