/**
 * ModalSheet — shared keyboard-safe bottom-sheet (mobile) / centred modal (desktop).
 *
 * Pattern:
 *  - Items end on mobile (slides up), centred on sm+
 *  - Scrollable body so content never hides behind keyboard
 *  - Sticky footer with safe-area bottom padding
 *  - Backdrop click closes; Escape closes; aria attributes included
 */
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalSheetProps {
  /** Modal heading displayed in the header bar */
  title: ReactNode
  /** Called when user closes the modal (backdrop, Escape, or close button) */
  onClose: () => void
  /** Content rendered in the sticky footer */
  footer: ReactNode
  /** Form body content (will be scrollable) */
  children: ReactNode
  /** Tailwind sm: max-width class, e.g. "sm:max-w-sm" or "sm:max-w-lg" */
  maxWidth?: string
  /** aria-label override; defaults to title if title is a string */
  ariaLabel?: string
  /** Extra element(s) rendered alongside the close button in the header */
  headerActions?: ReactNode
}

export function ModalSheet({
  title,
  onClose,
  footer,
  children,
  maxWidth = 'sm:max-w-sm',
  ariaLabel,
  headerActions,
}: ModalSheetProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4`}
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className={`w-full ${maxWidth} rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col`}
        style={{
          background: '#111827',
          border: '1px solid #1e2d40',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 16px)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid #1e2d40' }}
        >
          <h2 className="font-bold text-base" style={{ color: '#d4af37' }}>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {children}
        </div>

        {/* ── Sticky footer ── */}
        <div
          className="shrink-0"
          style={{
            borderTop: '1px solid #1e2d40',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}
