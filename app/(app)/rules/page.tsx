import Link from 'next/link'
import {
  MAX_AUTO_CUTOFFS,
  MAX_AUTO_LOAN_AMOUNT,
  MIN_ADJUSTED_RATE,
  MIN_AUTO_CUTOFFS,
  MIN_AUTO_LOAN_AMOUNT,
  autoPricingTable,
  loanAmountTiers,
  rateReductionOptions,
} from '@/content/calculator-pricing'

export default function RulesPage() {
  return (
    <div className="stack">
      <section className="card panel stack">
        <h1 className="section-title">Loan calculator pricing guide</h1>
        <p className="muted">
          Reference for the automatic amount tiers, cutoff rates, rate reductions, and reducing-balance calculation used by the standalone calculator.
        </p>
        <div className="notice">
          The guide currently aligns only with the standalone calculator and not in request application and manual application creation.
        </div>
        <div className="inline-actions">
          <Link href="/calculator" className="button-secondary">Open calculator</Link>
        </div>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">1. Terms and supported range</h2>
        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Calculator rule</th>
              </tr>
            </thead>
            <tbody>
              <tr><td data-label="Term">Give / cutoff</td><td data-label="Calculator rule">One scheduled payment slot.</td></tr>
              <tr><td data-label="Term">Automatic amount</td><td data-label="Calculator rule">₱{MIN_AUTO_LOAN_AMOUNT.toLocaleString()} to ₱{MAX_AUTO_LOAN_AMOUNT.toLocaleString()}.</td></tr>
              <tr><td data-label="Term">Automatic term</td><td data-label="Calculator rule">{MIN_AUTO_CUTOFFS} to {MAX_AUTO_CUTOFFS} cutoffs.</td></tr>
              <tr><td data-label="Term">Above ₱{MAX_AUTO_LOAN_AMOUNT.toLocaleString()}</td><td data-label="Calculator rule">Requires manual approval and custom terms.</td></tr>
              <tr><td data-label="Term">Automatic calculation</td><td data-label="Calculator rule">Uses reducing-balance interest and the rate selected from this guide.</td></tr>
              <tr><td data-label="Term">Manual what-if</td><td data-label="Calculator rule">Uses the manually entered rate and selected calculation method instead of these automatic pricing rules.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">2. Loan amount tiers</h2>
        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Amount range</th>
                <th>Minimum</th>
                <th>Maximum</th>
              </tr>
            </thead>
            <tbody>
              {loanAmountTiers.map((tier) => (
                <tr key={tier.value}>
                  <td data-label="Tier">{tier.label}</td>
                  <td data-label="Amount range">{tier.rangeLabel}</td>
                  <td data-label="Minimum">₱{tier.minAmount.toLocaleString()}</td>
                  <td data-label="Maximum">₱{tier.maxAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">3. Base rate table</h2>
        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Gives / cutoffs</th>
                {loanAmountTiers.map((tier) => (
                  <th key={tier.value}>{tier.label} {tier.rangeLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {autoPricingTable.map((row) => (
                <tr key={row.cutoffRange}>
                  <td data-label="Gives / cutoffs">{row.cutoffRangeLabel}</td>
                  {loanAmountTiers.map((tier) => (
                    <td key={tier.value} data-label={`${tier.label} ${tier.rangeLabel}`}>{row.rates[tier.value]}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice">
          The selected base rate is a per-cutoff rate used by the reducing-balance schedule.
        </div>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">4. Optional rate reductions</h2>
        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Rate basis</th>
                <th>Reduction</th>
                <th>Suggested basis</th>
              </tr>
            </thead>
            <tbody>
              {rateReductionOptions.map((option) => (
                <tr key={option.value}>
                  <td data-label="Rate basis">{option.label}</td>
                  <td data-label="Reduction">{option.reduction > 0 ? `-${option.reduction}%` : 'None'}</td>
                  <td data-label="Suggested basis">{option.guidance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice">
          Standard is the default. Reductions are percentage points from the base rate, and the final rate cannot go below {MIN_ADJUSTED_RATE}%.
        </div>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">5. Calculation order</h2>
        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              <tr><td data-label="Step">1</td><td data-label="Rule">Determine the amount tier from the principal.</td></tr>
              <tr><td data-label="Step">2</td><td data-label="Rule">Determine the cutoff range from the number of gives.</td></tr>
              <tr><td data-label="Step">3</td><td data-label="Rule">Read the base rate from the rate table.</td></tr>
              <tr><td data-label="Step">4</td><td data-label="Rule">Apply the selected rate-basis reduction, if any.</td></tr>
              <tr><td data-label="Step">5</td><td data-label="Rule">Floor the final rate at {MIN_ADJUSTED_RATE}%.</td></tr>
              <tr><td data-label="Step">6</td><td data-label="Rule">Generate the reducing-balance schedule using the final rate.</td></tr>
              <tr><td data-label="Step">7</td><td data-label="Rule">Sum schedule interest for total interest, then add principal for total payable.</td></tr>
            </tbody>
          </table>
        </div>

        <article className="formula-card">
          <pre>
{`finalRate = max(${MIN_ADJUSTED_RATE}%, baseRate - rateReduction)
totalInterest = sum(schedule interest)
totalPayable = principal + totalInterest
paymentPerCutoff = totalPayable / cutoffs`}
          </pre>
        </article>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">6. Examples</h2>
        <div className="table-wrap">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Base rate</th>
                <th>Standard</th>
                <th>Preferred</th>
                <th>Low-risk</th>
                <th>Relationship</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Loan">₱10,000 / 6 cutoffs</td>
                <td data-label="Base rate">7.5%</td>
                <td data-label="Standard">7.5%</td>
                <td data-label="Preferred">7%</td>
                <td data-label="Low-risk">6.5%</td>
                <td data-label="Relationship">6%</td>
              </tr>
              <tr>
                <td data-label="Loan">₱20,000 / 10 cutoffs</td>
                <td data-label="Base rate">7.5%</td>
                <td data-label="Standard">7.5%</td>
                <td data-label="Preferred">7%</td>
                <td data-label="Low-risk">6.5%</td>
                <td data-label="Relationship">6%</td>
              </tr>
              <tr>
                <td data-label="Loan">₱50,000 / 14 cutoffs</td>
                <td data-label="Base rate">5%</td>
                <td data-label="Standard">5%</td>
                <td data-label="Preferred">5%</td>
                <td data-label="Low-risk">5%</td>
                <td data-label="Relationship">5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
