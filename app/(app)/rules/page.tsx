import { loanRules } from '@/content/rules'

export default function RulesPage() {
  return (
    <div className="stack">
      <section className="card panel stack">
        <h1 className="display-title">
          Loan business rules
        </h1>
        <p className="muted">
          This page writes the rules in semantic HTML so the policy can be reviewed, copied, or printed without relying on chat formatting.
        </p>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">1. Payment schedule</h2>
        <table className="rule-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1 give</td><td>1 payment</td></tr>
            <tr><td>2 gives</td><td>2 payments</td></tr>
            <tr><td>Cutoff</td><td>Scheduled payment slot</td></tr>
            <tr><td>Payment dates</td><td>Borrower chooses monthly or semi-monthly dates when the loan is created.</td></tr>
            <tr><td>Equal payment</td><td>All scheduled payments are equal except the final rounding adjustment that makes the ending balance exactly zero.</td></tr>
          </tbody>
        </table>

        <div className="notice">
          A give means one scheduled payment. Example: 2 gives = 2 cutoffs, 4 gives = 4 cutoffs, 6 gives = 6 cutoffs.
        </div>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">2. Interest rate rules per cutoff</h2>
        <table className="rule-table">
          <thead>
            <tr>
              <th>Loan amount</th>
              <th>Gives</th>
              <th>Interest</th>
            </tr>
          </thead>
          <tbody>
            {loanRules.interestRules.map((rule) => (
              <tr key={`${rule.loanBand}-${rule.gives}`}>
                <td>{rule.loanBand}</td>
                <td>{rule.gives}</td>
                <td>{rule.interest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">3. Calculation method</h2>
        <table className="rule-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Schedule behavior</th>
              <th>Typical use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Reducing balance</td>
              <td>Interest is charged on the outstanding principal and payments amortize the balance to zero.</td>
              <td>Default installment loan.</td>
            </tr>
            <tr>
              <td>Flat rate</td>
              <td>Interest is constant every cutoff because it is based on the original principal.</td>
              <td>Simple fixed-fee repayment schedules.</td>
            </tr>
            <tr>
              <td>Interest only</td>
              <td>Early cutoffs collect interest only; principal is paid by bullet payoff or later amortization.</td>
              <td>Short bridge loans or delayed principal repayment.</td>
            </tr>
            <tr>
              <td>Simple interest</td>
              <td>Interest is recalculated from current principal each cutoff without compounding.</td>
              <td>Equal-principal or equal-payment simple-interest products.</td>
            </tr>
            <tr>
              <td>Fixed Total Interest</td>
              <td>Interest is calculated once for the whole loan term, then spread across all cutoffs.</td>
              <td>Loans with a known total interest amount for the full term.</td>
            </tr>
          </tbody>
        </table>

        <article className="formula-card">
          <h3 className="section-title">Rate period</h3>
          <pre>
{`Most configured rates on this page are per cutoff.
Fixed Total Interest uses a whole-loan rate for the full loan term.
The selected calculation method changes how principal and interest are scheduled,
and the preview labels the rate period used for the selected method.`}
          </pre>
        </article>

        <article className="formula-card">
          <h3 className="section-title">Fixed Total Interest example</h3>
          <pre>
{`PHP 20,000 x 20% = PHP 4,000 total interest.
PHP 20,000 + PHP 4,000 = PHP 24,000 total payable.
Over 12 cutoffs, payment is PHP 2,000 per cutoff.

This is different from flat rate per cutoff.
A 20% fixed total interest rate over 12 cutoffs is not 20% per cutoff.`}
          </pre>
        </article>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">4. Loan schedule table output</h2>
        <p className="muted">The application should show these table headers for every generated schedule.</p>
        <table className="rule-table">
          <thead>
            <tr>
              {loanRules.scheduleTableHeaders.map((header) => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={loanRules.scheduleTableHeaders.length}>
                Totals must include total interest and total payment. The result must be easy to copy into Excel.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">5. Reminder rule</h2>
        <p className="muted">
          Reminder generation follows the selected payment schedule. If the loan is monthly, reminders follow the monthly payment day.
          If the loan is twice monthly, reminders follow both selected payment dates, including month end when chosen.
        </p>
      </section>

      <section className="card panel stack">
        <h2 className="section-title">6. Quick decision guide</h2>
        <table className="rule-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Interest</th>
            </tr>
          </thead>
          <tbody>
            {loanRules.decisionGuide.map((rule) => (
              <tr key={rule.scenario}>
                <td>{rule.scenario}</td>
                <td>{rule.interest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
