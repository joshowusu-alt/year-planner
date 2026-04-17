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

    // Subscribe BEFORE resolving the session so we never miss a SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      setLoading(false)
    })

    // Handle PKCE code-exchange: after Google OAuth, Supabase v2 redirects back with
    // ?code=xxx. We must call exchangeCodeForSession() explicitly — getSession() alone
    // won’t complete the exchange in time before loading is cleared.
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      // Capture the full search string before cleaning the URL
      const originalSearch = window.location.search
      // Clean the code from the URL immediately so a refresh doesn’t re-attempt it
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      supabase.auth.exchangeCodeForSession(originalSearch).catch(() => {
        // Exchange failed — fall through to a regular session check
        supabase!.auth.getSession().then(({ data }) => {
          setSupabaseUser(data.session?.user ?? null)
          setLoading(false)
        })
      })
      // On success, onAuthStateChange fires SIGNED_IN → setLoading(false)
    } else {
      // Normal load — check for an existing session
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
