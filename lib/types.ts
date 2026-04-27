export type UserAppCode = 'fimana-lending' | 'fimana-web'
export type PaymentFrequency = 'monthly' | 'twice_monthly'
export type LoanApplicationPaymentType = 'monthly' | 'semi_monthly'
export type LoanApplicationCutoffPatternCode = '5_20' | '15_30'
export type LoanStatus = 'active' | 'completed' | 'cancelled'
export type LoanInstallmentStatus = 'pending' | 'partial' | 'paid'
export type LoanReminderStatus = 'pending' | 'sent' | 'cancelled'
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
export type LoanSchedulePreset = '15_month_end' | '5_20' | 'custom'
export type InterestMode = 'rules' | 'manual'

export interface ApiErrorPayload {
  message: string
}

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

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  signupSource?: UserAppCode | null
  enabledApps: UserAppCode[]
  createdAt: string
  updatedAt: string
}

export interface Contact {
  _id: string
  userId: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
  notes?: string
  isArchived: boolean
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

export interface LoanReminder {
  _id: string
  installmentSequence: number
  scheduledAt: string
  type: string
  channel: 'email'
  status: LoanReminderStatus
  sentAt?: string | null
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
  reminders: LoanReminder[]
  createdAt: string
  updatedAt?: string
}

export interface UpcomingLoanReminder {
  loanId: string
  installmentSequence: number
  scheduledAt: string
  type: string
  channel: 'email'
  status: LoanReminderStatus
  borrower: LoanBorrower | null
  loanStatus: LoanStatus
}

export interface LoanApplication {
  id: string
  applicationNumber?: string
  borrowerId?: string
  loanProductId?: string
  borrower?: LoanApplicationBorrowerSnapshot
  loanProduct?: LoanApplicationProductSnapshot
  loanAmountMinor?: number
  numberOfCutoffs?: number
  startDate?: string
  paymentType?: LoanApplicationPaymentType
  cutoffPatternCode?: LoanApplicationCutoffPatternCode | null
  purpose?: string
  computedPreviewSnapshot?: LoanApplicationComputedPreviewSnapshot | null
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  principal?: number
  gives?: number
  paymentFrequency?: PaymentFrequency
  paymentDays: string[]
  paymentPreset?: LoanSchedulePreset
  firstPaymentDate?: string
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

export interface LoanApplicationBorrowerSnapshot {
  id: string
  borrowerNumber: string
  displayName: string
  mobileNumber: string
  email: string
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
  interestConfig: {
    method: string
    rateBps: number
    ratePeriod: string
    roundingMode: string
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
  loanProductId: string
  loanAmountMinor: number
  numberOfCutoffs: number
  startDate: string
  paymentType: LoanApplicationPaymentType
  cutoffPatternCode?: LoanApplicationCutoffPatternCode | null
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
  totalInterest?: number
  totalPayment?: number
  schedule?: LoanSchedulePreviewRow[]
  createdAt?: string
}
