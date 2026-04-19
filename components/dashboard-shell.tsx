'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'

type IconName =
  | 'borrowers'
  | 'overview'
  | 'payments'
  | 'reports'
  | 'requests'
  | 'loans'
  | 'calculator'
  | 'rules'
  | 'settings'
  | 'support'
  | 'bell'
  | 'plus'

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Overview', icon: 'overview' },
  { href: '/loan-applications', label: 'Applications', icon: 'requests' },
  { href: '/borrowers', label: 'Borrowers', icon: 'borrowers' },
  { href: '/loans', label: 'Loans', icon: 'loans' },
  { href: '/payments', label: 'Payments', icon: 'payments' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
  { href: '/calculator', label: 'Calculator', icon: 'calculator' },
  { href: '/rules', label: 'Rules', icon: 'rules' },
]

function DashboardIcon({ name }: { name: IconName }) {
  switch (name) {
    case 'borrowers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM15.8 10a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 19c.7-3.6 2.6-5.4 5-5.4s4.3 1.8 5 5.4M13.7 14.1c2.7.1 4.5 1.8 5 4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
    case 'requests':
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
    case 'calculator':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 8h8M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'rules':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 18 4-4m0 0 2-2 7 7M9 14 4 9l2.5-2.5L12 12m1-7 5 5-2 2-5-5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    case 'support':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.3-1.7 2.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.8" r="1" fill="currentColor" />
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
    default:
      return null
  }
}

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getAccountInitials(firstName?: string, lastName?: string, email?: string) {
  const initials = `${firstName?.trim()[0] || ''}${lastName?.trim()[0] || ''}`.toUpperCase()

  if (initials) {
    return initials
  }

  return email?.trim()[0]?.toUpperCase() || ''
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, user, setUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

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

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-shell__sidebar">
        <Link href="/dashboard" className="dashboard-shell__sidebarBrand" aria-label="FiMana dashboard home">
          FiMana
        </Link>

        <nav className="dashboard-shell__nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-shell__navLink${isRouteActive(pathname, item.href) ? ' is-active' : ''}`}
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
          <span>New Application</span>
        </Link>
      </aside>

      <div className="dashboard-shell__workspace">
        <header className="dashboard-shell__topbar">
          <div className="dashboard-shell__actions">
            <button className="dashboard-shell__iconButton" type="button" aria-label="Notifications">
              <DashboardIcon name="bell" />
              <span className="dashboard-shell__notificationDot" />
            </button>

            <button className="dashboard-shell__accountButton" type="button" aria-label={fullName}>
              <span className="dashboard-shell__accountAvatar">{initials}</span>
            </button>

            <button className="dashboard-shell__logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        <main className="dashboard-shell__main">{children}</main>

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
