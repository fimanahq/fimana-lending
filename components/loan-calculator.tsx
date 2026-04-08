'use client'

import { useMemo, useState } from 'react'
import { defaultLoanInterestRules } from '@/content/rules'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import {
  buildLoanDueDates,
  buildLoanSchedule,
  buildPaymentDays,
  getInterestRateFromRules,
  paymentDayOptions,
} from '@/lib/loan-schedule'
import type { InterestMode, LoanInterestRulesConfig, LoanSchedulePreset, PaymentFrequency } from '@/lib/types'

export function LoanCalculator() {
  const [form, setForm] = useState({
    principal: '5000',
    gives: '2',
    paymentFrequency: 'twice_monthly' as PaymentFrequency,
    preset: '15_month_end' as LoanSchedulePreset,
    firstDay: '15',
    secondDay: 'month_end',
    firstPaymentDate: '',
    interestMode: 'rules' as InterestMode,
    manualInterestRate: '9',
  })
  const [rules, setRules] = useState<LoanInterestRulesConfig>(defaultLoanInterestRules)

  const paymentDays = useMemo(
    () => buildPaymentDays(form.paymentFrequency, form.firstDay, form.secondDay, form.preset),
    [form.firstDay, form.paymentFrequency, form.preset, form.secondDay],
  )

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
      const schedule = buildLoanSchedule(principal, interestRate, dueDates)
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

  return (
    <div className="stack">
      <section className="card panel">
        <div className="eyebrow">Calculator</div>
        <h1 className="section-title" style={{ marginTop: '0.8rem' }}>Loan schedule calculator</h1>
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
                value={form.gives}
                onChange={(event) => setForm((current) => ({ ...current, gives: event.target.value }))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="calculatorFrequency">Payment frequency</label>
            <select
              id="calculatorFrequency"
              value={form.paymentFrequency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paymentFrequency: event.target.value as PaymentFrequency,
                }))
              }
            >
              <option value="monthly">Monthly</option>
              <option value="twice_monthly">Twice monthly</option>
            </select>
          </div>

          {form.paymentFrequency === 'twice_monthly' ? (
            <>
              <div className="field">
                <label htmlFor="calculatorPreset">Schedule preset</label>
                <select
                  id="calculatorPreset"
                  value={form.preset}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      preset: event.target.value as LoanSchedulePreset,
                    }))
                  }
                >
                  <option value="15_month_end">15th + month end</option>
                  <option value="5_20">5th + 20th</option>
                  <option value="custom">Custom dates</option>
                </select>
              </div>

              {form.preset === 'custom' ? (
                <div className="grid two">
                  <div className="field">
                    <label htmlFor="calculatorFirstDay">First payment day</label>
                    <select
                      id="calculatorFirstDay"
                      value={form.firstDay}
                      onChange={(event) => setForm((current) => ({ ...current, firstDay: event.target.value }))}
                    >
                      {paymentDayOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'month_end' ? 'Month end' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="calculatorSecondDay">Second payment day</label>
                    <select
                      id="calculatorSecondDay"
                      value={form.secondDay}
                      onChange={(event) => setForm((current) => ({ ...current, secondDay: event.target.value }))}
                    >
                      {paymentDayOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'month_end' ? 'Month end' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="field">
              <label htmlFor="calculatorMonthlyDay">Monthly payment day</label>
              <select
                id="calculatorMonthlyDay"
                value={form.firstDay}
                onChange={(event) => setForm((current) => ({ ...current, firstDay: event.target.value }))}
              >
                {paymentDayOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'month_end' ? 'Month end' : option}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="calculatorFirstPaymentDate">First payment date</label>
            <input
              id="calculatorFirstPaymentDate"
              type="date"
              value={form.firstPaymentDate}
              onChange={(event) => setForm((current) => ({ ...current, firstPaymentDate: event.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="calculatorInterestMode">Interest mode</label>
            <select
              id="calculatorInterestMode"
              value={form.interestMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  interestMode: event.target.value as InterestMode,
                }))
              }
            >
              <option value="rules">Use configured rules</option>
              <option value="manual">Manual interest rate</option>
            </select>
          </div>

          {form.interestMode === 'manual' ? (
            <div className="field">
              <label htmlFor="calculatorManualRate">Interest per cutoff (%)</label>
              <input
                id="calculatorManualRate"
                type="number"
                min="0"
                step="0.01"
                value={form.manualInterestRate}
                onChange={(event) => setForm((current) => ({ ...current, manualInterestRate: event.target.value }))}
              />
            </div>
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
              value={rules.thresholdAmount}
              onChange={(event) =>
                setRules((current) => ({ ...current, thresholdAmount: Number(event.target.value) || 0 }))
              }
            />
          </div>

          <div className="grid two">
            <div className="card panel stack" style={{ boxShadow: 'none' }}>
              <div className="section-title" style={{ fontSize: '1rem' }}>Small loan rates</div>
              <div className="field">
                <label htmlFor="smallOneGive">1 give (%)</label>
                <input
                  id="smallOneGive"
                  type="number"
                  step="0.01"
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
                  type="number"
                  step="0.01"
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
                  type="number"
                  step="0.01"
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

            <div className="card panel stack" style={{ boxShadow: 'none' }}>
              <div className="section-title" style={{ fontSize: '1rem' }}>Large loan rates</div>
              <div className="field">
                <label htmlFor="largeOneGive">1 give (%)</label>
                <input
                  id="largeOneGive"
                  type="number"
                  step="0.01"
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
                  type="number"
                  step="0.01"
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
                  type="number"
                  step="0.01"
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
