import { buildLoanSchedule } from '@/lib/loan-schedule'

export type LoanAmountTier = 'small' | 'mid' | 'large'
export type CutoffRange = 'one' | 'two' | 'threeToFour' | 'fiveToSix' | 'sevenToEight' | 'nineToTen' | 'elevenToTwelve' | 'thirteenToFourteen' | 'fifteenToSixteen'
export type RateBasis = 'standard' | 'preferred_borrower' | 'low_risk_borrower' | 'relationship_rate'

type AutoPricingTableRow = {
  cutoffRange: CutoffRange
  cutoffRangeLabel: string
  minCutoffs: number
  maxCutoffs: number
  rates: Record<LoanAmountTier, number>
}

const amountTierLabels: Record<LoanAmountTier, string> = {
  small: 'Small (₱1,000-₱10,000)',
  mid: 'Mid (₱10,001-₱20,000)',
  large: 'Large (₱20,001-₱50,000)',
}

export const rateReductionOptions: Array<{
  label: string
  value: RateBasis
  reduction: number
}> = [
  { label: 'Standard', value: 'standard', reduction: 0 },
  { label: 'Preferred borrower', value: 'preferred_borrower', reduction: 0.5 },
  { label: 'Low-risk borrower', value: 'low_risk_borrower', reduction: 1 },
  { label: 'Approved relationship rate', value: 'relationship_rate', reduction: 1.5 },
]

export const autoPricingTable: AutoPricingTableRow[] = [
  {
    cutoffRange: 'one',
    cutoffRangeLabel: '1 cutoff',
    minCutoffs: 1,
    maxCutoffs: 1,
    rates: { small: 10, mid: 10, large: 9 },
  },
  {
    cutoffRange: 'two',
    cutoffRangeLabel: '2 cutoffs',
    minCutoffs: 2,
    maxCutoffs: 2,
    rates: { small: 9, mid: 9, large: 8 },
  },
  {
    cutoffRange: 'threeToFour',
    cutoffRangeLabel: '3-4 cutoffs',
    minCutoffs: 3,
    maxCutoffs: 4,
    rates: { small: 8, mid: 7.5, large: 7 },
  },
  {
    cutoffRange: 'fiveToSix',
    cutoffRangeLabel: '5-6 cutoffs',
    minCutoffs: 5,
    maxCutoffs: 6,
    rates: { small: 7.5, mid: 7.5, large: 6.5 },
  },
  {
    cutoffRange: 'sevenToEight',
    cutoffRangeLabel: '7-8 cutoffs',
    minCutoffs: 7,
    maxCutoffs: 8,
    rates: { small: 7.5, mid: 7.5, large: 6 },
  },
  {
    cutoffRange: 'nineToTen',
    cutoffRangeLabel: '9-10 cutoffs',
    minCutoffs: 9,
    maxCutoffs: 10,
    rates: { small: 7.5, mid: 7.5, large: 5.5 },
  },
  {
    cutoffRange: 'elevenToTwelve',
    cutoffRangeLabel: '11-12 cutoffs',
    minCutoffs: 11,
    maxCutoffs: 12,
    rates: { small: 6, mid: 6, large: 5 },
  },
  {
    cutoffRange: 'thirteenToFourteen',
    cutoffRangeLabel: '13-14 cutoffs',
    minCutoffs: 13,
    maxCutoffs: 14,
    rates: { small: 5, mid: 5, large: 5 },
  },
  {
    cutoffRange: 'fifteenToSixteen',
    cutoffRangeLabel: '15-16 cutoffs',
    minCutoffs: 15,
    maxCutoffs: 16,
    rates: { small: 5, mid: 5, large: 5 },
  },
]

export function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

export function getLoanAmountTier(amount: number) {
  if (!Number.isFinite(amount)) {
    throw new Error('Enter a valid loan amount')
  }

  if (amount < 1000) {
    throw new Error('Automatic pricing supports loan amounts from ₱1,000 to ₱50,000.')
  }

  if (amount <= 10000) {
    return 'small' satisfies LoanAmountTier
  }

  if (amount <= 20000) {
    return 'mid' satisfies LoanAmountTier
  }

  if (amount <= 50000) {
    return 'large' satisfies LoanAmountTier
  }

  throw new Error('Loan amounts above ₱50,000 require manual approval and are not auto-calculated yet.')
}

export function getCutoffRange(cutoffs: number) {
  if (!Number.isInteger(cutoffs)) {
    throw new Error('Cutoffs must be a whole number from 1 to 16.')
  }

  const cutoffRange = autoPricingTable.find(
    (row) => cutoffs >= row.minCutoffs && cutoffs <= row.maxCutoffs,
  )

  if (!cutoffRange) {
    throw new Error('Automatic pricing supports 1 to 16 cutoffs only.')
  }

  return cutoffRange
}

export function getAutoRate(amount: number, cutoffs: number) {
  const amountTier = getLoanAmountTier(amount)
  const cutoffRange = getCutoffRange(cutoffs)

  return {
    amountTier,
    amountTierLabel: amountTierLabels[amountTier],
    cutoffRange: cutoffRange.cutoffRange,
    cutoffRangeLabel: cutoffRange.cutoffRangeLabel,
    selectedRate: cutoffRange.rates[amountTier],
  }
}

export function getRateReductionAdjustment(rateBasis: RateBasis) {
  const option = rateReductionOptions.find((candidate) => candidate.value === rateBasis)

  if (!option) {
    return rateReductionOptions[0]
  }

  return option
}

export function applyRateBasis(baseRate: number, rateBasis: RateBasis) {
  const adjustment = getRateReductionAdjustment(rateBasis)

  return {
    rateBasis: adjustment.value,
    rateBasisLabel: adjustment.label,
    baseRate,
    rateReduction: adjustment.reduction,
    selectedRate: Math.max(5, roundCurrency(baseRate - adjustment.reduction)),
  }
}

function sumCurrency(values: number[]) {
  return roundCurrency(values.reduce((sum, value) => sum + value, 0))
}

export function calculateReducingBalanceLoan(params: {
  principal: number
  cutoffs: number
  dueDates: Date[]
  rateBasis: RateBasis
}) {
  const autoPricing = getAutoRate(params.principal, params.cutoffs)
  const rateDetails = applyRateBasis(autoPricing.selectedRate, params.rateBasis)
  const schedule = buildLoanSchedule(params.principal, rateDetails.selectedRate, params.dueDates)
  const totalInterest = sumCurrency(schedule.map((row) => row.interest))
  const totalPayable = roundCurrency(params.principal + totalInterest)
  const paymentPerCutoff = params.cutoffs > 0
    ? roundCurrency(totalPayable / params.cutoffs)
    : 0

  return {
    ...autoPricing,
    ...rateDetails,
    totalInterest,
    totalPayable,
    paymentPerCutoff,
    schedule,
  }
}
