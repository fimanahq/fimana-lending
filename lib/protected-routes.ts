const protectedPaths = [
  '/active-loans',
  '/borrowers',
  '/calculator',
  '/collections',
  '/dashboard',
  '/loan-applications',
  '/loans',
  '/payments',
  '/rules',
  '/settings',
]

const borrowerProtectedPaths = [
  '/portal',
]

export function isProtectedPath(pathname: string) {
  return isLenderProtectedPath(pathname) || isBorrowerProtectedPath(pathname)
}

export function isLenderProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function isBorrowerProtectedPath(pathname: string) {
  return borrowerProtectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
