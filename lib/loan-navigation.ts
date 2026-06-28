import { isProtectedPath } from '@/lib/protected-routes'

export type LoanListFilter = 'all' | 'active' | 'completed' | 'defaulted'

export interface LoanListState {
  page: number
  status: LoanListFilter
  search: string
}

export interface LoanDetailBackNavigation {
  href: string
  label: string
}

type SearchParamValue = string | string[] | undefined

const DEFAULT_LOAN_LIST_STATE: LoanListState = {
  page: 1,
  status: 'active',
  search: '',
}

const LOAN_LIST_FILTERS = new Set<LoanListFilter>([
  'all',
  'active',
  'completed',
  'defaulted',
])

function getFirstSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

export function parseLoanListState(searchParams?: {
  page?: SearchParamValue
  status?: SearchParamValue
  search?: SearchParamValue
}): LoanListState {
  const requestedPageValue = getFirstSearchParam(searchParams?.page) ?? ''
  const requestedPage = /^\d+$/.test(requestedPageValue) ? Number(requestedPageValue) : Number.NaN
  const requestedStatus = getFirstSearchParam(searchParams?.status)

  return {
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : DEFAULT_LOAN_LIST_STATE.page,
    status: requestedStatus && LOAN_LIST_FILTERS.has(requestedStatus as LoanListFilter)
      ? requestedStatus as LoanListFilter
      : DEFAULT_LOAN_LIST_STATE.status,
    search: (getFirstSearchParam(searchParams?.search) ?? '').trim(),
  }
}

export function buildLoanListPath(state: LoanListState) {
  const searchParams = new URLSearchParams()

  if (state.page > DEFAULT_LOAN_LIST_STATE.page) {
    searchParams.set('page', String(state.page))
  }

  if (state.status !== DEFAULT_LOAN_LIST_STATE.status) {
    searchParams.set('status', state.status)
  }

  const search = state.search.trim()
  if (search) {
    searchParams.set('search', search)
  }

  const queryString = searchParams.toString()
  return queryString ? `/loans?${queryString}` : '/loans'
}

export function buildLoanDetailPath(loanId: string, returnTo: string) {
  const searchParams = new URLSearchParams({ returnTo })
  return `/loans/${encodeURIComponent(loanId)}?${searchParams.toString()}`
}

export function getSafeProtectedReturnPath(returnTo?: SearchParamValue) {
  const requestedPath = getFirstSearchParam(returnTo)

  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) {
    return null
  }

  try {
    const baseUrl = new URL('https://fimana.local')
    const destination = new URL(requestedPath, baseUrl)

    if (destination.origin !== baseUrl.origin || !isProtectedPath(destination.pathname)) {
      return null
    }

    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return null
  }
}

export function getLoanDetailBackNavigation(returnTo?: SearchParamValue): LoanDetailBackNavigation {
  const href = getSafeProtectedReturnPath(returnTo) ?? '/loans'
  const pathname = new URL(href, 'https://fimana.local').pathname

  if (pathname === '/loans') {
    return { href, label: 'Back to loans' }
  }

  if (pathname.startsWith('/borrowers/')) {
    return { href, label: 'Back to borrower' }
  }

  if (pathname.startsWith('/loan-applications/')) {
    return { href, label: 'Back to application' }
  }

  if (pathname === '/loan-applications') {
    return { href, label: 'Back to applications' }
  }

  if (pathname === '/dashboard') {
    return { href, label: 'Back to dashboard' }
  }

  return { href, label: 'Back' }
}
