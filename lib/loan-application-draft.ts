import type {
  LoanApplicationDraftInput,
  LoanCalculationMethod,
  PostInterestOnlyMethod,
  SimpleInterestMethod,
} from '@/lib/types'

export function isDraftLoanApplicationPayload(body: Record<string, unknown>) {
  return 'borrowerId' in body || 'loanProductId' in body || 'loanAmountMinor' in body
}

export function getDraftLoanApplicationPayload(body: Record<string, unknown>): LoanApplicationDraftInput {
  const rawPaymentDays = Array.isArray(body.paymentDays)
    ? body.paymentDays
      .map((day) => (typeof day === 'string' ? day.trim().toLowerCase() : String(day)))
      .filter((day) => day.length > 0)
    : []
  const legacyCutoffPatternCode =
    body.cutoffPatternCode === '5_20' || body.cutoffPatternCode === '15_month_end'
      ? body.cutoffPatternCode
      : null
  const paymentDays = rawPaymentDays.length > 0
    ? rawPaymentDays
    : legacyCutoffPatternCode === '5_20'
      ? ['5', '20']
      : legacyCutoffPatternCode === '15_month_end'
        ? ['15', 'month_end']
        : []
  const calculationMethod = toCalculationMethod(body.calculationMethod)
  const interestRate = body.interestRate === '' || body.interestRate === null || body.interestRate === undefined
    ? null
    : Number(body.interestRate)

  return {
    borrowerId: typeof body.borrowerId === 'string' ? body.borrowerId : '',
    loanProductId:
      typeof body.loanProductId === 'string' && body.loanProductId.trim().length > 0
        ? body.loanProductId.trim()
        : undefined,
    loanAmountMinor: Number(body.loanAmountMinor),
    numberOfCutoffs: Number(body.numberOfCutoffs),
    startDate: typeof body.startDate === 'string' ? body.startDate : '',
    paymentType: body.paymentType === 'monthly' ? 'monthly' : 'semi_monthly',
    paymentDays,
    cutoffPatternCode: legacyCutoffPatternCode,
    interestRate,
    calculationMethod,
    interestOnlyPeriod: calculationMethod === 'interest_only' ? Number(body.interestOnlyPeriod) : null,
    postInterestOnlyMethod: calculationMethod === 'interest_only'
      ? toPostInterestOnlyMethod(body.postInterestOnlyMethod)
      : null,
    simpleInterestMethod: calculationMethod === 'simple_interest'
      ? toSimpleInterestMethod(body.simpleInterestMethod)
      : null,
    purpose: typeof body.purpose === 'string' ? body.purpose.trim() : undefined,
  }
}

function toCalculationMethod(value: unknown): LoanCalculationMethod {
  return value === 'flat_rate'
    || value === 'interest_only'
    || value === 'simple_interest'
    || value === 'fixed_total_interest'
    || value === 'reducing_balance'
    ? value
    : 'reducing_balance'
}

function toPostInterestOnlyMethod(value: unknown): PostInterestOnlyMethod | null {
  return value === 'amortizing' || value === 'bullet' ? value : null
}

function toSimpleInterestMethod(value: unknown): SimpleInterestMethod | null {
  return value === 'equal_payment' || value === 'equal_principal' ? value : null
}
