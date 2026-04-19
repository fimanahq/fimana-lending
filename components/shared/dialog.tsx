'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/shared/forms'
import { classNames } from '@/utils/class-names'

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
    <div className="ui-dialog" role="presentation">
      <button className="ui-dialog__backdrop" type="button" aria-label={closeLabel} onClick={onClose} />
      <section
        className={classNames('ui-dialog__panel', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="ui-dialog__header">
          <div>
            <h2 id={titleId} className="section-title">{title}</h2>
            {description ? <p id={descriptionId} className="muted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={closeLabel}>Close</Button>
        </header>

        {children ? <div className="ui-dialog__body">{children}</div> : null}

        {actions ? <footer className="ui-dialog__footer">{actions}</footer> : null}
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
