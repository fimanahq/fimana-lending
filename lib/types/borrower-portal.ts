import type { LoanApplication, LoanRecord } from './lending'

export interface BorrowerPortalLinkedBorrower {
  id: string
  ownerUserId: string
  borrowerNumber: string
  displayName: string
  email: string
  mobileNumber: string
}

export interface BorrowerPortalLender {
  id: string
  displayName: string
}

export interface LenderInvitation {
  lenderId: string
  slug: string
  displayName: string
}

export interface BorrowerPortalSummary {
  lender: BorrowerPortalLender | null
  linkedBorrowers: BorrowerPortalLinkedBorrower[]
  counts: {
    linkedBorrowers: number
    activeLoans: number
    applications: number
  }
  loans: LoanRecord[]
  applications: LoanApplication[]
}
