import type { LoanApplication, LoanRecord } from './lending'

export interface BorrowerPortalLinkedBorrower {
  id: string
  ownerUserId: string
  borrowerNumber: string
  displayName: string
  email: string
  mobileNumber: string
}

export interface BorrowerPortalSummary {
  linkedBorrowers: BorrowerPortalLinkedBorrower[]
  counts: {
    linkedBorrowers: number
    activeLoans: number
    applications: number
  }
  loans: LoanRecord[]
  applications: LoanApplication[]
}
