import Link from 'next/link'
import type { ReactNode } from 'react'

type PublicSiteHeaderProps = {
  headerClassName?: string
  innerClassName?: string
  brandClassName?: string
  actions?: ReactNode
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PublicSiteHeader({
  headerClassName,
  innerClassName,
  brandClassName,
  actions,
}: PublicSiteHeaderProps) {
  return (
    <header className={joinClasses('public-site-header', headerClassName)}>
      <div className={joinClasses('public-site-header__inner', innerClassName)}>
        <Link
          href="/"
          className={joinClasses('public-site-header__brand', brandClassName)}
          aria-label="FiMana Lending home"
        >
          FiMana Lending
        </Link>

        {actions}
      </div>
    </header>
  )
}
