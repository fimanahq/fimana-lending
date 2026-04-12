'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'

type IconName =
  | 'overview'
  | 'requests'
  | 'loans'
  | 'calculator'
  | 'rules'
  | 'settings'
  | 'support'
  | 'bell'
  | 'user'
  | 'plus'

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Overview', icon: 'overview' },
  { href: '/requests', label: 'Requests', icon: 'requests' },
  { href: '/loans', label: 'Loans', icon: 'loans' },
  { href: '/calculator', label: 'Calculator', icon: 'calculator' },
  { href: '/rules', label: 'Rules', icon: 'rules' },
]

const utilityItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/loans/new', label: 'New application', icon: 'plus' },
  { href: '/rules', label: 'Settings', icon: 'settings' },
  { href: '/requests', label: 'Support', icon: 'support' },
]

function DashboardIcon({ name }: { name: IconName }) {
  switch (name) {
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor" />
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
    case 'user':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
  const initials = user ? `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase() : 'FM'

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

        <div className="dashboard-shell__sidebarMeta">
          {utilityItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`dashboard-shell__navLink dashboard-shell__navLink--subtle${isRouteActive(pathname, item.href) ? ' is-active' : ''}`}
            >
              <span className="dashboard-shell__navIcon">
                <DashboardIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

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
              <span className="dashboard-shell__accountIcon">
                <DashboardIcon name="user" />
              </span>
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
