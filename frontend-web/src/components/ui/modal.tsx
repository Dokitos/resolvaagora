'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Focus-trap + bloqueio de scroll para diálogos modais:
 * - ao abrir, guarda o elemento com foco anterior e move o foco para dentro do modal
 * - Tab/Shift+Tab ficam presos aos elementos focáveis do modal
 * - bloqueia o scroll do body enquanto aberto
 * - ao fechar/desmontar, devolve o foco ao elemento anterior e restaura o scroll
 */
function useModalA11y(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const container = containerRef.current

    const getFocusable = () =>
      container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []

    const focusable = getFocusable()
    if (focusable.length > 0) {
      focusable[0].focus()
    } else {
      container?.focus()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && container) {
        const items = getFocusable()
        if (items.length === 0) {
          e.preventDefault()
          container.focus()
          return
        }

        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement

        if (e.shiftKey) {
          if (active === first || !container.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (active === last || !container.contains(active)) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handler)

    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open, onClose, containerRef])
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm?: () => void | Promise<void>
  loading?: boolean
  children?: React.ReactNode
}

export function Modal({
  open, onClose, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'default', onConfirm, loading, children,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useModalA11y(open, onClose, containerRef)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {description && <p className="text-sm text-gray-600">{description}</p>}
        {children}

        {onConfirm && (
          <div className="flex gap-3 pt-2">
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
              loading={loading}
              className="flex-1"
            >
              {confirmLabel}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              {cancelLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  className?: string
  children: React.ReactNode
}

/** Container de dialog genérico (sem rodapé confirm/cancel) — para conteúdo livre como chat ou formulários. */
export function Dialog({ open, onClose, title, className, children }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useModalA11y(open, onClose, containerRef)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn('relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 outline-none', className)}
      >
        {title && (
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
