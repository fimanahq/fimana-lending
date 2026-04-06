import { loanRules } from '@/content/rules'

export default function RulesPage() {
  return (
    <div className="stack">
      <section className="card panel stack">
        <div className="eyebrow">Policy document</div>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
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
            <tr><td>Payment dates</td><td>Borrower chooses monthly or twice-monthly dates when the loan is created.</td></tr>
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
              <th>Rule</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Method</td><td>Reducing balance</td></tr>
            <tr><td>Payment type</td><td>Equal amortization</td></tr>
            <tr><td>Interest</td><td>Applied every cutoff</td></tr>
            <tr><td>Balance</td><td>Must become 0 at the last payment</td></tr>
          </tbody>
        </table>

        <article className="card panel" style={{ boxShadow: 'none' }}>
          <h3 className="section-title">Formula</h3>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`PMT = P * r * (1 + r)^n / ((1 + r)^n - 1)

Where:
P = loan amount
r = interest per cutoff
n = number of gives`}
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
