import { useState } from 'react'
import { Chrome, Loader2, AlertCircle, UserCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signInWithGoogle, signInAsGuest } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    const err = await signInWithGoogle()
    // If we get here without a redirect, something went wrong
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#0a0e1a' }}
    >
      {/* Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: '#d4af37' }}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6"
        style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
      >
        {/* Logo / title */}
        <div className="text-center space-y-1">
          <div
            className="text-3xl font-black tracking-widest uppercase"
            style={{ color: '#d4af37' }}
          >
            STRATUM
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Executive Planning System
          </p>
          <p className="text-xs text-slate-500 italic pt-1">
            Plan your year in layers: vision → strategy → execution.
          </p>
        </div>

        <div
          className="w-12 h-0.5 rounded-full"
          style={{ background: '#d4af37' }}
        />

        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold text-white">Welcome back</h1>
          <p className="text-sm text-slate-400">
            Sign in to access your planning system
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="w-full flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#1f0a0a', border: '1px solid #7f1d1d', color: '#fca5a5' }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#fff', color: '#111' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Chrome size={18} />}
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: '#1e2d40' }} />
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 h-px" style={{ background: '#1e2d40' }} />
        </div>

        {/* Guest mode */}
        <button
          onClick={signInAsGuest}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/5 active:scale-95"
          style={{ color: '#94a3b8', border: '1px solid #1e2d40' }}
        >
          <UserCircle2 size={18} />
          Continue as Guest
        </button>

        <p className="text-xs text-slate-600 text-center leading-relaxed">
          Guest mode stores data locally on this device only.
        </p>
      </div>
    </div>
  )
}
