import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Zap,
  Calendar,
  Clock,
  RefreshCw,
  Tag,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit3,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { format } from 'date-fns'
import type { EventCategoryDef } from '../types'
import { RECURRENCE_LABELS } from '../types'
import { usePlanner } from '../context/PlannerContext'
import { useBreakpoint } from '../hooks/useMediaQuery'
import { EventModal } from './planner/EventModal'
import { parseNaturalLanguage, type ParsedEvent } from '../lib/naturalLanguage'

// ─── Confidence colours ───────────────────────────────────────────────────────

function confidenceBorder(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return '#34d399'
  if (c === 'medium') return '#d4af37'
  return '#f87171'
}

function ConfidenceIcon({ c }: { c: 'high' | 'medium' | 'low' }) {
  if (c === 'high') return <CheckCircle2 size={14} color="#34d399" />
  if (c === 'medium') return <AlertCircle size={14} color="#d4af37" />
  return <XCircle size={14} color="#f87171" />
}

// ─── Parsed Preview Card ──────────────────────────────────────────────────────

function PreviewCard({
  parsed,
  categories,
  inputLen,
}: {
  parsed: ParsedEvent
  categories: EventCategoryDef[]
  inputLen: number
}) {
  const cat = categories.find((c) => c.id === parsed.category)
  const border = confidenceBorder(parsed.confidence)

  return (
    <div
      style={{
        background: '#0a0e1a',
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Confidence row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ConfidenceIcon c={parsed.confidence} />
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {parsed.confidence === 'high' ? 'Parsed successfully' : parsed.confidence === 'medium' ? 'Partial match' : 'Low confidence'}
        </span>
      </div>

      {/* Low-confidence hint */}
      {parsed.confidence === 'low' && inputLen > 3 && (
        <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
          Could not parse a clear date or title. Try: &quot;Team meeting tomorrow at 3pm&quot;
        </span>
      )}

      {/* Title */}
      <Row icon={<Tag size={13} color="#94a3b8" />} label="Title">
        <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{parsed.title}</span>
      </Row>

      {/* Date */}
      <Row icon={<Calendar size={13} color="#94a3b8" />} label="Date">
        <span style={{ color: '#e2e8f0', fontSize: 14 }}>
          {format(new Date(parsed.date + 'T00:00:00'), 'EEE, MMM d yyyy')}
        </span>
      </Row>
      {!parsed._dateFound && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 22 }}>
          <AlertTriangle size={10} color="#f59e0b" />
          <span style={{ fontSize: 11, color: '#f59e0b' }}>No date detected — defaulting to today</span>
        </div>
      )}
      {parsed._dateAmbiguous && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 22 }}>
          <Info size={10} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Ambiguous date — interpreted as {format(new Date(parsed.date + 'T00:00:00'), 'EEE, MMM d yyyy')}
          </span>
        </div>
      )}

      {/* Time */}
      {parsed.startTime && (
        <Row icon={<Clock size={13} color="#94a3b8" />} label="Time">
          <span style={{ color: '#e2e8f0', fontSize: 14 }}>
            {parsed.startTime}
            {parsed.endTime && <> → {parsed.endTime}</>}
          </span>
        </Row>
      )}

      {/* Recurrence */}
      {parsed.recurrence && parsed.recurrence.type !== 'none' && (
        <Row icon={<RefreshCw size={13} color="#94a3b8" />} label="Repeat">
          <span style={{ color: '#e2e8f0', fontSize: 14 }}>
            {RECURRENCE_LABELS[parsed.recurrence.type]}
          </span>
        </Row>
      )}

      {/* Category */}
      <Row
        icon={
          <span
            style={{
              width: 10, height: 10, borderRadius: 3,
              background: cat?.color ?? '#94a3b8',
              display: 'inline-block', flexShrink: 0,
            }}
          />
        }
        label="Category"
      >
        <span style={{ color: cat?.color ?? '#94a3b8', fontSize: 14 }}>{cat?.label ?? parsed.category}</span>
      </Row>
    </div>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', width: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#94a3b8', width: 56, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{children}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function NaturalLanguageInput({ onClose }: Props) {
  const { store, addEvent } = usePlanner()
  const { categories } = store
  const { isMobile } = useBreakpoint()

  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedEvent | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Autofocus
  useEffect(() => {
    if (!showEditModal) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showEditModal])

  // Parse on input change
  useEffect(() => {
    if (input.trim().length >= 3) {
      setParsed(parseNaturalLanguage(input, new Date(), categories))
    } else {
      setParsed(null)
    }
  }, [input, categories])

  const handleClose = useCallback(() => {
    setMounted(false)
    setTimeout(onClose, 300)
  }, [onClose])

  const handleCreate = useCallback(() => {
    if (!parsed) return
    addEvent(
      parsed.date,
      parsed.title,
      parsed.category,
      undefined,
      parsed.recurrence?.type !== 'none' ? parsed.recurrence : undefined,
      parsed.startTime,
      parsed.endTime,
      parsed.startTime ? undefined : null,
    )
    handleClose()
  }, [parsed, addEvent, handleClose])

  // Keyboard handler for the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!parsed) return
      if (parsed.confidence === 'high' || parsed.confidence === 'medium') {
        handleCreate()
      } else {
        setShowEditModal(true)
      }
      return
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      setShowEditModal(true)
    }
  }

  // Focus trap
  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const focusableEls = containerRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusableEls || focusableEls.length === 0) return
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

  // ── Overlay click to close ────────────────────────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose()
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#0d1224',
        border: '1px solid #1e2d40',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        padding: '20px 16px 32px',
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 300ms ease',
        zIndex: 51,
        maxHeight: '90vh',
        overflowY: 'auto',
      }
    : {
        position: 'relative',
        background: '#0d1224',
        border: '1px solid #1e2d40',
        borderRadius: 16,
        padding: '20px 20px 20px',
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        marginTop: 80,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(-16px)',
        transition: 'opacity 250ms ease, transform 250ms ease',
        zIndex: 51,
      }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.7)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick add event"
        style={cardStyle}
        onKeyDown={handleContainerKeyDown}
      >
        {/* Handle bar on mobile */}
        {isMobile && (
          <div
            style={{
              width: 36, height: 4, borderRadius: 2,
              background: '#1e2d40',
              margin: '0 auto 16px',
            }}
          />
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#d4af37" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.03em' }}>
              Quick Add
            </span>
            <span
              style={{
                fontSize: 10, color: '#94a3b8', background: '#0a0e1a',
                border: '1px solid #1e2d40', borderRadius: 4,
                padding: '2px 6px', fontFamily: 'monospace',
              }}
            >
              /
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Try: "Team meeting tomorrow at 3pm for 1h"'
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            background: '#0a0e1a',
            border: '1px solid #1e2d40',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 15,
            fontWeight: 500,
            color: '#e2e8f0',
            outline: 'none',
            caretColor: '#d4af37',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#d4af37'
            e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#1e2d40'
            e.target.style.boxShadow = 'none'
          }}
        />

        {/* Hint chips */}
        {input.length < 3 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {['tomorrow at 9am', 'next Monday', 'every week', 'in 3 days', 'Jan 15 at 2pm for 1h'].map((chip) => (
              <button
                key={chip}
                tabIndex={-1}
                onClick={() => setInput(chip)}
                style={{
                  background: '#0a0e1a', border: '1px solid #1e2d40',
                  borderRadius: 20, padding: '4px 10px',
                  fontSize: 11, color: '#94a3b8', cursor: 'pointer',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#d4af37')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2d40')}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        {parsed && input.trim().length >= 3 && (
          <div style={{ marginTop: 12 }}>
            <PreviewCard
              parsed={parsed}
              categories={categories}
              inputLen={input.trim().length}
            />
          </div>
        )}

        {/* Actions */}
        {parsed && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleCreate}
              style={{
                flex: 1,
                background: '#d4af37',
                color: '#111827',
                border: 'none',
                borderRadius: 10,
                padding: '11px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Create Event
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid #1e2d40',
                borderRadius: 10,
                padding: '11px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'border-color 150ms, color 150ms',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d4af37'
                e.currentTarget.style.color = '#d4af37'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e2d40'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              <Edit3 size={13} />
              Edit
            </button>
          </div>
        )}

        {/* Keyboard hints */}
        {!isMobile && (
          <div style={{ marginTop: 12, display: 'flex', gap: 14 }}>
            {[['↵', 'Create'], ['⇧↵', 'Edit in modal'], ['Esc', 'Close']].map(([key, label]) => (
              <span key={key} style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd
                  style={{
                    background: '#0a0e1a', border: '1px solid #1e2d40',
                    borderRadius: 4, padding: '1px 5px',
                    fontFamily: 'monospace', fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal overlay */}
      {showEditModal && parsed && (
        <EventModal
          defaultDate={parsed.date}
          defaultStartTime={parsed.startTime}
          onSave={(data) => {
            addEvent(data.date, data.title, data.category, data.notes, data.recurrence, data.startTime, data.endTime, data.reminder)
            setShowEditModal(false)
            handleClose()
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  )
}
