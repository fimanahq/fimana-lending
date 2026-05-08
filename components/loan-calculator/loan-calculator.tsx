'use client'

import { useEffect, useMemo, useState, type WheelEvent } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared'
import { defaultLoanInterestRules } from '@/content/rules'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import {
  buildLoanDueDates,
  buildScheduleForCalculationMethod,
  buildPaymentDays,
  getRecommendedFirstPaymentDate,
  getInterestRateFromRules,
  paymentDayOptions,
} from '@/lib/loan-schedule'
import type {
  InterestMode,
  LoanCalculationMethod,
  LoanInterestRulesConfig,
  PaymentFrequency,
  PostInterestOnlyMethod,
  SimpleInterestMethod,
} from '@/lib/types'

function getGivesBucketLabel(gives: number) {
  if (gives <= 1) {
    return '1 give'
  }

  if (gives === 2) {
    return '2 gives'
  }

  return '3+ gives'
}

const paymentFrequencyOptions: SearchableSelectOption[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-monthly', value: 'semi_monthly' },
]

const paymentDaySelectOptions = paymentDayOptions.map((option) => ({
  label: option === 'month_end' ? 'Month end' : option,
  value: option,
}))

const interestModeOptions: SearchableSelectOption[] = [
  { label: 'Use configured rules', value: 'rules' },
  { label: 'Manual interest rate', value: 'manual' },
]

const calculationMethodOptions: SearchableSelectOption[] = [
  { label: 'Reducing balance', value: 'reducing_balance' },
  { label: 'Flat rate', value: 'flat_rate' },
  { label: 'Interest only', value: 'interest_only' },
  { label: 'Simple interest', value: 'simple_interest' },
]

const postInterestOnlyMethodOptions: SearchableSelectOption[] = [
  { label: 'Bullet principal payoff', value: 'bullet' },
  { label: 'Amortize remaining principal', value: 'amortizing' },
]

const simpleInterestMethodOptions: SearchableSelectOption[] = [
  { label: 'Equal principal', value: 'equal_principal' },
  { label: 'Equal payment', value: 'equal_payment' },
]

