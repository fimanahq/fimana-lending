import { defaultLoanInterestRules } from '@/content/rules'
import type {
  LoanInterestRulesConfig,
  LoanSchedulePreset,
  LoanSchedulePreviewRow,
  PaymentFrequency,
} from '@/lib/types'

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

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Enter a valid first payment date')
  }
  return date
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate()
}

function resolveMonthDate(year: number, month: number, paymentDay: number | 'month_end') {
  const lastDay = getLastDayOfMonth(year, month)
  const day = paymentDay === 'month_end' ? lastDay : Math.min(paymentDay, lastDay)
  return new Date(Date.UTC(year, month, day, 12))
}

function sameDay(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

export function normalizePaymentDays(paymentFrequency: PaymentFrequency, rawDays: string[]) {
  const normalized = rawDays.map((value) => {
    const trimmed = value.trim().toLowerCase()
    if (trimmed === 'month_end') {
      return 'month_end' as const
    }

    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
      throw new Error('Payment days must be 1 to 31 or month end')
    }

    return parsed
  })

  const unique = normalized.filter((day, index) =>
    normalized.findIndex((candidate) => candidate === day) === index,
  )

  if (paymentFrequency === 'monthly' && unique.length !== 1) {
    throw new Error('Monthly schedule requires exactly one payment day')
  }

  if (paymentFrequency === 'twice_monthly' && unique.length !== 2) {
    throw new Error('Twice-monthly schedule requires exactly two payment days')
  }

  return unique.sort((left, right) => {
    const leftRank = left === 'month_end' ? 32 : left
    const rightRank = right === 'month_end' ? 32 : right
    return leftRank - rightRank
  })
}

export function getInterestRateFromRules(
  principal: number,
  gives: number,
  rules: LoanInterestRulesConfig = defaultLoanInterestRules,
) {
  const band = principal <= rules.thresholdAmount ? rules.smallLoanRates : rules.largeLoanRates

  if (gives <= 1) {
    return band.oneGive
  }

  if (gives === 2) {
    return band.twoGives
  }

  return band.threePlusGives
}

export function buildLoanDueDates(
  gives: number,
  paymentFrequency: PaymentFrequency,
  paymentDays: string[],
  firstPaymentDate: string,
) {
  const normalizedPaymentDays = normalizePaymentDays(paymentFrequency, paymentDays)
  const firstDate = parseDateOnly(firstPaymentDate)

  const firstPaymentMatches = normalizedPaymentDays.some((paymentDay) =>
    sameDay(firstDate, resolveMonthDate(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), paymentDay)),
  )

  if (!firstPaymentMatches) {
    throw new Error('First payment date must match one of the selected payment days')
  }

  const dueDates = [firstDate]
  let cursor = firstDate
  let cursorYear = firstDate.getUTCFullYear()
  let cursorMonth = firstDate.getUTCMonth()

  while (dueDates.length < gives) {
    const monthDates = normalizedPaymentDays
      .map((paymentDay) => resolveMonthDate(cursorYear, cursorMonth, paymentDay))
      .filter((date) => date.getTime() > cursor.getTime())
      .filter((date, index, dates) => dates.findIndex((candidate) => sameDay(candidate, date)) === index)
      .sort((left, right) => left.getTime() - right.getTime())

    for (const dueDate of monthDates) {
      dueDates.push(dueDate)
      cursor = dueDate

      if (dueDates.length === gives) {
        return dueDates
      }
    }

    cursorMonth += 1
    if (cursorMonth > 11) {
      cursorMonth = 0
      cursorYear += 1
    }
  }

  return dueDates
}

export function buildLoanSchedule(
  principal: number,
  interestRate: number,
  dueDates: Date[],
): LoanSchedulePreviewRow[] {
  const cutoffRate = interestRate / 100
  const gives = dueDates.length
  const amortizedPayment = cutoffRate === 0
    ? principal / gives
    : (principal * cutoffRate * (1 + cutoffRate) ** gives) / ((1 + cutoffRate) ** gives - 1)

  const rows: LoanSchedulePreviewRow[] = []
  let balance = roundCurrency(principal)

  dueDates.forEach((dueDate, index) => {
    const sequence = index + 1
    const beginningBalance = balance
    const interest = roundCurrency(beginningBalance * cutoffRate)

    if (sequence === gives) {
      const principalPaid = roundCurrency(beginningBalance)
      const totalPayment = roundCurrency(principalPaid + interest)
      rows.push({
        sequence,
        dueDate: dueDate.toISOString(),
        beginningBalance,
        interest,
        principalPaid,
        endingBalance: 0,
        totalPayment,
      })
      balance = 0
      return
    }

    const totalPayment = roundCurrency(amortizedPayment)
    const principalPaid = roundCurrency(totalPayment - interest)
    const endingBalance = roundCurrency(Math.max(0, beginningBalance - principalPaid))

    rows.push({
      sequence,
      dueDate: dueDate.toISOString(),
      beginningBalance,
      interest,
      principalPaid,
      endingBalance,
      totalPayment,
    })

    balance = endingBalance
  })

  return rows
}
