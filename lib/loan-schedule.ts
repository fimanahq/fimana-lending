import { defaultLoanInterestRules } from '@/content/rules'
import type {
  LoanCalculationMethod,
  LoanInterestRulesConfig,
  LoanSchedulePreviewRow,
  PaymentFrequency,
  PostInterestOnlyMethod,
  SimpleInterestMethod,
} from '@/lib/types'

export const paymentDayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1)).concat('month_end')
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export function buildPaymentDays(
  paymentFrequency: PaymentFrequency,
  firstDay: string,
  secondDay: string,
) {
  if (paymentFrequency === 'monthly') {
    return [firstDay]
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

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function toDateOnlyFromLocalDate(value: Date) {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 12))
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

  if (paymentFrequency === 'semi_monthly' && unique.length !== 2) {
    throw new Error('Semi-monthly schedule requires exactly two payment days')
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

export function getRecommendedFirstPaymentDate(
  paymentFrequency: PaymentFrequency,
  paymentDays: string[],
  options: {
    fromDate?: Date
    minimumLeadDays?: number
  } = {},
) {
  const normalizedPaymentDays = normalizePaymentDays(paymentFrequency, paymentDays)
  const minimumLeadDays = options.minimumLeadDays ?? 15
  const anchorDate = toDateOnlyFromLocalDate(options.fromDate ?? new Date())
  let cursorYear = anchorDate.getUTCFullYear()
  let cursorMonth = anchorDate.getUTCMonth()

  while (true) {
    const monthDates = normalizedPaymentDays
      .map((paymentDay) => resolveMonthDate(cursorYear, cursorMonth, paymentDay))
      .filter((date) => date.getTime() >= anchorDate.getTime())
      .filter((date, index, dates) => dates.findIndex((candidate) => sameDay(candidate, date)) === index)
      .sort((left, right) => left.getTime() - right.getTime())

    for (const dueDate of monthDates) {
      const leadDays = Math.round((dueDate.getTime() - anchorDate.getTime()) / DAY_IN_MILLISECONDS)
      if (leadDays >= minimumLeadDays) {
        return formatDateOnly(dueDate)
      }
    }

    cursorMonth += 1
    if (cursorMonth > 11) {
      cursorMonth = 0
      cursorYear += 1
    }
  }
}

export function getBorrowerRequestSemiMonthlyFirstPaymentDate(
  options: {
    fromDate?: Date
    minimumLeadDays?: number
  } = {},
) {
  const minimumLeadDays = options.minimumLeadDays ?? 15
  const anchorDate = toDateOnlyFromLocalDate(options.fromDate ?? new Date())
  const year = anchorDate.getUTCFullYear()
  const month = anchorDate.getUTCMonth()

  const fifteenth = resolveMonthDate(year, month, 15)
  const monthEnd = resolveMonthDate(year, month, 'month_end')
  const daysToFifteenth = Math.round((fifteenth.getTime() - anchorDate.getTime()) / DAY_IN_MILLISECONDS)
  const daysToMonthEnd = Math.round((monthEnd.getTime() - anchorDate.getTime()) / DAY_IN_MILLISECONDS)

  if (fifteenth.getTime() >= anchorDate.getTime() && daysToFifteenth >= minimumLeadDays) {
    return formatDateOnly(fifteenth)
  }

  if (monthEnd.getTime() >= anchorDate.getTime() && daysToMonthEnd >= minimumLeadDays) {
    return formatDateOnly(monthEnd)
  }

  const nextMonth = month === 11 ? 0 : month + 1
  const nextMonthYear = month === 11 ? year + 1 : year
  return formatDateOnly(resolveMonthDate(nextMonthYear, nextMonth, 15))
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

export function buildFlatRateSchedule(
  principal: number,
  interestRate: number,
  dueDates: Date[],
): LoanSchedulePreviewRow[] {
  const cutoffRate = interestRate / 100
  const gives = dueDates.length
  const interestPerInstallment = roundCurrency(principal * cutoffRate)
  const regularPayment = roundCurrency((principal + (interestPerInstallment * gives)) / gives)
  const rows: LoanSchedulePreviewRow[] = []
  let balance = roundCurrency(principal)

  dueDates.forEach((dueDate, index) => {
    const sequence = index + 1
    const beginningBalance = balance
    const principalPaid = sequence === gives
      ? roundCurrency(beginningBalance)
      : roundCurrency(Math.max(0, regularPayment - interestPerInstallment))
    const endingBalance = sequence === gives
      ? 0
      : roundCurrency(Math.max(0, beginningBalance - principalPaid))
    const totalPayment = sequence === gives
      ? roundCurrency(principalPaid + interestPerInstallment)
      : regularPayment

    rows.push({
      sequence,
      dueDate: dueDate.toISOString(),
      beginningBalance,
      interest: interestPerInstallment,
      principalPaid,
      endingBalance,
      totalPayment,
    })
    balance = endingBalance
  })

  return rows
}

export function buildInterestOnlySchedule(
  principal: number,
  interestRate: number,
  dueDates: Date[],
  interestOnlyPeriod: number,
  postInterestOnlyMethod: PostInterestOnlyMethod,
): LoanSchedulePreviewRow[] {
  if (!Number.isInteger(interestOnlyPeriod) || interestOnlyPeriod < 0 || interestOnlyPeriod >= dueDates.length) {
    throw new Error('Interest-only cutoffs must be less than the number of gives')
  }

  const interestPerInstallment = roundCurrency(principal * (interestRate / 100))

  if (postInterestOnlyMethod === 'amortizing') {
    const interestOnlyRows = dueDates.slice(0, interestOnlyPeriod).map((dueDate, index) => ({
      sequence: index + 1,
      dueDate: dueDate.toISOString(),
      beginningBalance: roundCurrency(principal),
      interest: interestPerInstallment,
      principalPaid: 0,
      endingBalance: roundCurrency(principal),
      totalPayment: interestPerInstallment,
    }))
    const amortizedRows = buildLoanSchedule(
      principal,
      interestRate,
      dueDates.slice(interestOnlyPeriod),
    ).map((row) => ({
      ...row,
      sequence: row.sequence + interestOnlyPeriod,
    }))

    return [...interestOnlyRows, ...amortizedRows]
  }

  return dueDates.map((dueDate, index) => {
    const sequence = index + 1
    const isFinalInstallment = sequence === dueDates.length
    const principalPaid = isFinalInstallment ? roundCurrency(principal) : 0

    return {
      sequence,
      dueDate: dueDate.toISOString(),
      beginningBalance: roundCurrency(principal),
      interest: interestPerInstallment,
      principalPaid,
      endingBalance: isFinalInstallment ? 0 : roundCurrency(principal),
      totalPayment: roundCurrency(interestPerInstallment + principalPaid),
    }
  })
}

export function buildSimpleInterestSchedule(
  principal: number,
  interestRate: number,
  dueDates: Date[],
  simpleInterestMethod: SimpleInterestMethod,
): LoanSchedulePreviewRow[] {
  const periodRate = interestRate / 100
  const gives = dueDates.length
  const rows: LoanSchedulePreviewRow[] = []
  let balance = roundCurrency(principal)
  const equalPrincipalAmount = roundCurrency(principal / gives)
  const equalPaymentAmount = roundCurrency((principal + (principal * periodRate * gives)) / gives)

  dueDates.forEach((dueDate, index) => {
    const sequence = index + 1
    const beginningBalance = balance
    const interest = roundCurrency(beginningBalance * periodRate)
    const isFinalInstallment = sequence === gives
    const principalPaid = isFinalInstallment
      ? roundCurrency(beginningBalance)
      : simpleInterestMethod === 'equal_principal'
        ? Math.min(beginningBalance, equalPrincipalAmount)
        : roundCurrency(Math.max(0, equalPaymentAmount - interest))
    const endingBalance = isFinalInstallment
      ? 0
      : roundCurrency(Math.max(0, beginningBalance - principalPaid))
    const totalPayment = simpleInterestMethod === 'equal_principal' || isFinalInstallment
      ? roundCurrency(principalPaid + interest)
      : equalPaymentAmount

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

export function buildScheduleForCalculationMethod(params: {
  principal: number
  interestRate: number
  dueDates: Date[]
  calculationMethod: LoanCalculationMethod
  interestOnlyPeriod: number
  postInterestOnlyMethod: PostInterestOnlyMethod
  simpleInterestMethod: SimpleInterestMethod
}): LoanSchedulePreviewRow[] {
  if (params.calculationMethod === 'flat_rate') {
    return buildFlatRateSchedule(params.principal, params.interestRate, params.dueDates)
  }

  if (params.calculationMethod === 'interest_only') {
    return buildInterestOnlySchedule(
      params.principal,
      params.interestRate,
      params.dueDates,
      params.interestOnlyPeriod,
      params.postInterestOnlyMethod,
    )
  }

  if (params.calculationMethod === 'simple_interest') {
    return buildSimpleInterestSchedule(
      params.principal,
      params.interestRate,
      params.dueDates,
      params.simpleInterestMethod,
    )
  }

  return buildLoanSchedule(params.principal, params.interestRate, params.dueDates)
}
