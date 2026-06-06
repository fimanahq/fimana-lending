'use client'

import { useEffect, useMemo, useState, type WheelEvent } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared'
import {
  applyRateBasis,
  calculateReducingBalanceLoan,
  getAutoRate,
  rateReductionOptions,
  type RateBasis,
} from '@/components/loan-calculator/loan-calculator-utils'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import {
  buildLoanDueDates,
  buildScheduleForCalculationMethod,
  buildPaymentDays,
  getRecommendedFirstPaymentDate,
  paymentDayOptions,
} from '@/lib/loan-schedule'
import type {
  InterestMode,
  LoanCalculationMethod,
  PostInterestOnlyMethod,
  SimpleInterestMethod,
} from '@/lib/types/lending'
import type { PaymentFrequency } from '@/lib/types/shared'

const paymentFrequencyOptions: SearchableSelectOption[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-monthly', value: 'semi_monthly' },
]

const paymentDaySelectOptions = paymentDayOptions.map((option) => ({
  label: option === 'month_end' ? 'Month end' : option,
  value: option,
}))

const interestModeOptions: SearchableSelectOption[] = [
  { label: 'Automatic tiered pricing', value: 'rules' },
  { label: 'Manual what-if', value: 'manual' },
]

const rateBasisOptions: SearchableSelectOption[] = rateReductionOptions.map((option) => ({
  label: option.reduction > 0
    ? `${option.label} (-${option.reduction}%)`
    : option.label,
  value: option.value,
}))

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
    rateBasis: 'standard' as RateBasis,
    calculationMethod: 'reducing_balance' as LoanCalculationMethod,
    interestOnlyPeriod: '1',
    postInterestOnlyMethod: 'bullet' as PostInterestOnlyMethod,
    simpleInterestMethod: 'equal_principal' as SimpleInterestMethod,
  })
  const [firstPaymentDateIsAuto, setFirstPaymentDateIsAuto] = useState(true)

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
        selectedRate: 0,
        amountTier: '',
        amountTierLabel: '',
        cutoffRange: '',
        cutoffRangeLabel: '',
        baseRate: 0,
        rateBasis: 'standard' as RateBasis,
        rateBasisLabel: '',
        rateReduction: 0,
        totalInterest: 0,
        totalPayment: 0,
        paymentPerCutoff: 0,
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

      const dueDates = buildLoanDueDates(gives, form.paymentFrequency, paymentDays, form.firstPaymentDate)

      if (form.interestMode === 'rules') {
        const autoCalculation = calculateReducingBalanceLoan({
          principal,
          cutoffs: gives,
          dueDates,
          rateBasis: form.rateBasis,
        })

        return {
          error: '',
          schedule: autoCalculation.schedule,
          interestRate: autoCalculation.selectedRate,
          selectedRate: autoCalculation.selectedRate,
          amountTier: autoCalculation.amountTier,
          amountTierLabel: autoCalculation.amountTierLabel,
          cutoffRange: autoCalculation.cutoffRange,
          cutoffRangeLabel: autoCalculation.cutoffRangeLabel,
          baseRate: autoCalculation.baseRate,
          rateBasis: autoCalculation.rateBasis,
          rateBasisLabel: autoCalculation.rateBasisLabel,
          rateReduction: autoCalculation.rateReduction,
          totalInterest: autoCalculation.totalInterest,
          totalPayment: autoCalculation.totalPayable,
          paymentPerCutoff: autoCalculation.paymentPerCutoff,
        }
      }

      const interestRate = Number(form.manualInterestRate)

      if (!Number.isFinite(interestRate) || interestRate < 0) {
        throw new Error('Interest rate must be 0 or greater')
      }

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
      const paymentPerCutoff = gives > 0 ? Number((totalPayment / gives).toFixed(2)) : 0

      return {
        error: '',
        schedule,
        interestRate,
        selectedRate: interestRate,
        amountTier: '',
        amountTierLabel: '',
        cutoffRange: '',
        cutoffRangeLabel: '',
        baseRate: interestRate,
        rateBasis: 'standard' as RateBasis,
        rateBasisLabel: '',
        rateReduction: 0,
        totalInterest,
        totalPayment,
        paymentPerCutoff,
      }
    } catch (caughtError) {
      return {
        error: caughtError instanceof Error ? caughtError.message : 'Unable to generate schedule',
        schedule: [],
        interestRate: 0,
        selectedRate: 0,
        amountTier: '',
        amountTierLabel: '',
        cutoffRange: '',
        cutoffRangeLabel: '',
        baseRate: 0,
        rateBasis: 'standard' as RateBasis,
        rateBasisLabel: '',
        rateReduction: 0,
        totalInterest: 0,
        totalPayment: 0,
        paymentPerCutoff: 0,
      }
    }
  }, [form, paymentDays])

  const appliedInterestDetail = useMemo(() => {
    if (form.interestMode === 'manual') {
      return 'Manual what-if from Interest per cutoff (%) input.'
    }

    const principal = Number(form.principal)
    const gives = Number(form.gives)

    if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(gives) || gives <= 0) {
      return 'Enter a valid loan amount and cutoffs to resolve automatic pricing.'
    }

    try {
      const autoPricing = getAutoRate(principal, gives)
      const rateDetails = applyRateBasis(autoPricing.selectedRate, form.rateBasis)

      if (rateDetails.rateReduction > 0) {
        return `Using ${autoPricing.amountTierLabel}, ${autoPricing.cutoffRangeLabel}: ${rateDetails.baseRate}% base less ${rateDetails.rateReduction}% ${rateDetails.rateBasisLabel.toLowerCase()} = ${rateDetails.selectedRate}%.`
      }

      return `Using ${autoPricing.amountTierLabel}, ${autoPricing.cutoffRangeLabel} = ${rateDetails.selectedRate}%.`
    } catch (caughtError) {
      return caughtError instanceof Error ? caughtError.message : 'Unable to resolve automatic pricing.'
    }
  }, [form.gives, form.interestMode, form.principal, form.rateBasis])

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

          {form.interestMode === 'manual' ? (
            <>
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
                      onChange={(event) =>
                        setForm((current) => ({ ...current, interestOnlyPeriod: event.target.value }))
                      }
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
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="calculatorRateBasis">Rate basis</label>
                <select
                  id="calculatorRateBasis"
                  value={form.rateBasis}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rateBasis: event.target.value as RateBasis,
                    }))
                  }
                >
                  {rateBasisOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="notice">
                Standard uses the table rate. Reduced rates require a selected basis and never go below 5%.
              </div>
            </>
          )}
        </section>

        <section className="card panel stack">
          <div className="section-title">Automatic pricing details</div>
          <p className="muted">
            The calculator selects the rate from amount tier and cutoffs.
          </p>

          {form.interestMode === 'manual' ? (
            <div className="notice">Automatic pricing details are shown when automatic tiered pricing is selected.</div>
          ) : (
            <div className="grid two">
              <div className="data-card">
                <span className="muted">Amount tier</span>
                <strong>{calculation.amountTierLabel || '--'}</strong>
              </div>
              <div className="data-card">
                <span className="muted">Cutoff range</span>
                <strong>{calculation.cutoffRangeLabel || '--'}</strong>
              </div>
              <div className="data-card">
                <span className="muted">Base table rate</span>
                <strong>{calculation.baseRate ? `${calculation.baseRate}%` : '--'}</strong>
              </div>
              <div className="data-card">
                <span className="muted">Rate basis</span>
                <strong>{calculation.rateBasisLabel || '--'}</strong>
              </div>
              <div className="data-card">
                <span className="muted">Reduction</span>
                <strong>{calculation.rateReduction ? `-${calculation.rateReduction}%` : 'None'}</strong>
              </div>
              <div className="data-card">
                <span className="muted">Final rate</span>
                <strong>{calculation.selectedRate ? `${calculation.selectedRate}%` : '--'}</strong>
              </div>
              <div className="data-card">
                <span className="muted">Total interest</span>
                <strong>{formatCurrency(calculation.totalInterest)}</strong>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="summary-grid">
        <div className="card summary-stat">
          <span className="muted">Final rate</span>
          <strong>{calculation.interestRate ? `${calculation.interestRate}%` : '--'}</strong>
          <span className="muted">{appliedInterestDetail}</span>
        </div>
        <div className="card summary-stat">
          <span className="muted">Base table rate</span>
          <strong>{calculation.baseRate ? `${calculation.baseRate}%` : '--'}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Rate basis</span>
          <strong>{calculation.rateBasisLabel || '--'}</strong>
          <span className="muted">{calculation.rateReduction ? `${calculation.rateReduction}% reduction.` : 'No reduction.'}</span>
        </div>
        <div className="card summary-stat">
          <span className="muted">Total interest</span>
          <strong>{formatCurrency(calculation.totalInterest)}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Total payable</span>
          <strong>{formatCurrency(calculation.totalPayment)}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Payment per cutoff</span>
          <strong>{formatCurrency(calculation.paymentPerCutoff)}</strong>
        </div>
      </section>

      <section className="card panel stack">
        <div className="section-title">Schedule preview</div>
        <p className="muted">
          Payment days: {paymentDays.map(formatPaymentDay).join(' and ')}.
          {form.interestMode === 'rules'
            ? ' Automatic pricing uses reducing balance interest with the selected tiered rate.'
            : ' Manual what-if uses your selected interest and calculation method.'}
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
