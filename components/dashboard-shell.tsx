'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/requests', label: 'Requests' },
  { href: '/loans', label: 'Loans' },
  { href: '/calculator', label: 'Calculator' },
  { href: '/loans/new', label: 'Create Loan' },
  { href: '/rules', label: 'Rules' },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, user, setUser } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.replace('/')
  }

  return (
    <div className="app-shell">
      <div className="page-wrap">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-mark" />
            <div>
              <div className="eyebrow">FiMana Lending</div>
              <h1 className="section-title title-offset-sm">
                Lending operations with fixed rules and clean collections.
              </h1>
            </div>
          </div>

          <div className="inline-actions">
            {user ? (
              <div className="card panel stack-tight user-card">
                <div className="muted micro-copy">Signed in as</div>
                <div className="font-heading">
                  {user.firstName} {user.lastName}
                </div>
                <button className="button-ghost" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="shell-grid">
          <aside className="card panel">
            <div className="stack">
              <div className="hero-card card">
                <div className="eyebrow eyebrow-inverse">
                  Protected workspace
                </div>
                <h2 className="section-title title-offset">
                  Keep borrower details, due dates, and table-ready schedules in one place.
                </h2>
              </div>

              <nav className="sidebar-nav">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link${pathname === item.href || pathname.startsWith(`${item.href}/`) ? ' active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <main className="stack">{children}</main>
        </div>
      </div>
    </div>
  )
}
