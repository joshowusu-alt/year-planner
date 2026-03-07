import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    return { hasError: true, message }
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#0a0e1a' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
          style={{ background: '#0d1224', border: '1px solid #1e2d40' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: '#1e2d40' }}
          >
            <AlertTriangle size={28} style={{ color: '#d4af37' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Something went wrong</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The app encountered an unexpected error. Your data is safe — reload
              to continue.
            </p>
            {import.meta.env.DEV && this.state.message && (
              <p className="mt-3 text-xs text-red-400 font-mono text-left break-all">
                {this.state.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReload}
            className="px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: '#d4af37', color: '#111827' }}
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }
}
