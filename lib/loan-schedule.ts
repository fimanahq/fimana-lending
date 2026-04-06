import type { LoanSchedulePreset, PaymentFrequency } from '@/lib/types'

export const paymentDayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1)).concat('month_end')

export function buildPaymentDays(
  paymentFrequency: PaymentFrequency,
  firstDay: string,
  secondDay: string,
  preset: LoanSchedulePreset,
) {
  if (paymentFrequency === 'monthly') {
    return [firstDay]
  }

  if (preset === '15_month_end') {
    return ['15', 'month_end']
  }

  if (preset === '5_20') {
    return ['5', '20']
  }

  return [firstDay, secondDay]
}