export function LoanCalculator() {
  const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  const [form, setForm] = useState({
    principal: '5000',
    gives: '2',
    paymentFrequency: 'semi_monthly' as PaymentFrequency,
    firstDay: '15',
    secondDay: 'month_end',
    firstPaymentDate: '',
    interestMode: 'rules' as InterestMode,
    manualInterestRate: '9',
    calculationMethod: 'reducing_balance' as LoanCalculationMethod,
    interestOnlyPeriod: '1',
    postInterestOnlyMethod: 'bullet' as PostInterestOnlyMethod,
    simpleInterestMethod: 'equal_principal' as SimpleInterestMethod,
  })
  const [firstPaymentDateIsAuto, setFirstPaymentDateIsAuto] = useState(true)
  const [rules, setRules] = useState<LoanInterestRulesConfig>(defaultLoanInterestRules)

  const paymentDays = useMemo(
    () => buildPaymentDays(form.paymentFrequency, form.firstDay, form.secondDay),
    [form.firstDay, form.paymentFrequency, form.secondDay],
  )

  useEffect(() => {
    if (!firstPaymentDateIsAuto) {
      return
    }

    const recommendedDate = getRecommendedFirstPaymentDate(form.paymentFrequency, paymentDays)
    setForm((current) =>
      current.firstPaymentDate === recommendedDate
        ? current
        : { ...current, firstPaymentDate: recommendedDate },
    )
  }, [firstPaymentDateIsAuto, form.paymentFrequency, paymentDays])

  const calculation = useMemo(() => {
    if (!form.firstPaymentDate) {
      return {
        error: 'Select the first payment date to generate the schedule.',
        schedule: [],
        interestRate: 0,
        totalInterest: 0,
        totalPayment: 0,
      }
    }

    try {
      const principal = Number(form.principal)
      const gives = Number(form.gives)

      if (!Number.isFinite(principal) || principal <= 0) {
        throw new Error('Loan amount must be greater than 0')
      }

      if (!Number.isInteger(gives) || gives <= 0) {
        throw new Error('Loan term must be a whole number of gives')
      }

      const interestRate = form.interestMode === 'manual'
        ? Number(form.manualInterestRate)
        : getInterestRateFromRules(principal, gives, rules)

      if (!Number.isFinite(interestRate) || interestRate < 0) {
        throw new Error('Interest rate must be 0 or greater')
      }

      const dueDates = buildLoanDueDates(gives, form.paymentFrequency, paymentDays, form.firstPaymentDate)
      const interestOnlyPeriod = Number(form.interestOnlyPeriod)

      if (
        form.calculationMethod === 'interest_only'
        && (!Number.isInteger(interestOnlyPeriod) || interestOnlyPeriod < 0 || interestOnlyPeriod >= gives)
      ) {
        throw new Error('Interest-only cutoffs must be a whole number less than gives')
      }

      const schedule = buildScheduleForCalculationMethod({
        principal,
        interestRate,
        dueDates,
        calculationMethod: form.calculationMethod,
        interestOnlyPeriod,
        postInterestOnlyMethod: form.postInterestOnlyMethod,
        simpleInterestMethod: form.simpleInterestMethod,
      })
      const totalInterest = Number(schedule.reduce((sum, row) => sum + row.interest, 0).toFixed(2))
      const totalPayment = Number(schedule.reduce((sum, row) => sum + row.totalPayment, 0).toFixed(2))

      return {
        error: '',
        schedule,
        interestRate,
        totalInterest,
        totalPayment,
      }
    } catch (caughtError) {
      return {
        error: caughtError instanceof Error ? caughtError.message : 'Unable to generate schedule',
        schedule: [],
        interestRate: 0,
        totalInterest: 0,
        totalPayment: 0,
      }
    }
  }, [form, paymentDays, rules])

  const appliedInterestDetail = useMemo(() => {
    if (form.interestMode === 'manual') {
      return 'Manual override from Interest per cutoff (%) input.'
    }

    const principal = Number(form.principal)
    const gives = Number(form.gives)

    if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(gives) || gives <= 0) {
      return 'Enter a valid loan amount and gives to resolve the configured rule.'
    }

    const bandLabel = principal <= rules.thresholdAmount
      ? `Small loan (≤ ${formatCurrency(rules.thresholdAmount)})`
      : `Large loan (> ${formatCurrency(rules.thresholdAmount)})`

    const givesLabel = getGivesBucketLabel(gives)
    const appliedRate = getInterestRateFromRules(principal, gives, rules)

    return `Using ${bandLabel}, ${givesLabel} rule = ${appliedRate}%.`
  }, [form.gives, form.interestMode, form.principal, rules])

  return (
    <div className="stack">
      <section className="card panel">
        <h1 className="section-title title-offset">Loan schedule calculator</h1>
        <p className="muted">
          Enter the amount, term, payment dates, and interest setup to generate the cutoff table instantly.
        </p>
      </section>

      <div className="grid two">
        <section className="card panel stack">
          <div className="section-title">Inputs</div>

          <div className="grid two">
            <div className="field">
              <label htmlFor="calculatorPrincipal">Loan amount</label>
              <input
                id="calculatorPrincipal"
                type="number"
                min="1"
                step="0.01"
                onWheel={preventWheelValueChange}
                value={form.principal}
                onChange={(event) => setForm((current) => ({ ...current, principal: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="calculatorGives">Loan term (gives)</label>
              <input
                id="calculatorGives"
                type="number"
                min="1"
                step="1"
                onWheel={preventWheelValueChange}
                value={form.gives}
                onChange={(event) => setForm((current) => ({ ...current, gives: event.target.value }))}
              />
            </div>
          </div>

          <SearchableSelect
            id="calculatorFrequency"
            label="Payment frequency"
            options={paymentFrequencyOptions}
            value={form.paymentFrequency}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                paymentFrequency: nextValue as PaymentFrequency,
              }))
            }
          />

          {form.paymentFrequency === 'semi_monthly' ? (
            <div className="grid two">
              <SearchableSelect
                id="calculatorFirstDay"
                label="First payment day"
                options={paymentDaySelectOptions}
                value={form.firstDay}
                onChange={(nextValue) => setForm((current) => ({ ...current, firstDay: nextValue }))}
              />
              <SearchableSelect
                id="calculatorSecondDay"
                label="Second payment day"
                options={paymentDaySelectOptions}
                value={form.secondDay}
                onChange={(nextValue) => setForm((current) => ({ ...current, secondDay: nextValue }))}
              />
            </div>
          ) : (
            <SearchableSelect
              id="calculatorMonthlyDay"
              label="Monthly payment day"
              options={paymentDaySelectOptions}
              value={form.firstDay}
              onChange={(nextValue) => setForm((current) => ({ ...current, firstDay: nextValue }))}
            />
          )}

          <div className="field">
            <label htmlFor="calculatorFirstPaymentDate">First payment date</label>
            <input
              id="calculatorFirstPaymentDate"
              type="date"
              value={form.firstPaymentDate}
              onChange={(event) => {
                const nextValue = event.target.value
                setFirstPaymentDateIsAuto(nextValue.length === 0)
                setForm((current) => ({ ...current, firstPaymentDate: nextValue }))
              }}
            />
          </div>

          <SearchableSelect
            id="calculatorInterestMode"
            label="Interest mode"
            options={interestModeOptions}
            value={form.interestMode}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                interestMode: nextValue as InterestMode,
              }))
            }
          />

          {form.interestMode === 'manual' ? (
            <div className="field">
              <label htmlFor="calculatorManualRate">Interest per cutoff (%)</label>
              <input
                id="calculatorManualRate"
                type="number"
                min="0"
                step="0.01"
                onWheel={preventWheelValueChange}
                value={form.manualInterestRate}
                onChange={(event) => setForm((current) => ({ ...current, manualInterestRate: event.target.value }))}
              />
            </div>
          ) : null}

          <SearchableSelect
            id="calculatorCalculationMethod"
            label="Calculation method"
            options={calculationMethodOptions}
            searchable={false}
            value={form.calculationMethod}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                calculationMethod: nextValue as LoanCalculationMethod,
              }))
            }
          />

          {form.calculationMethod === 'interest_only' ? (
            <div className="grid two">
              <div className="field">
                <label htmlFor="calculatorInterestOnlyPeriod">Interest-only cutoffs</label>
                <input
                  id="calculatorInterestOnlyPeriod"
                  type="number"
                  min="0"
                  step="1"
                  onWheel={preventWheelValueChange}
                  value={form.interestOnlyPeriod}
                  onChange={(event) => setForm((current) => ({ ...current, interestOnlyPeriod: event.target.value }))}
                />
              </div>
              <SearchableSelect
                id="calculatorPostInterestOnlyMethod"
                label="After interest-only"
                options={postInterestOnlyMethodOptions}
                value={form.postInterestOnlyMethod}
                onChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    postInterestOnlyMethod: nextValue as PostInterestOnlyMethod,
                  }))
                }
              />
            </div>
          ) : null}

          {form.calculationMethod === 'simple_interest' ? (
            <SearchableSelect
              id="calculatorSimpleInterestMethod"
              label="Simple interest type"
              options={simpleInterestMethodOptions}
              value={form.simpleInterestMethod}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  simpleInterestMethod: nextValue as SimpleInterestMethod,
                }))
              }
            />
          ) : null}
        </section>

        <section className="card panel stack">
          <div className="section-title">Rule configuration</div>
          <p className="muted">
            Edit the threshold and per-cutoff rates below. The calculator will use these values when interest mode is set to configured rules.
          </p>

          <div className="field">
            <label htmlFor="ruleThreshold">Small-loan threshold</label>
            <input
              id="ruleThreshold"
              type="number"
              min="1"
              step="0.01"
              onWheel={preventWheelValueChange}
              value={rules.thresholdAmount}
              onChange={(event) =>
                setRules((current) => ({ ...current, thresholdAmount: Number(event.target.value) || 0 }))
              }
            />
          </div>

          <div className="grid two">
            <div className="data-card stack">
              <div className="section-title subsection-title">Small loan rates</div>
              <div className="field">
                <label htmlFor="smallOneGive">1 give (%)</label>
                <input
                  id="smallOneGive"
                  className="input-no-spinner"
                  type="number"
                  step="0.01"
                  onWheel={preventWheelValueChange}
                  value={rules.smallLoanRates.oneGive}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      smallLoanRates: { ...current.smallLoanRates, oneGive: Number(event.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="smallTwoGives">2 gives (%)</label>
                <input
                  id="smallTwoGives"
                  className="input-no-spinner"
                  type="number"
                  step="0.01"
                  onWheel={preventWheelValueChange}
                  value={rules.smallLoanRates.twoGives}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      smallLoanRates: { ...current.smallLoanRates, twoGives: Number(event.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="smallThreePlus">3+ gives (%)</label>
                <input
                  id="smallThreePlus"
                  className="input-no-spinner"
                  type="number"
                  step="0.01"
                  onWheel={preventWheelValueChange}
                  value={rules.smallLoanRates.threePlusGives}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      smallLoanRates: { ...current.smallLoanRates, threePlusGives: Number(event.target.value) || 0 },
                    }))
                  }
                />
              </div>
            </div>

            <div className="data-card stack">
              <div className="section-title subsection-title">Large loan rates</div>
              <div className="field">
                <label htmlFor="largeOneGive">1 give (%)</label>
                <input
                  id="largeOneGive"
                  className="input-no-spinner"
                  type="number"
                  step="0.01"
                  onWheel={preventWheelValueChange}
                  value={rules.largeLoanRates.oneGive}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      largeLoanRates: { ...current.largeLoanRates, oneGive: Number(event.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="largeTwoGives">2 gives (%)</label>
                <input
                  id="largeTwoGives"
                  className="input-no-spinner"
                  type="number"
                  step="0.01"
                  onWheel={preventWheelValueChange}
                  value={rules.largeLoanRates.twoGives}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      largeLoanRates: { ...current.largeLoanRates, twoGives: Number(event.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="largeThreePlus">3+ gives (%)</label>
                <input
                  id="largeThreePlus"
                  className="input-no-spinner"
                  type="number"
                  step="0.01"
                  onWheel={preventWheelValueChange}
                  value={rules.largeLoanRates.threePlusGives}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      largeLoanRates: { ...current.largeLoanRates, threePlusGives: Number(event.target.value) || 0 },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="summary-grid">
        <div className="card summary-stat">
          <span className="muted">Applied interest</span>
          <strong>{calculation.interestRate ? `${calculation.interestRate}%` : '--'}</strong>
          <span className="muted">{appliedInterestDetail}</span>
        </div>
        <div className="card summary-stat">
          <span className="muted">Total interest</span>
          <strong>{formatCurrency(calculation.totalInterest)}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Total payment</span>
          <strong>{formatCurrency(calculation.totalPayment)}</strong>
        </div>
      </section>

      <section className="card panel stack">
        <div className="section-title">Schedule preview</div>
        <p className="muted">
          Payment days: {paymentDays.map(formatPaymentDay).join(' and ')}.
          {form.interestMode === 'rules'
            ? ' The interest rate is coming from the configured rules above.'
            : ' The interest rate is using your manual override.'}
        </p>

        {calculation.error ? <div className="notice danger">{calculation.error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cutoff</th>
                <th>Beginning Balance</th>
                <th>Interest</th>
                <th>Principal Paid</th>
                <th>Ending Balance</th>
                <th>Total Payment</th>
              </tr>
            </thead>
            <tbody>
              {calculation.schedule.map((row) => (
                <tr key={`${row.sequence}-${row.dueDate}`}>
                  <td>
                    #{row.sequence}
                    <div className="muted">{formatDate(row.dueDate)}</div>
                  </td>
                  <td>{formatCurrency(row.beginningBalance)}</td>
                  <td>{formatCurrency(row.interest)}</td>
                  <td>{formatCurrency(row.principalPaid)}</td>
                  <td>{formatCurrency(row.endingBalance)}</td>
                  <td>{formatCurrency(row.totalPayment)}</td>
                </tr>
              ))}
              {calculation.schedule.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">Complete the inputs to generate the table.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
