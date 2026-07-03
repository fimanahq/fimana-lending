'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AppLogo } from '@/components/shared/app-logo'
import { useAuth } from '@/components/providers/auth-provider'
import { classNames } from '@/utils/class-names'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'
import {
  BookOpenText,
  Calculator,
  CreditCard,
  FileText,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  UsersRound,
  X,
} from 'lucide-react'

type IconName =
  | 'borrowers'
  | 'calculator'
  | 'overview'
  | 'payments'
  | 'rules'
  | 'applications'
  | 'loans'
  | 'settings'
  | 'treasury'
  | 'menu'
  | 'panel-left-close'
  | 'panel-left-open'
  | 'plus'
  | 'x'

interface NavItem {
  href: string
  label: string
  icon: IconName
  aliases?: string[]
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'overview' },
  { href: '/borrowers', label: 'Borrowers', icon: 'borrowers' },
  { href: '/loan-applications', label: 'Loan Applications', icon: 'applications' },
  { href: '/loans', label: 'Loans', icon: 'loans', aliases: ['/active-loans'] },
  { href: '/collections', label: 'Collections', icon: 'payments' },
  { href: '/calculator', label: 'Calculator', icon: 'calculator' },
  { href: '/rules', label: 'Pricing Guide', icon: 'rules' },
  { href: '/treasury', label: 'Treasury', icon: 'treasury' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

const pathLabels: Record<string, string> = {
  'active-loans': 'Loans',
  borrowers: 'Borrowers',
  calculator: 'Calculator',
  collections: 'Collections',
  dashboard: 'Dashboard',
  'loan-applications': 'Loan Applications',
  loans: 'Loans',
  new: 'New Application',
  payments: 'Payments',
  rules: 'Pricing Guide',
  schedule: 'Schedule',
  settings: 'Settings',
  treasury: 'Treasury',
}

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

const icons = {
  overview: LayoutDashboard,
  borrowers: UsersRound,
  applications: FileText,
  loans: HandCoins,
  treasury: Landmark,
  payments: CreditCard,
  calculator: Calculator,
  rules: BookOpenText,
  settings: Settings,
  menu: Menu,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  plus: Plus,
  x: X,
} satisfies Record<IconName, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>>

export function DashboardIcon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  const Icon = icons[name]

  return <Icon className={className} aria-hidden />
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

function formatPathSegment(segment: string) {
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function isDynamicSegment(segment: string) {
  return /^[a-f\d]{24}$/i.test(segment) || segment.length > 12
}

function getPageTitle(pathname: string) {
  if (pathname === '/') {
    return 'Dashboard'
  }

  const exactMatch = navItems.find((item) => item.href === pathname || item.aliases?.includes(pathname))
  if (exactMatch) {
    if (exactMatch.href === '/treasury') {
      return 'Lending Treasury'
    }

    return exactMatch.label
  }

  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const previousSegment = segments[segments.length - 2]

  if (!lastSegment) {
    return 'Dashboard'
  }

  if (lastSegment === 'new' && previousSegment === 'borrowers') {
    return 'New Borrower'
  }

  if (lastSegment === 'new' && (previousSegment === 'loan-applications' || previousSegment === 'loans')) {
    return 'New Application'
  }

  if (lastSegment === 'schedule') {
    return 'Schedule'
  }

  if (previousSegment === 'collections' && /^\d{4}-\d{2}-\d{2}$/.test(lastSegment)) {
    return 'Cutoff Detail'
  }

  if (isDynamicSegment(lastSegment)) {
    if (previousSegment === 'borrowers') {
      return 'Borrower Profile'
    }

    if (previousSegment === 'loan-applications') {
      return 'Application Detail'
    }

    if (previousSegment === 'loans') {
      return 'Loan Detail'
    }
  }

  return pathLabels[lastSegment] || formatPathSegment(lastSegment)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, user, setUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavCollapsed, setIsNavCollapsed] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    setIsAccountMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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
  const pageTitle = getPageTitle(pathname)

  return (
    <div
      className={classNames(
        dashboardClass('dashboard-shell'),
        isSidebarOpen && dashboardClass('dashboard-shell--sidebar-open'),
        isNavCollapsed && dashboardClass('dashboard-shell--nav-collapsed'),
      )}
    >
      <div
        className={dashboardClass('dashboard-shell__backdrop')}
        role="presentation"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={dashboardClass('dashboard-shell__sidebar')} aria-label="Application navigation">
        <div className={dashboardClass('dashboard-shell__sidebarHeader')}>
          <div className={dashboardClass('dashboard-shell__sidebarBrandGroup')}>
            <Link
              href="/dashboard"
              prefetch={false}
              className={dashboardClass('dashboard-shell__sidebarBrand')}
              aria-label="FiMana Lending dashboard home"
            >
              <AppLogo suffix="Lending" />
            </Link>

            <button
              className={dashboardClass('dashboard-shell__sidebarToggle')}
              type="button"
              aria-label={isNavCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-pressed={!isNavCollapsed}
              title={isNavCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={() => setIsNavCollapsed((current) => !current)}
            >
              <DashboardIcon name={isNavCollapsed ? 'panel-left-open' : 'panel-left-close'} />
            </button>
          </div>

          <div className={dashboardClass('dashboard-shell__sidebarControls')}>
            <button
              className={dashboardClass('dashboard-shell__sidebarClose')}
              type="button"
              aria-label="Close navigation"
              onClick={() => setIsSidebarOpen(false)}
            >
              <DashboardIcon name="x" />
            </button>
          </div>
        </div>

        <nav className={dashboardClass('dashboard-shell__nav')} aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={dashboardClass('dashboard-shell__navLink', isRouteActive(pathname, item) && 'active')}
              aria-current={isRouteActive(pathname, item) ? 'page' : undefined}
              title={item.label}
            >
              <span className={dashboardClass('dashboard-shell__navIcon')}>
                <DashboardIcon name={item.icon} />
              </span>
              <span className={dashboardClass('dashboard-shell__navLabel')}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className={dashboardClass('dashboard-shell__workspace')}>
        <header className={dashboardClass('dashboard-shell__topbar')}>
          <div className={dashboardClass('dashboard-shell__pageHeading')}>
            <button
              className={dashboardClass('dashboard-shell__menuButton')}
              type="button"
              aria-label="Open navigation"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <DashboardIcon name="menu" />
            </button>

            <div className={dashboardClass('dashboard-shell__headingCopy')}>
              <h1 className={dashboardClass('dashboard-shell__pageTitle')}>{pageTitle}</h1>
            </div>
            <div className={dashboardClass('dashboard-shell__actions')}>
              <div className={dashboardClass('dashboard-shell__accountMenu')} ref={accountMenuRef}>
                <button
                  className={dashboardClass('dashboard-shell__accountButton')}
                  type="button"
                  aria-label={`${fullName} account menu`}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                >
                  <span className={dashboardClass('dashboard-shell__accountAvatar')}>{initials}</span>
                </button>

                {isAccountMenuOpen ? (
                  <div className={dashboardClass('dashboard-shell__accountDropdown')} role="menu" aria-label="Account menu">
                    <div className={dashboardClass('dashboard-shell__accountDropdownHeader')}>
                      <span className={dashboardClass('dashboard-shell__accountAvatar')}>{initials}</span>
                      <span className={dashboardClass('dashboard-shell__accountCopy')}>
                        <span>{fullName}</span>
                        <span>{user?.email || 'User menu'}</span>
                      </span>
                    </div>

                    <button
                      className={dashboardClass('dashboard-shell__logout', 'dashboard-shell__logout--dropdown')}
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className={dashboardClass('dashboard-shell__main')}>
          <div className={dashboardClass('dashboard-shell__content')}>{children}</div>
        </main>

        <footer className={dashboardClass('dashboard-shell__footer')}>
          <span>&copy; {new Date().getFullYear()} FiMana Lending. All rights reserved.</span>
          <div className={dashboardClass('dashboard-shell__footerLinks')}>
            <Link href="/">Internal Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
