import { describe, expect, it } from 'vitest'
import { navItems } from './dashboard-shell'

describe('dashboard navigation', () => {
  it('places Collections immediately after Loans', () => {
    const loansIndex = navItems.findIndex((item) => item.href === '/loans')
    expect(navItems[loansIndex + 1]).toMatchObject({ href: '/collections', label: 'Collections' })
  })
})
