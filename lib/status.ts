import type { LoanInstallmentStatus, LoanRequestStatus, LoanStatus, LoanReminderStatus } from '@/lib/types'

export function getStatusClassName(
  status: LoanStatus | LoanInstallmentStatus | LoanReminderStatus | LoanRequestStatus,
) {
  return `status-pill ${status}`
}
