'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { classNames } from '@/utils/class-names'

type IconName =
  | 'borrowers'
  | 'collections'
  | 'overview'
  | 'payments'
  | 'reports'
  | 'applications'
  | 'loans'
  | 'settings'
  | 'bell'
  | 'menu'
  | 'plus'
  | 'x'

interface NavItem {
  href: string
  label: string
  icon: IconName
  aliases?: string[]
}

interface BreadcrumbItem {
  href?: string
  label: string
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'overview' },
  { href: '/borrowers', label: 'Borrowers', icon: 'borrowers' },
  { href: '/loan-applications', label: 'Loan Applications', icon: 'applications' },
  { href: '/active-loans', label: 'Active Loans', icon: 'loans', aliases: ['/loans'] },
  { href: '/payments', label: 'Payments', icon: 'payments' },
  { href: '/collections', label: 'Collections', icon: 'collections' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

const pathLabels: Record<string, string> = {
  'active-loans': 'Active Loans',
  borrowers: 'Borrowers',
  collections: 'Collections',
  dashboard: 'Dashboard',
  'loan-applications': 'Loan Applications',
  loans: 'Loans',
  new: 'New Loan',
  payments: 'Payments',
  reports: 'Reports',
  schedule: 'Schedule',
  settings: 'Settings',
}

function DashboardIcon({ name }: { name: IconName }) {
  switch (name) {
    case 'borrowers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM15.8 10a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 19c.7-3.6 2.6-5.4 5-5.4s4.3 1.8 5 5.4M13.7 14.1c2.7.1 4.5 1.8 5 4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'collections':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5h12v14H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 8h6M9 12h6M9 16h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.5 14.5 20 17l-2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor" />
        </svg>
      )
    case 'payments':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.8" y="6.2" width="16.4" height="11.6" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.8 10h16.4M8 15h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15.5 14.8h1.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19V5M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 15.5v-4M12 15.5v-7M15.5 15.5v-5.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m8.5 8.2 3.4-2.6 3.6 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'applications':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 5h8l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M14 5v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 12h6M8 16h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'loans':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10 12 5l9 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 19h18" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 3 1.3 2.8 3.1.5.7 3 2.6 1.8-1 3 1 3-2.6 1.8-.7 3-3.1.5L12 21l-1.3-2.8-3.1-.5-.7-3L4.3 13l1-3-1-3 2.6-1.8.7-3 3.1-.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4a4 4 0 0 0-4 4v2.2c0 1-.3 2-.9 2.8L5.8 15h12.4l-1.3-2c-.6-.8-.9-1.8-.9-2.8V8a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 18a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'x':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

function isPathMatch(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isRouteActive(pathname: string, item: NavItem) {
  return [item.href, ...(item.aliases || [])].some((href) => isPathMatch(pathname, href))
}

function getAccountInitials(firstName?: string, lastName?: string, email?: string) {
  const initials = `${firstName?.trim()[0] || ''}${lastName?.trim()[0] || ''}`.toUpperCase()

  if (initials) {
    return initials
  }

  return email?.trim()[0]?.toUpperCase() || ''
}

function formatDynamicSegment(segment: string, previousSegment?: string) {
  if (/^[a-f\d]{24}$/i.test(segment) || segment.length > 12) {
    if (previousSegment === 'borrowers') {
      return 'Borrower Profile'
    }

    return 'Loan Detail'
  }

  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Dashboard', href: '/dashboard' }]
  }

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`
    const isLast = index === segments.length - 1
    const previousSegment = segments[index - 1]
    const label = previousSegment === 'borrowers' && segment === 'new'
      ? 'New Borrower'
      : pathLabels[segment] || formatDynamicSegment(segment, previousSegment)

    return {
      href: isLast ? undefined : href,
      label,
    }
  })
}

function getPageTitle(pathname: string) {
  const activeItem = navItems.find((item) => isRouteActive(pathname, item))

  if (activeItem) {
    return activeItem.label
  }

  const breadcrumbs = getBreadcrumbs(pathname)
  return breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, user, setUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
      })
    } finally {
      setUser(null)
      window.location.replace('/login')
    }
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Team member'
  const initials = getAccountInitials(user?.firstName, user?.lastName, user?.email)
  const breadcrumbs = getBreadcrumbs(pathname)
  const pageTitle = getPageTitle(pathname)

  return (
    <div className={classNames('dashboard-shell', isSidebarOpen && 'dashboard-shell--sidebar-open')}>
      <div
        className="dashboard-shell__backdrop"
        role="presentation"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className="dashboard-shell__sidebar" aria-label="Application navigation">
        <div className="dashboard-shell__sidebarHeader">
          <Link href="/dashboard" className="dashboard-shell__sidebarBrand" aria-label="FiMana dashboard home">
            FiMana
          </Link>

          <button
            className="dashboard-shell__sidebarClose"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          >
            <DashboardIcon name="x" />
          </button>
        </div>

        <nav className="dashboard-shell__nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={classNames('dashboard-shell__navLink', isRouteActive(pathname, item) && 'is-active')}
              aria-current={isRouteActive(pathname, item) ? 'page' : undefined}
            >
              <span className="dashboard-shell__navIcon">
                <DashboardIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <Link href="/loans/new" className="dashboard-shell__sidebarCta">
          <span className="dashboard-shell__ctaIcon">
            <DashboardIcon name="plus" />
          </span>
          <span>New Loan</span>
        </Link>
      </aside>

      <div className="dashboard-shell__workspace">
        <header className="dashboard-shell__topbar">
          <div className="dashboard-shell__pageHeading">
            <button
              className="dashboard-shell__menuButton"
              type="button"
              aria-label="Open navigation"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <DashboardIcon name="menu" />
            </button>

            <div>
              <nav className="dashboard-shell__breadcrumbs" aria-label="Breadcrumb">
                <ol>
                  {breadcrumbs.map((item, index) => (
                    <li key={`${item.label}-${index}`}>
                      {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="dashboard-shell__pageTitle">{pageTitle}</div>
            </div>
          </div>

          <div className="dashboard-shell__actions">
            <button className="dashboard-shell__notificationButton" type="button" aria-label="Notifications placeholder">
              <DashboardIcon name="bell" />
              <span>0</span>
            </button>

            <button className="dashboard-shell__accountButton" type="button" aria-label={`${fullName} menu placeholder`}>
              <span className="dashboard-shell__accountAvatar">{initials}</span>
              <span className="dashboard-shell__accountCopy">
                <span>{fullName}</span>
                <span>{user?.email || 'User menu'}</span>
              </span>
            </button>

            <button className="dashboard-shell__logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        <main className="dashboard-shell__main">
          <div className="dashboard-shell__content">{children}</div>
        </main>

        <footer className="dashboard-shell__footer">
          <span>&copy; {new Date().getFullYear()} FiMana Lending. All rights reserved.</span>
          <div className="dashboard-shell__footerLinks">
            <Link href="/">Internal Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
