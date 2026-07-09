import styles from './offline.module.css'

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="offline-title">
        <span className={styles.mark} aria-hidden="true" />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Offline</p>
          <h1 id="offline-title">FiMana needs a connection</h1>
          <p>
            Loan, borrower, payment, and treasury records are kept live to avoid showing stale financial data. Reconnect to continue working.
          </p>
        </div>
      </section>
    </main>
  )
}
