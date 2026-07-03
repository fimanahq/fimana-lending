import { buildLoanSchedule } from '@/lib/loan-schedule'
import {
  MAX_AUTO_CUTOFFS,
  MAX_AUTO_LOAN_AMOUNT,
  MIN_ADJUSTED_RATE,
  MIN_AUTO_CUTOFFS,
  MIN_AUTO_LOAN_AMOUNT,
  autoPricingTable,
  loanAmountTiers,
  rateReductionOptions,
  type RateBasis,
} from '@/content/calculator-pricing'

export function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

export function getLoanAmountTier(amount: number) {
  if (!Number.isFinite(amount)) {
    throw new Error('Enter a valid loan amount')
  }

  if (amount < MIN_AUTO_LOAN_AMOUNT) {
    throw new Error('Automatic pricing supports loan amounts from ₱1,000 to ₱50,000.')
  }

  if (amount > MAX_AUTO_LOAN_AMOUNT) {
    throw new Error('Loan amounts above ₱50,000 require manual approval and are not auto-calculated yet.')
  }

  const amountTier = loanAmountTiers.find(
    (tier) => amount >= tier.minAmount && amount <= tier.maxAmount,
  )

  if (amountTier) {
    return amountTier.value
  }

  throw new Error('Unable to determine the loan amount tier.')
}

export function getCutoffRange(cutoffs: number) {
  if (!Number.isInteger(cutoffs)) {
    throw new Error('Cutoffs must be a whole number from 1 to 16.')
  }

  const cutoffRange = autoPricingTable.find(
    (row) => cutoffs >= row.minCutoffs && cutoffs <= row.maxCutoffs,
  )

  if (!cutoffRange || cutoffs < MIN_AUTO_CUTOFFS || cutoffs > MAX_AUTO_CUTOFFS) {
    throw new Error('Automatic pricing supports 1 to 16 cutoffs only.')
  }

  return cutoffRange
}

export function getAutoRate(amount: number, cutoffs: number) {
  const amountTier = getLoanAmountTier(amount)
  const cutoffRange = getCutoffRange(cutoffs)
  const amountTierConfig = loanAmountTiers.find((tier) => tier.value === amountTier)

  return {
    amountTier,
    amountTierLabel: amountTierConfig
      ? `${amountTierConfig.label} (${amountTierConfig.rangeLabel})`
      : amountTier,
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
    selectedRate: Math.max(MIN_ADJUSTED_RATE, roundCurrency(baseRate - adjustment.reduction)),
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
