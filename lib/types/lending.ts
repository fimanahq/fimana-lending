import type { PaymentFrequency, SettingsCurrency } from './shared'

export type LoanApplicationPaymentType = PaymentFrequency
export type LoanCalculationMethod =
  | 'reducing_balance'
  | 'flat_rate'
  | 'interest_only'
  | 'simple_interest'
  | 'fixed_total_interest'
export type PostInterestOnlyMethod = 'bullet' | 'amortizing'
export type SimpleInterestMethod = 'equal_principal' | 'equal_payment'
export type LoanApplicationCutoffPatternCode = '5_20' | '15_month_end'
export type LoanApplicationSource = 'internal' | 'public'
export type LoanStatus = 'pending_disbursement' | 'active' | 'completed' | 'cancelled'
export type LoanInstallmentStatus = 'pending' | 'partial' | 'paid'
export type LoanDisbursementMethod = 'cash' | 'bank_transfer' | 'ewallet' | 'check' | 'internal_transfer' | 'general'
export type LoanPaymentMethod = 'cash' | 'bank_transfer' | 'ewallet' | 'internal_offset'
export type LoanPaymentAllocationStatus = 'unallocated' | 'partially_allocated' | 'fully_allocated'
export type LoanPaymentStatus = 'posted' | 'reversed'
export type LoanAdjustmentStatus = 'posted'
export type LoanAdjustmentType =
  | 'payment_adjustment'
  | 'balance_adjustment'
  | 'schedule_adjustment'
  | 'rounding_adjustment'
export type LoanAdjustmentComponent =
  | 'principal'
  | 'interest'
  | 'penalty'
  | 'fees'
  | 'total'
export type LoanAdjustmentDirection = 'increase' | 'decrease'
export type LoanScheduleRowStatus = 'pending' | 'partial' | 'paid' | 'cancelled'
export type LoanApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'withdrawn'
  | 'expired'
export type LoanApplicationRecordStatus = LoanApplicationStatus | 'pending'
export type InterestMode = 'rules' | 'manual'
export type DashboardReceivableStatus = 'overdue' | 'current' | 'upcoming' | 'paid'

export interface LoanInterestRulesConfig {
  thresholdAmount: number
  smallLoanRates: {
    oneGive: number
    twoGives: number
    threePlusGives: number
  }
  largeLoanRates: {
    oneGive: number
    twoGives: number
    threePlusGives: number
  }
}

export interface LoanSchedulePreviewRow {
  sequence: number
  dueDate: string
  beginningBalance: number
  interest: number
  principalPaid: number
  endingBalance: number
  totalPayment: number
}

export interface Borrower {
  id: string
  borrowerNumber: string
  fullName: string
  contactNumber: string
  email: string
  address: string
  employmentOrIncomeSource: string
  income: number | null
  notes: string
  status: 'active' | 'inactive' | 'blacklisted'
  createdAt: string
  updatedAt?: string
}

export interface LoanBorrower {
  _id: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone?: string
}

export interface LoanInstallment {
  _id: string
  sequence: number
  dueDate: string
  beginningBalance: number
  interest: number
  principalPaid: number
  endingBalance: number
  totalPayment: number
  status: LoanInstallmentStatus
  paidAt?: string | null
  paidAmount: number
}

export interface LoanRecordBorrower {
  id: string
  borrowerNumber: string
  displayName: string
  mobileNumber: string
  email: string
}

export interface LoanRecordProduct {
  id: string
  code: string
  name: string
  currency: string
  productType: string
  version: number
  matchedPricingRuleId: string | null
}

export interface LoanRecordBalances {
  principalOutstandingAmountMinor: number
  interestOutstandingAmountMinor: number
  penaltyOutstandingAmountMinor: number
  totalOutstandingAmountMinor: number
  principalPaidAmountMinor: number
  interestPaidAmountMinor: number
  penaltyPaidAmountMinor: number
  totalPaidAmountMinor: number
}

export interface LoanDisbursementDeduction {
  code: string
  description: string
  amountMinor: number
}

export interface LoanDisbursementRecord {
  disbursedAt?: string | null
  releaseAmountMinor: number
  deductions: LoanDisbursementDeduction[]
  totalDeductionsAmountMinor: number
  netReleasedAmountMinor: number
  releaseMethod?: LoanDisbursementMethod | null
  referenceNo: string
  notes: string
}

