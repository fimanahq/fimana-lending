'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/shared/forms'
import { classNames } from '@/utils/class-names'
import styles from './dialog.module.css'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export interface DialogProps {
  children?: ReactNode
  open: boolean
  title: string
  actions?: ReactNode
  className?: string
  closeLabel?: string
  description?: string
  id?: string
  /** Blocks backdrop, close-button, and Escape dismissal while true. */
  dismissDisabled?: boolean
  onClose: () => void
}

export interface ConfirmationDialogProps {
  confirmLabel: string
  message: string
  onClose: () => void
  onConfirm: () => void
  open: boolean
  title: string
  cancelLabel?: string
  confirmDisabled?: boolean
  destructive?: boolean
}

function getOwnerDialog(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>('[role="dialog"]') : null
}

export function Dialog({
  actions,
  children,
  className,
  closeLabel = 'Close dialog',
  description,
  dismissDisabled = false,
  id = 'ui-dialog',
  onClose,
  open,
  title,
}: DialogProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  const dismissDisabledRef = useRef(dismissDisabled)

  useEffect(() => {
    closeRef.current = onClose
    dismissDisabledRef.current = dismissDisabled
  })

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()

    const requestClose = () => {
      if (!dismissDisabledRef.current) {
        closeRef.current()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const ownerDialog = getOwnerDialog(event.target)
      if (ownerDialog && ownerDialog !== panelRef.current) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return
      }

      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }

      const currentIndex = document.activeElement instanceof HTMLElement
        ? focusables.indexOf(document.activeElement)
        : -1
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
        : (currentIndex === -1 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1)

      event.preventDefault()
      focusables[nextIndex]?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  if (!open) {
    return null
  }

  const titleId = `${id}-title`
  const descriptionId = `${id}-description`

  const requestClose = () => {
    if (!dismissDisabled) {
      onClose()
    }
  }

  return (
    <div className={styles.dialog} role="presentation">
      <button className={styles.backdrop} type="button" aria-label={closeLabel} onClick={requestClose} />
      <section
        ref={panelRef}
        tabIndex={-1}
        className={classNames(styles.panel, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onPointerDown={(event) => {
          const target = event.target
          if (target instanceof Element && !target.closest(FOCUSABLE_SELECTOR)) {
            panelRef.current?.focus()
          }
        }}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId} className="section-title">{title}</h2>
            {description ? <p id={descriptionId} className="muted">{description}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={styles.closeButton}
            onClick={requestClose}
            aria-label={closeLabel}
            disabled={dismissDisabled}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        {children ? <div className={styles.body}>{children}</div> : null}

        {actions ? <footer className={styles.footer}>{actions}</footer> : null}
      </section>
    </div>
  )
}

export function ConfirmationDialog({
  cancelLabel = 'Cancel',
  confirmDisabled,
  confirmLabel,
  destructive,
  message,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmationDialogProps) {
  return (
    <Dialog
      id="ui-confirmation-dialog"
      open={open}
      title={title}
      description={message}
      onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      )}
    />
  )
}
