import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { classNames } from '@/utils/class-names'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  actions?: ReactNode
  description?: string
  title?: string
  variant?: 'default' | 'flat'
}

export interface TableShellProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  children: ReactNode
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
}

export interface ErrorBannerProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode
  message: string
  title?: string
}

export function Badge({ children, className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span className={classNames('ui-badge', `ui-badge--${tone}`, className)} {...props}>
      {children}
    </span>
  )
}

export function Card({
  actions,
  children,
  className,
  description,
  title,
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <section className={classNames('card panel ui-card', variant === 'flat' && 'card-flat', className)} {...props}>
      {title || description || actions ? (
        <div className="ui-card__header">
          <div>
            {title ? <h2 className="section-title">{title}</h2> : null}
            {description ? <p className="muted ui-card__description">{description}</p> : null}
          </div>
          {actions ? <div className="ui-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function TableShell({ children, className, label, ...props }: TableShellProps) {
  return (
    <div className={classNames('card panel ui-table-shell', className)} role="region" aria-label={label} tabIndex={0} {...props}>
      <div className="table-wrap">{children}</div>
    </div>
  )
}

export function DataTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={classNames('ui-table', className)} {...props} />
}

export function Skeleton({ className, lines = 1, ...props }: SkeletonProps) {
  return (
    <div className={classNames('ui-skeleton', className)} aria-hidden="true" {...props}>
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="ui-skeleton__line" />
      ))}
    </div>
  )
}

export function ErrorBanner({
  action,
  className,
  message,
  title = 'Something went wrong',
  ...props
}: ErrorBannerProps) {
  return (
    <div className={classNames('ui-error-banner', className)} role="alert" {...props}>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {action ? <div className="ui-error-banner__action">{action}</div> : null}
    </div>
  )
}
