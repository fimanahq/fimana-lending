import type { PaymentFrequency } from '@/lib/types/shared'

function getInstallmentsPerMonth(paymentFrequency: PaymentFrequency) {
  return paymentFrequency === 'semi_monthly' ? 2 : 1
}

function getFallbackGuidance(installmentsPerMonth: number) {
  return installmentsPerMonth === 2
    ? '2 installments per month. Example: 6 months = 12 installments.'
    : '1 installment per month. Example: 6 months = 6 installments.'
}

export function getInstallmentTermGuidance(
  installmentValue: string | number,
  paymentFrequency: PaymentFrequency,
) {
  const installments = typeof installmentValue === 'number'
    ? installmentValue
    : Number(installmentValue.trim())
  const installmentsPerMonth = getInstallmentsPerMonth(paymentFrequency)

  if (!Number.isInteger(installments) || installments < 1) {
    return getFallbackGuidance(installmentsPerMonth)
  }

  const months = installments / installmentsPerMonth
  const monthLabel = months === 1 ? 'month' : 'months'
  const installmentLabel = installmentsPerMonth === 1 ? 'installment' : 'installments'

  return `Equivalent term: ${months} ${monthLabel} at ${installmentsPerMonth} ${installmentLabel} per month.`
}