export interface LoanScheduleRow {
  id: string
  sequence: number
  dueDate: string
  openingPrincipalBalanceMinor: number
  scheduledPrincipalAmountMinor: number
  scheduledInterestAmountMinor: number
  scheduledPenaltyAmountMinor: number
  scheduledTotalAmountMinor: number
  paidPrincipalAmountMinor: number
  paidInterestAmountMinor: number
  paidPenaltyAmountMinor: number
  paidTotalAmountMinor: number
  outstandingPrincipalAmountMinor: number
  outstandingInterestAmountMinor: number
  outstandingPenaltyAmountMinor: number
  outstandingTotalAmountMinor: number
  closingPrincipalBalanceMinor: number
  status: LoanScheduleRowStatus
  lastAppliedPaymentAt?: string | null
  closedAt?: string | null
}

export interface LoanRecord {
  id: string
  loanNumber: string
  loanApplicationId: string
  borrowerId: string
  loanProductId: string
  borrower: LoanRecordBorrower
  loanProduct: LoanRecordProduct
  status: LoanStatus
  principalAmountMinor: number
  disbursedAmountMinor: number
  installmentCount: number
  interestRate: number
  paymentFrequency: LoanApplicationPaymentType
  paymentDays: string[]
  firstDueDate: string
  nextDueDate?: string | null
  maturityDate: string
  totalInterestAmountMinor: number
  totalPenaltyAmountMinor: number
  totalProfitAmountMinor: number
  balances: LoanRecordBalances
  disbursement: LoanDisbursementRecord
  createdAt: string
  updatedAt?: string | null
  scheduleVersion: number
  schedule?: LoanScheduleRow[]
}

export interface LoanPaymentQueueItem {
  loanId: string
  loanNumber: string
  borrowerId: string
  borrowerNumber: string
  borrowerDisplayName: string
  currency: string
  nextDueDate?: string | null
  totalOutstandingAmountMinor: number
  status: LoanStatus
}

export interface LoanPaymentAllocation {
  loanScheduleId: string
  sequence: number
  principalAmountMinor: number
  interestAmountMinor: number
  penaltyAmountMinor: number
  totalAmountMinor: number
}

export interface LoanPaymentHistory {
  id: string
  loanId: string
  borrowerId: string
  receiptNumber: string
  paymentDate: string
  postedAt: string
  amountMinor: number
  currency: string
  method: LoanPaymentMethod
  referenceNo: string
  allocationStatus: LoanPaymentAllocationStatus
  allocations: LoanPaymentAllocation[]
  unallocatedAmountMinor: number
  status: LoanPaymentStatus
}

export interface LoanPaymentDetail {
  loan: LoanRecord
  payments: LoanPaymentHistory[]
}

export interface PostLoanPaymentInput {
  paymentDate: string
  amountMinor: number
  method: LoanPaymentMethod
  referenceNo?: string
}

export interface UpdateLoanPaymentInput {
  paymentDate: string
  amountMinor: number
  method: LoanPaymentMethod
  referenceNo?: string
}

export interface LoanPaymentPostResponse {
  payment: LoanPaymentHistory
  payments: LoanPaymentHistory[]
  loan: LoanRecord
  updatedScheduleRows: LoanScheduleRow[]
}

export interface LoanAdjustmentAllocation {
  loanScheduleId: string
  sequence: number
  principalAmountMinor: number
  interestAmountMinor: number
  penaltyAmountMinor: number
  totalAmountMinor: number
}

export interface LoanAdjustmentRecord {
  id: string
  loanId: string
  borrowerId: string
  adjustmentDate: string
  postedAt: string
  amountMinor: number
  currency: string
  reason: string
  notes: string
  type: LoanAdjustmentType
  component: LoanAdjustmentComponent
  direction: LoanAdjustmentDirection
  isSystemGenerated: boolean
  relatedPaymentId?: string | null
  scheduleRowId?: string | null
  penaltyRateBps?: number | null
  allocations: LoanAdjustmentAllocation[]
  status: LoanAdjustmentStatus
}

export interface LoanAdjustmentDetail {
  loan: LoanRecord
  adjustments: LoanAdjustmentRecord[]
}

