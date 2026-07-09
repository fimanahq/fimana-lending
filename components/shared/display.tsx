import { Children, cloneElement, isValidElement } from 'react'
import type { HTMLAttributes, ReactElement, ReactNode, TableHTMLAttributes } from 'react'
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
  actions?: ReactNode
  label: string
  children: ReactNode
  title?: string
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
}

export interface ErrorBannerProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode
  message: string
  title?: string
}

type ElementWithChildren = ReactElement<{ children?: ReactNode }>
type TableCellElement = ReactElement<{ children?: ReactNode; colSpan?: number; 'data-label'?: string; 'data-responsive-full'?: string }>

function getChildren(element: ReactElement) {
  return (element.props as { children?: ReactNode }).children
}

function isElementType(element: ReactNode, type: string): element is ElementWithChildren {
  return isValidElement(element) && element.type === type
}

function extractText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }

      if (isValidElement(child)) {
        return extractText(getChildren(child))
      }

      return ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTableHeaderLabels(children: ReactNode) {
  const thead = Children.toArray(children).find((child) => isElementType(child, 'thead'))

  if (!isElementType(thead, 'thead')) {
    return []
  }

  const firstHeaderRow = Children.toArray(getChildren(thead)).find((child) => isElementType(child, 'tr'))

  if (!isElementType(firstHeaderRow, 'tr')) {
    return []
  }

  return Children.toArray(getChildren(firstHeaderRow)).flatMap((cell) => {
    if (!isElementType(cell, 'th') && !isElementType(cell, 'td')) {
      return []
    }

    const label = extractText(getChildren(cell))
    const span = Math.max(Number((cell.props as { colSpan?: number }).colSpan ?? 1), 1)

    return Array.from({ length: span }, () => label)
  })
}

function addLabelsToRowCells(children: ReactNode, labels: string[]) {
  let columnIndex = 0

  return Children.map(children, (cell) => {
    if (!isElementType(cell, 'td')) {
      return cell
    }

    const span = Math.max(Number((cell.props as { colSpan?: number }).colSpan ?? 1), 1)
    const label = labels[columnIndex] ?? ''
    columnIndex += span

    if (span > 1) {
      return cloneElement(cell as TableCellElement, { 'data-responsive-full': 'true' })
    }

    if (!label) {
      return cell
    }

    return cloneElement(cell as TableCellElement, { 'data-label': label })
  })
}

function addLabelsToTableBody(children: ReactNode, labels: string[]) {
  return Children.map(children, (child) => {
    if (!isElementType(child, 'tr')) {
      return child
    }

    return cloneElement(child, undefined, addLabelsToRowCells(getChildren(child), labels))
  })
}

function addResponsiveLabelsToTableChildren(children: ReactNode) {
  const labels = getTableHeaderLabels(children)

  if (labels.length === 0) {
    return children
  }

  return Children.map(children, (child) => {
    if (!isElementType(child, 'tbody')) {
      return child
    }

    return cloneElement(child, undefined, addLabelsToTableBody(getChildren(child), labels))
  })
}

function addResponsiveLabelsToTables(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) {
      return child
    }

    const children = getChildren(child)

    if (child.type === 'table') {
      return cloneElement(child as ElementWithChildren, undefined, addResponsiveLabelsToTableChildren(children))
    }

    if (!children) {
      return child
    }

    return cloneElement(child as ElementWithChildren, undefined, addResponsiveLabelsToTables(children))
  })
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

export function TableShell({ actions, children, className, label, title, ...props }: TableShellProps) {
  return (
    <div className={classNames('card panel ui-table-shell', className)} role="region" aria-label={label} tabIndex={0} {...props}>
      {title || actions ? (
        <div className="ui-table-shell__header">
          <div>
            {title ? <h2 className="section-title">{title}</h2> : null}
          </div>
          {actions ? <div className="ui-table-shell__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="table-wrap">{addResponsiveLabelsToTables(children)}</div>
    </div>
  )
}

export function DataTable({ children, className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={classNames('ui-table', className)} {...props}>{addResponsiveLabelsToTableChildren(children)}</table>
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
