import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/shared/forms'
import { classNames } from '@/utils/class-names'
import styles from './pagination.module.css'

export interface PaginationProps {
  page: number
  totalPages: number
  totalItems?: number
  itemLabel?: string
  loading?: boolean
  className?: string
  getPageHref?: (page: number) => string
  onPageChange?: (page: number) => void
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1))
}

function getVisiblePages(page: number, totalPages: number) {
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function Pagination({
  className,
  getPageHref,
  onPageChange,
  page,
  totalPages,
  totalItems,
  itemLabel = 'items',
  loading = false,
}: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1)
  const currentPage = clampPage(page, safeTotalPages)
  const pages = getVisiblePages(currentPage, safeTotalPages)

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < safeTotalPages

  const renderPageControl = ({
    targetPage,
    children,
    key,
    isCurrent = false,
    disabled = false,
    ariaLabel,
  }: {
    targetPage: number
    children: ReactNode
    key: string
    isCurrent?: boolean
    disabled?: boolean
    ariaLabel?: string
  }) => {
    const commonClassName = classNames(
      styles['ui-pagination__control'],
      isCurrent && styles['is-active'],
    )

    if (getPageHref && !disabled && !loading) {
      return (
        <Link
          key={key}
          href={getPageHref(targetPage)}
          prefetch={false}
          className={commonClassName}
          aria-label={ariaLabel}
          aria-current={isCurrent ? 'page' : undefined}
        >
          {children}
        </Link>
      )
    }

    return (
      <Button
        key={key}
        variant={isCurrent ? 'primary' : 'secondary'}
        size="sm"
        className={commonClassName}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={() => {
          if (!isCurrent) {
            onPageChange?.(targetPage)
          }
        }}
      >
        {children}
      </Button>
    )
  }

  return (
    <nav
      className={classNames(styles['ui-pagination'], className)}
      aria-label="Pagination"
    >
      <div className={styles['ui-pagination__summary']}>
        <span>
          Page <strong>{currentPage}</strong> of <strong>{safeTotalPages}</strong>
        </span>

        {typeof totalItems === 'number' && (
          <>
            <span className={styles['ui-pagination__summaryDivider']}>•</span>
            <span>
              {totalItems} total {itemLabel}
            </span>
          </>
        )}
      </div>

      <div className={styles['ui-pagination__actions']}>
        {renderPageControl({
          key: 'previous',
          targetPage: currentPage - 1,
          disabled: !canGoPrevious,
          ariaLabel: 'Go to previous page',
          children: <ChevronLeft size={16} aria-hidden="true" />,
        })}

        <div className={styles['ui-pagination__pages']}>
          {pages.map((visiblePage) =>
            renderPageControl({
              key: `page-${visiblePage}`,
              targetPage: visiblePage,
              isCurrent: visiblePage === currentPage,
              ariaLabel: `Go to page ${visiblePage}`,
              children: visiblePage,
            }),
          )}
        </div>

        {renderPageControl({
          key: 'next',
          targetPage: currentPage + 1,
          disabled: !canGoNext,
          ariaLabel: 'Go to next page',
          children: <ChevronRight size={16} aria-hidden="true" />,
        })}
      </div>
    </nav>
  )
}
