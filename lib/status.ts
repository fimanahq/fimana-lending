import type { LoanInstallmentStatus, LoanApplicationRecordStatus, LoanStatus, LoanReminderStatus } from '@/lib/types'

export function normalizeLoanApplicationStatus(status: LoanApplicationRecordStatus) {
  return status === 'pending' ? 'submitted' : status
}

export function formatLoanApplicationStatus(status: LoanApplicationRecordStatus) {
  const normalized = normalizeLoanApplicationStatus(status)

  return {
    approved: 'Approved',
    cancelled: 'Cancelled',
    draft: 'Draft',
    rejected: 'Rejected',
    submitted: 'Submitted',
    under_review: 'Under Review',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
  }[normalized]
}

export function getStatusClassName(
  status: LoanStatus | LoanInstallmentStatus | LoanReminderStatus | LoanApplicationRecordStatus,
) {
  return `status-pill ${status === 'pending' ? 'submitted' : status}`
}
