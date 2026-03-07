import { Chrome } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signInWithGoogle } = useAuth()

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

        {/* Google sign-in */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#fff', color: '#111' }}
        >
          <Chrome size={18} />
          Continue with Google
        </button>

        <p className="text-xs text-slate-600 text-center leading-relaxed">
          Each user's planner data is private and synced across devices.
        </p>
      </div>
    </div>
  )
}
