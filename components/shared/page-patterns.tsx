import type { ReactNode } from 'react'
import { classNames } from '@/utils/class-names'

type HeadingLevel = 'h1' | 'h2' | 'h3'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

interface SectionHeaderProps {
  title: string
  actions?: ReactNode
  className?: string
  description?: string
  eyebrow?: string
  level?: HeadingLevel
}

interface CardWrapperProps {
  children: ReactNode
  className?: string
  title?: string
}

interface TableWrapperProps {
  children: ReactNode
  className?: string
  label?: string
}

interface StateProps {
  title: string
  action?: ReactNode
  className?: string
  description?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={classNames('page-container', className)}>{children}</div>
}

export function SectionHeader({
  actions,
  className,
  description,
  eyebrow,
  level = 'h1',
  title,
}: SectionHeaderProps) {
  const Heading = level

  return (
    <div className={classNames('section-header', className)}>
      <div className="section-header__copy">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <Heading className="section-title section-header__title">{title}</Heading>
        {description ? <p className="muted section-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="section-header__actions">{actions}</div> : null}
    </div>
  )
}

export function CardWrapper({ children, className, title }: CardWrapperProps) {
  return (
    <section className={classNames('card panel card-wrapper', className)}>
      {title ? <h2 className="section-title">{title}</h2> : null}
      {children}
    </section>
  )
}

export function TableWrapper({ children, className, label }: TableWrapperProps) {
  const regionProps = label ? { 'aria-label': label, role: 'region' as const, tabIndex: 0 } : {}

  return (
    <div className={classNames('card panel table-wrapper', className)} {...regionProps}>
      <div className="table-wrap">{children}</div>
    </div>
  )
}

export function EmptyState({ action, className, description, title }: StateProps) {
  return (
    <div className={classNames('state-card state-card--empty', className)}>
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="state-card__action">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ className, description, title }: StateProps) {
  return (
    <div className={classNames('state-card state-card--loading', className)} role="status" aria-live="polite">
      <span className="state-card__spinner" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  )
}

export function ErrorState({ action, className, description, title }: StateProps) {
  return (
    <div className={classNames('state-card state-card--error', className)} role="alert">
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="state-card__action">{action}</div> : null}
    </div>
  )
}
