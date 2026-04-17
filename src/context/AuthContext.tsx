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

// ─── Guest user for localStorage-only mode ────────────────────────────────────

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

    // onAuthStateChange handles all session events:
    //   INITIAL_SESSION — fired once on load (with session from storage or URL token)
    //   SIGNED_IN       — after OAuth redirect is processed
    //   SIGNED_OUT      — after sign-out
    // detectSessionInUrl: true (set on the client) reads #access_token= from the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      setLoading(false)
    })

    // Always call getSession() as a reliable fallback. onAuthStateChange fires
    // INITIAL_SESSION too, but getSession() ensures loading is cleared even if the
    // event fires before the subscription was set up.
    supabase.auth.getSession().then(({ data }) => {
      // Only apply if onAuthStateChange hasn't already resolved the session
      setSupabaseUser(prev => prev ?? (data.session?.user ?? null))
      setLoading(false)
    })

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