export interface PostLoanAdjustmentInput {
  adjustmentDate: string
  amountMinor: number
  reason: string
  notes?: string
  scheduleRowId?: string
  penaltyRateBps?: number
  type?: LoanAdjustmentType
  component?: LoanAdjustmentComponent
  direction?: LoanAdjustmentDirection
}

export interface UpdateLoanAdjustmentInput {
  adjustmentDate: string
  amountMinor: number
  reason: string
  notes?: string
  scheduleRowId?: string
  penaltyRateBps?: number
  type?: LoanAdjustmentType
  component?: LoanAdjustmentComponent
  direction?: LoanAdjustmentDirection
}

export interface LoanAdjustmentPostResponse {
  adjustment: LoanAdjustmentRecord
  loan: LoanRecord
  updatedScheduleRows: LoanScheduleRow[]
}

export interface Loan {
  _id: string
  userId: string
  contactId: string
  borrower: LoanBorrower | null
  principal: number
  currency: string
  gives: number
  paymentFrequency: PaymentFrequency
  paymentDays: string[]
  firstPaymentDate: string
  interestRate: number
  totalInterest: number
  totalPayment: number
  status: LoanStatus
  notes?: string
  installments: LoanInstallment[]
  createdAt: string
  updatedAt?: string
}

export interface DashboardCutoffReceivableLoan {
  loanId: string
  loanNumber: string
  borrowerId: string
  borrowerDisplayName: string
  borrowerNumber: string
  principalDueMinor: number
  interestDueMinor: number
  penaltyDueMinor: number
  totalReceivableMinor: number
  totalCollectedMinor: number
  remainingMinor: number
}

export interface DashboardCutoffReceivable {
  cutoffDate: string
  principalDueMinor: number
  interestDueMinor: number
  penaltyDueMinor: number
  totalReceivableMinor: number
  principalCollectedMinor: number
  interestCollectedMinor: number
  penaltyCollectedMinor: number
  totalCollectedMinor: number
  remainingMinor: number
  borrowerCount: number
  loanCount: number
  status: DashboardReceivableStatus
  loans: DashboardCutoffReceivableLoan[]
}

export interface LoanDashboardSummary {
  currency: SettingsCurrency
  startingCapitalMinor: number
  collectedInterestMinor: number
  collectedPenaltyMinor: number
  collectedProfitMinor: number
  activeCollectedInterestMinor: number
  activeCollectedPenaltyMinor: number
  activeCollectedProfitMinor: number
  collectedProfitVsCapitalBps: number
  projectedProfitVsCapitalBps: number
  currentCapitalBasisMinor: number
  cashOnHandMinor: number
  outstandingPrincipalMinor: number
  moneyWithBorrowersMinor: number
  nextCutoffReceivableMinor: number
  overdueReceivableMinor: number
  overduePrincipalMinor: number
  overdueInterestMinor: number
  overduePenaltyMinor: number
  overdueLoanCount: number
  overdueBorrowerCount: number
  oldestUnpaidDueDate: string | null
  remainingProjectedInterestMinor: number
  outstandingPenaltyMinor: number
  remainingProjectedProfitMinor: number
  totalProjectedInterestMinor: number
  totalPenaltyMinor: number
  totalProjectedProfitMinor: number
  ownerLoanInterestExcluded: boolean
  ownerLoanInterestExcludedAmountMinor: number
  profitOutlookCollectedInterestMinor: number
  profitOutlookCollectedPenaltyMinor: number
  profitOutlookCollectedProfitMinor: number
  profitOutlookRemainingProjectedInterestMinor: number
  profitOutlookOutstandingPenaltyMinor: number
  profitOutlookRemainingProjectedProfitMinor: number
  profitOutlookTotalProjectedInterestMinor: number
  profitOutlookTotalPenaltyMinor: number
  profitOutlookTotalProjectedProfitMinor: number
  profitOutlookCollectedProfitVsCapitalBps: number
  profitOutlookProjectedProfitVsCapitalBps: number
  activeLoanCount: number
  currentCutoffReceivable: DashboardCutoffReceivable | null
  receivableByCutoff: DashboardCutoffReceivable[]
}

