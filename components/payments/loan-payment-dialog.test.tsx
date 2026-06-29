import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/shared'
import type { LoanRecord } from '@/lib/types/lending'
import { LoanPaymentDialog } from './loan-payment-dialog'

const serviceMocks = vi.hoisted(() => ({
  getLoanPaymentDetail: vi.fn(),
  getSettings: vi.fn(),
  postLoanPayment: vi.fn(),
}))

vi.mock('@/services', () => serviceMocks)

const loan = {
  id: 'loan-1',
  loanNumber: 'LN-001',
  status: 'active',
  borrower: { displayName: 'Test Borrower' },
  loanProduct: { currency: 'PHP' },
  balances: {
    totalOutstandingAmountMinor: 11_000,
    totalPaidAmountMinor: 0,
  },
  nextDueDate: '2026-06-30',
  schedule: [{
    id: 'row-1',
    sequence: 1,
    dueDate: '2026-06-30',
    outstandingPrincipalAmountMinor: 10_000,
    outstandingInterestAmountMinor: 1_000,
    outstandingTotalAmountMinor: 11_000,
    status: 'pending',
  }],
} as unknown as LoanRecord

describe('LoanPaymentDialog submission lock', () => {
  it('prevents duplicate submissions before React rerenders the disabled button', async () => {
    let resolvePost: ((value: { loan: LoanRecord; payments: [] }) => void) | undefined
    serviceMocks.getLoanPaymentDetail.mockResolvedValue({ loan, payments: [] })
    serviceMocks.getSettings.mockResolvedValue({ includeLoanPaymentsInTreasuryByDefault: true })
    serviceMocks.postLoanPayment.mockReturnValue(new Promise((resolve) => {
      resolvePost = resolve
    }))

    render(
      <ToastProvider>
        <LoanPaymentDialog loanId="loan-1" open onClose={() => undefined} />
      </ToastProvider>,
    )

    const submit = await screen.findByRole('button', { name: 'Post payment' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(serviceMocks.postLoanPayment).toHaveBeenCalledTimes(1)
    resolvePost?.({ loan, payments: [] })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Post payment' })).toBeEnabled())
  })
})
