'use client'

import Link from 'next/link'
import { Button } from '@/components/shared/forms'
import { classNames } from '@/utils/class-names'

export interface PaginationProps {
  page: number
  totalPages: number
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

export function Pagination({ className, getPageHref, onPageChange, page, totalPages }: PaginationProps) {
  const currentPage = clampPage(page, totalPages)
  const pages = getVisiblePages(currentPage, totalPages)
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const renderPageControl = (targetPage: number, label: string, isCurrent = false, disabled = false) => {
    const commonClassName = classNames('ui-pagination__control', isCurrent && 'is-active')

    if (getPageHref && !disabled) {
      return (
        <Link
          key={`${label}-${targetPage}`}
          href={getPageHref(targetPage)}
          className={commonClassName}
          aria-current={isCurrent ? 'page' : undefined}
        >
          {label}
        </Link>
      )
    }

    return (
      <Button
        key={`${label}-${targetPage}`}
        variant={isCurrent ? 'primary' : 'secondary'}
        size="sm"
        className={commonClassName}
        disabled={disabled}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={() => onPageChange?.(targetPage)}
      >
        {label}
      </Button>
    )
  }

  return (
    <nav className={classNames('ui-pagination', className)} aria-label="Pagination">
      {renderPageControl(currentPage - 1, 'Previous', false, !canGoPrevious)}
      <div className="ui-pagination__pages">
        {pages.map((visiblePage) => renderPageControl(visiblePage, String(visiblePage), visiblePage === currentPage))}
      </div>
      {renderPageControl(currentPage + 1, 'Next', false, !canGoNext)}
    </nav>
  )
}
