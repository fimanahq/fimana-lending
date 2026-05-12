'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/shared/forms'
import { classNames } from '@/utils/class-names'
import styles from './dialog.module.css'

export interface DialogProps {
  children?: ReactNode
  open: boolean
  title: string
  actions?: ReactNode
  className?: string
  closeLabel?: string
  description?: string
  id?: string
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

export function Dialog({
  actions,
  children,
  className,
  closeLabel = 'Close dialog',
  description,
  id = 'ui-dialog',
  onClose,
  open,
  title,
}: DialogProps) {
  if (!open) {
    return null
  }

  const titleId = `${id}-title`
  const descriptionId = `${id}-description`

  return (
    <div className={styles.dialog} role="presentation">
      <button className={styles.backdrop} type="button" aria-label={closeLabel} onClick={onClose} />
      <section
        className={classNames(styles.panel, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
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
            onClick={onClose}
            aria-label={closeLabel}
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
