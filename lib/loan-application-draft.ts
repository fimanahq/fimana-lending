import type {
  LoanApplicationDraftInput,
  LoanApplicationPaymentType,
  LoanCalculationMethod,
  PostInterestOnlyMethod,
  SimpleInterestMethod,
} from '@/lib/types/lending'

interface DraftLoanApplicationInput {
  borrowerId: string
  loanProductId?: string
  loanAmountMinor: number
  numberOfCutoffs: number
  startDate: string
  paymentType: LoanApplicationPaymentType
  paymentDays: string[]
  cutoffPatternCode?: LoanApplicationDraftInput['cutoffPatternCode']
  interestRate: number | null
  calculationMethod: LoanCalculationMethod
  interestOnlyPeriod: number | null
  postInterestOnlyMethod: PostInterestOnlyMethod | null
  simpleInterestMethod: SimpleInterestMethod | null
  purpose?: string
}

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

  return buildDraftLoanApplicationInput({
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
  })
}

export function buildDraftLoanApplicationInput(
  input: DraftLoanApplicationInput,
): LoanApplicationDraftInput {
  return {
    borrowerId: input.borrowerId,
    loanProductId: input.loanProductId,
    loanAmountMinor: input.loanAmountMinor,
    numberOfCutoffs: input.numberOfCutoffs,
    startDate: input.startDate,
    paymentType: input.paymentType,
    paymentDays: input.paymentDays,
    cutoffPatternCode: input.cutoffPatternCode ?? null,
    interestRate: input.interestRate,
    calculationMethod: input.calculationMethod,
    interestOnlyPeriod: input.calculationMethod === 'interest_only' ? input.interestOnlyPeriod : null,
    postInterestOnlyMethod: input.calculationMethod === 'interest_only'
      ? input.postInterestOnlyMethod
      : null,
    simpleInterestMethod: input.calculationMethod === 'simple_interest'
      ? input.simpleInterestMethod
      : null,
    purpose: input.purpose,
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
