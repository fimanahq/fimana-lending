import type {
  LoanApplicationComputedPreviewSnapshot,
  LoanApplicationPaymentType,
  LoanApplicationPreviewSnapshot,
  LoanRecord,
} from '@/lib/types/lending'
import type { PaymentFrequency } from '@/lib/types/shared'

export type BorrowerRiskLevel = 'low' | 'moderate' | 'high' | 'very_high'

export interface BorrowerRiskBand {
  level: BorrowerRiskLevel
  label: string
  minDti: number
  maxDti: number | null
}

export interface PaymentRange {
  minimum: number
  maximum: number
}

export const BORROWER_RISK_BANDS: BorrowerRiskBand[] = [
  { level: 'low', label: 'Low Risk', minDti: 0, maxDti: 25 },
  { level: 'moderate', label: 'Moderate Risk', minDti: 25, maxDti: 35 },
  { level: 'high', label: 'High Risk', minDti: 35, maxDti: 45 },
  { level: 'very_high', label: 'Very High Risk', minDti: 45, maxDti: null },
]

export function toFinitePositiveNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function toFiniteNonNegativeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function calculateDti(
  proposedMonthlyPayment: number | null | undefined,
  monthlyIncome: number | null | undefined,
) {
  const payment = toFiniteNonNegativeNumber(proposedMonthlyPayment)
  const income = toFinitePositiveNumber(monthlyIncome)

  if (payment === null || income === null) {
    return null
  }

  return (payment / income) * 100
}

export function getBorrowerRiskBand(dti: number | null | undefined) {
  if (typeof dti !== 'number' || !Number.isFinite(dti)) {
    return null
  }

  if (dti <= 25) {
    return BORROWER_RISK_BANDS[0]
  }

  if (dti <= 35) {
    return BORROWER_RISK_BANDS[1]
  }

  if (dti <= 45) {
    return BORROWER_RISK_BANDS[2]
  }

  return BORROWER_RISK_BANDS[3]
}

export function getComfortableMonthlyPaymentRange(monthlyIncome: number | null | undefined): PaymentRange | null {
  const income = toFiniteNonNegativeNumber(monthlyIncome)

  if (income === null) {
    return null
  }

  return {
    minimum: income * 0.2,
    maximum: income * 0.25,
  }
}

export function getComfortablePerCutoffRange(monthlyIncome: number | null | undefined): PaymentRange | null {
  const monthlyRange = getComfortableMonthlyPaymentRange(monthlyIncome)

  if (!monthlyRange) {
    return null
  }

  return {
    minimum: monthlyRange.minimum / 2,
    maximum: monthlyRange.maximum / 2,
  }
}

function getInstallmentsPerMonth(paymentFrequency: LoanApplicationPaymentType | PaymentFrequency | undefined) {
  return paymentFrequency === 'semi_monthly' ? 2 : 1
}

function calculateMonthlyPaymentFromInstallment(
  paymentPerInstallment: number | null | undefined,
  paymentFrequency: LoanApplicationPaymentType | PaymentFrequency | undefined,
) {
  const installmentPayment = toFiniteNonNegativeNumber(paymentPerInstallment)

  if (installmentPayment === null) {
    return null
  }

  return installmentPayment * getInstallmentsPerMonth(paymentFrequency)
}

export function calculateActiveMonthlyPayment(loans: LoanRecord[]) {
  return loans.reduce((monthlyTotal, loan) => {
    if (loan.status !== 'active' || loan.installmentCount <= 0) {
      return monthlyTotal
    }

    const totalPayment = (loan.principalAmountMinor + loan.totalInterestAmountMinor) / 100
    const paymentPerInstallment = totalPayment / loan.installmentCount
    const monthlyPayment = calculateMonthlyPaymentFromInstallment(paymentPerInstallment, loan.paymentFrequency)

    return monthlyPayment === null ? monthlyTotal : monthlyTotal + monthlyPayment
  }, 0)
}

export function calculateApplicationPreviewMonthlyPayment(
  preview: LoanApplicationComputedPreviewSnapshot | LoanApplicationPreviewSnapshot | null | undefined,
) {
  if (!preview) {
    return null
  }

  if ('totalPaymentAmountMinor' in preview) {
    if (preview.installmentCount <= 0) {
      return null
    }

    const paymentPerInstallment = preview.totalPaymentAmountMinor / 100 / preview.installmentCount
    return calculateMonthlyPaymentFromInstallment(paymentPerInstallment, preview.frequency)
  }

  if (typeof preview.totalPayment === 'number' && Number.isFinite(preview.totalPayment) && preview.gives > 0) {
    return calculateMonthlyPaymentFromInstallment(preview.totalPayment / preview.gives, preview.paymentFrequency)
  }

  const schedule = preview.schedule ?? []
  if (schedule.length === 0) {
    return null
  }

  const totalScheduledPayment = schedule.reduce((sum, row) => sum + row.totalPayment, 0)
  return calculateMonthlyPaymentFromInstallment(totalScheduledPayment / schedule.length, preview.paymentFrequency)
}
