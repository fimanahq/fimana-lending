export type LoanAmountTier = 'small' | 'mid' | 'large'
export type CutoffRange = 'one' | 'two' | 'threeToFour' | 'fiveToSix' | 'sevenToEight' | 'nineToTen' | 'elevenToTwelve' | 'thirteenToFourteen' | 'fifteenToSixteen'
export type RateBasis = 'standard' | 'preferred_borrower' | 'low_risk_borrower' | 'relationship_rate'

export const MIN_AUTO_LOAN_AMOUNT = 1000
export const MAX_AUTO_LOAN_AMOUNT = 50000
export const MIN_AUTO_CUTOFFS = 1
export const MAX_AUTO_CUTOFFS = 16
export const MIN_ADJUSTED_RATE = 5

export const loanAmountTiers: Array<{
  value: LoanAmountTier
  label: string
  rangeLabel: string
  minAmount: number
  maxAmount: number
}> = [
  { value: 'small', label: 'Small', rangeLabel: '₱1,000-₱10,000', minAmount: 1000, maxAmount: 10000 },
  { value: 'mid', label: 'Mid', rangeLabel: '₱10,001-₱20,000', minAmount: 10001, maxAmount: 20000 },
  { value: 'large', label: 'Large', rangeLabel: '₱20,001-₱50,000', minAmount: 20001, maxAmount: 50000 },
]

export const rateReductionOptions: Array<{
  label: string
  value: RateBasis
  reduction: number
  guidance: string
}> = [
  {
    label: 'Standard',
    value: 'standard',
    reduction: 0,
    guidance: 'Default pricing from the loan amount and cutoff table.',
  },
  {
    label: 'Preferred borrower',
    value: 'preferred_borrower',
    reduction: 0.5,
    guidance: 'Repeat borrower with a good repayment history and no recent late payments.',
  },
  {
    label: 'Low-risk borrower',
    value: 'low_risk_borrower',
    reduction: 1,
    guidance: 'Verified stable income, strong repayment capacity, and consistently good payment history.',
  },
  {
    label: 'Approved relationship rate',
    value: 'relationship_rate',
    reduction: 1.5,
    guidance: 'Special relationship pricing with explicit owner or manager approval.',
  },
]

export const autoPricingTable: Array<{
  cutoffRange: CutoffRange
  cutoffRangeLabel: string
  minCutoffs: number
  maxCutoffs: number
  rates: Record<LoanAmountTier, number>
}> = [
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