export interface LoanApplication {
  id: string
  applicationNumber?: string
  borrowerId?: string
  loanProductId?: string | null
  borrower?: LoanApplicationBorrower
  loanProduct?: LoanApplicationProductSnapshot | null
  loanAmountMinor?: number
  numberOfCutoffs?: number
  startDate?: string
  paymentType?: LoanApplicationPaymentType
  cutoffPatternCode?: LoanApplicationCutoffPatternCode | null
  purpose?: string
  source?: LoanApplicationSource
  computedPreviewSnapshot?: LoanApplicationComputedPreviewSnapshot | null
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  principal?: number
  gives?: number
  paymentFrequency?: PaymentFrequency
  paymentDays: string[]
  firstPaymentDate?: string
  interestRate?: number | null
  calculationMethod?: LoanCalculationMethod | string | null
  interestOnlyPeriod?: number | null
  postInterestOnlyMethod?: PostInterestOnlyMethod | string | null
  simpleInterestMethod?: SimpleInterestMethod | string | null
  notes?: string
  status: LoanApplicationRecordStatus
  previewSnapshot?: LoanApplicationPreviewSnapshot | null
  decisionNotes?: string | null
  approvalNotes?: string
  rejectionReason?: string
  reviewerRemarks?: string
  createdAt: string
  updatedAt?: string
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewedBy?: string | null
  contactId?: string | null
  loanId?: string | null
}

export interface LoanApplicationBorrower {
  id: string
  borrowerNumber: string
  displayName: string
  mobileNumber: string
  email: string
  income?: number | null
}

export interface LoanApplicationProductSnapshot {
  id: string
  code: string
  name: string
  currency: string
  productType: string
  version: number
  matchedPricingRuleId: string | null
}

export interface LoanApplicationComputedPreviewInstallment {
  sequence: number
  dueDate: string
  principalAmountMinor: number
  interestAmountMinor: number
  totalAmountMinor: number
  closingPrincipalBalanceMinor: number
}

export interface LoanApplicationComputedPreviewSnapshot {
  currency: string
  principalAmountMinor: number
  processingFeeAmountMinor: number
  netDisbursementAmountMinor: number
  totalPrincipalAmountMinor: number
  totalInterestAmountMinor: number
  totalPaymentAmountMinor: number
  installmentCount: number
  frequency: LoanApplicationPaymentType
  paymentDays: string[]
  firstDueDate: string
  maturityDate: string
  interestRate?: number | null
  interestConfig: {
    method: string
    rateBps: number
    ratePeriod: string
    roundingMode: string
    interestOnlyPeriod?: number | null
    postInterestOnlyMethod?: string | null
    simpleInterestMethod?: string | null
  }
  processingFeeConfig: {
    mode: string
    fixedAmountMinor?: number | null
    rateBps?: number | null
    deductFromDisbursement: boolean
  }
  cutoffPatternCode: LoanApplicationCutoffPatternCode | null
  matchedPricingRuleId: string
  generatedAt: string
  installments: LoanApplicationComputedPreviewInstallment[]
}

export interface LoanApplicationDraftInput {
  borrowerId: string
  loanProductId?: string
  loanAmountMinor: number
  numberOfCutoffs: number
  startDate: string
  paymentType: LoanApplicationPaymentType
  paymentDays: string[]
  cutoffPatternCode?: LoanApplicationCutoffPatternCode | null
  interestRate?: number | null
  calculationMethod?: LoanCalculationMethod
  interestOnlyPeriod?: number | null
  postInterestOnlyMethod?: PostInterestOnlyMethod | null
  simpleInterestMethod?: SimpleInterestMethod | null
  purpose?: string
}

export interface LoanApplicationPreviewSnapshot {
  currency?: string
  principal: number
  gives: number
  paymentFrequency: PaymentFrequency
  paymentDays: string[]
  firstPaymentDate: string
  interestRate?: number
  calculationMethod?: LoanCalculationMethod | string | null
  interestOnlyPeriod?: number | null
  postInterestOnlyMethod?: PostInterestOnlyMethod | string | null
  simpleInterestMethod?: SimpleInterestMethod | string | null
  totalInterest?: number
  totalPayment?: number
  schedule?: LoanSchedulePreviewRow[]
  createdAt?: string
}
