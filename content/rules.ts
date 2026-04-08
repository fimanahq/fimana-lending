import type { LoanInterestRulesConfig } from '@/lib/types'

export const defaultLoanInterestRules: LoanInterestRulesConfig = {
  thresholdAmount: 5000,
  smallLoanRates: {
    oneGive: 10,
    twoGives: 9,
    threePlusGives: 8,
  },
  largeLoanRates: {
    oneGive: 10,
    twoGives: 9,
    threePlusGives: 7.5,
  },
}

export const loanRules = {
  scheduleTableHeaders: [
    'Cutoff',
    'Beginning Balance',
    'Interest',
    'Principal Paid',
    'Ending Balance',
    'Total Payment',
  ],
  interestRules: [
    { loanBand: '≤ 5,000', gives: '1 give', interest: '10%' },
    { loanBand: '≤ 5,000', gives: '2 gives', interest: '9%' },
    { loanBand: '≤ 5,000', gives: '3+ gives', interest: '8%' },
    { loanBand: '> 5,000', gives: '1 give', interest: '10%' },
    { loanBand: '> 5,000', gives: '2 gives', interest: '9%' },
    { loanBand: '> 5,000', gives: '3+ gives', interest: '7.5%' },
  ],
  decisionGuide: [
    { scenario: 'short term (1 give)', interest: '10%' },
    { scenario: 'very short term (2 gives)', interest: '9%' },
    { scenario: 'normal term (3+ gives)', interest: '7.5% (>5k) or 8% (≤5k)' },
    { scenario: 'small loan ≤5k', interest: 'higher interest' },
    { scenario: 'bigger loan >5k', interest: 'slightly lower interest' },
  ],
}
