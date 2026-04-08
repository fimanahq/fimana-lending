export type UserAppCode = 'fimana-lending' | 'fimana-web'
export type PaymentFrequency = 'monthly' | 'twice_monthly'
export type LoanStatus = 'active' | 'completed' | 'cancelled'
export type LoanInstallmentStatus = 'pending' | 'partial' | 'paid'
export type LoanReminderStatus = 'pending' | 'sent' | 'cancelled'
export type LoanRequestStatus = 'pending' | 'approved' | 'rejected'
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

export interface LoanRequest {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  principal: number
  gives: number
  paymentFrequency: PaymentFrequency
  paymentDays: string[]
  paymentPreset: LoanSchedulePreset
  firstPaymentDate: string
  notes?: string
  status: LoanRequestStatus
  createdAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  contactId?: string | null
  loanId?: string | null
}
