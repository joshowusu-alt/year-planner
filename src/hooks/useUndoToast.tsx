import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  createContext,
  useMemo,
  memo,
} from 'react'
import { useBreakpoint } from './useMediaQuery'

// ─── Public types ──────────────────────────────────────────────────────────────

export interface UndoAction {
  label: string
  undo: () => void
}

// ─── Internal context (for stable ToastView component) ────────────────────────

interface ToastState {
  pending: UndoAction | null
  visible: boolean
  onUndo: () => void
}

const ToastInternalCtx = createContext<ToastState>({
  pending: null,
  visible: false,
  onUndo: () => {},
})

// ─── Stable toast view — defined outside hook so identity never changes ────────

const ToastView = memo(function ToastView() {
  const { pending, visible, onUndo } = useContext(ToastInternalCtx)
  const { isMobile } = useBreakpoint()

  return (
    <>
      <style>{`@keyframes undoProgress { from { width: 100% } to { width: 0% } }`}</style>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: 'flex',
          justifyContent: 'center',
          transform: visible ? 'translateY(0)' : 'translateY(120%)',
          transition: 'transform 280ms cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            background: '#1e2d40',
            border: '1px solid #243447',
            borderRadius: isMobile ? '12px 12px 0 0' : 12,
            padding: '12px 16px',
            paddingBottom: isMobile
              ? 'calc(12px + env(safe-area-inset-bottom, 0px))'
              : 12,
            marginBottom: isMobile ? 0 : '1.5rem',
            width: isMobile ? '100%' : 360,
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: '#e2e8f0', flex: 1 }}>
            {pending?.label}
          </span>
          <button
            onClick={onUndo}
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#d4af37',
              border: '1px solid #d4af37',
              borderRadius: 8,
              padding: '0.25rem 0.75rem',
              minWidth: 60,
              minHeight: 36,
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Undo
          </button>
          {visible && (
            <div
              key={pending?.label}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 3,
                background: '#d4af37',
                animation: 'undoProgress 5s linear forwards',
              }}
            />
          )}
        </div>
      </div>
    </>
  )
})

// ─── Hook ──────────────────────────────────────────────────────────────────────

interface UseUndoToast {
  pushUndo: (action: UndoAction) => void
  /** Render this once in the app shell: {toastNode} */
  toastNode: React.ReactNode
}

export function useUndoToast(): UseUndoToast {
  const [pending, setPending] = useState<UndoAction | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onUndo = useCallback(() => {
    setPending((p) => {
      p?.undo()
      return p
    })
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  const pushUndo = useCallback((action: UndoAction) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPending(action)
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
    }, 5000)
  }, [])

  const ctxValue = useMemo<ToastState>(
    () => ({ pending, visible, onUndo }),
    [pending, visible, onUndo],
  )

  const toastNode = (
    <ToastInternalCtx.Provider value={ctxValue}>
      <ToastView />
    </ToastInternalCtx.Provider>
  )

  return { pushUndo, toastNode }
}
