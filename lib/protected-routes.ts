const protectedPaths = [
  '/active-loans',
  '/borrowers',
  '/calculator',
  '/dashboard',
  '/loan-applications',
  '/loans',
  '/payments',
  '/rules',
  '/settings',
]

export function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
