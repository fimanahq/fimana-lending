import Link, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

type ProtectedLinkProps = LinkProps
  & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>
  & {
    children: ReactNode
  }

export function ProtectedLink({ children, prefetch = false, ...props }: ProtectedLinkProps) {
  return (
    <Link {...props} prefetch={prefetch}>
      {children}
    </Link>
  )
}
