'use client'

import { Info } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

export function StatInfoDisclosure({
  children,
  contrast = false,
  id,
  label,
}: {
  children: ReactNode
  contrast?: boolean
  id: string
  label: string
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const closeWhenOutside = (event: Event) => {
      const details = detailsRef.current
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailsRef.current?.open) {
        event.preventDefault()
        detailsRef.current.open = false
        summaryRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeWhenOutside)
    document.addEventListener('focusin', closeWhenOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside)
      document.removeEventListener('focusin', closeWhenOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <details ref={detailsRef} className={dashboardClass('dashboard-overview__statInfo', contrast && 'dashboard-overview__statInfo--contrast')}>
      <summary ref={summaryRef} aria-describedby={id} aria-label={label} className={dashboardClass('dashboard-overview__statInfoButton')}>
        <Info className={dashboardClass('dashboard-overview__statMetaIcon')} aria-hidden="true" strokeWidth={2} />
      </summary>
      <div className={dashboardClass('dashboard-overview__statInfoBubble')} id={id} role="tooltip">
        {children}
      </div>
    </details>
  )
}
