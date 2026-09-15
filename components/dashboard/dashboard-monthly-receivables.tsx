'use client'

import { useEffect, useRef, useState } from 'react'
import { DashboardProfitByMonthChartLoader } from '@/components/dashboard/dashboard-profit-by-month-chart-loader'
import {
  buildDashboardMonthlyReceivablesData,
  type DashboardMonthlyReceivablesData,
} from '@/components/dashboard/dashboard-overview-data'
import { Select } from '@/components/shared'
import { getDashboardMonthlyProfit } from '@/services/dashboard'
import {
  DASHBOARD_MONTHLY_RECEIVABLES_DESCRIPTION,
  DASHBOARD_MONTHLY_RECEIVABLES_TITLE,
} from './dashboard-copy'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

export function DashboardMonthlyReceivables({
  currentYear,
  data,
  fallbackCurrency,
  yearOptions,
}: {
  currentYear: number
  data: DashboardMonthlyReceivablesData | null
  fallbackCurrency: string
  yearOptions: number[]
}) {
  const initialYear = data?.year ?? yearOptions[0] ?? currentYear
  const dataByYearRef = useRef(new Map<number, DashboardMonthlyReceivablesData>(
    data ? [[data.year, data]] : [],
  ))
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [activeData, setActiveData] = useState(data)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!data) {
      return
    }

    dataByYearRef.current.set(data.year, data)
    if (selectedYear === data.year) {
      setActiveData(data)
    }
  }, [data, selectedYear])

  useEffect(() => {
    const cachedData = dataByYearRef.current.get(selectedYear)
    if (cachedData) {
      setActiveData(cachedData)
      setError(null)
      setIsLoading(false)
      return
    }

    let isActive = true
    setActiveData(null)
    setError(null)
    setIsLoading(true)

    void getDashboardMonthlyProfit(selectedYear)
      .then((response) => {
        if (!isActive) {
          return
        }

        const nextData = buildDashboardMonthlyReceivablesData(response)
        dataByYearRef.current.set(selectedYear, nextData)
        setActiveData(nextData)
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unable to load monthly receivables')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedYear])

  const currency = activeData?.currency ?? fallbackCurrency

  return (
    <section className={dashboardClass('dashboard-overview__operator')}>
      <div className={dashboardClass('dashboard-overview__operatorHeader')}>
        <div>
          <h2 className="section-title title-offset">{DASHBOARD_MONTHLY_RECEIVABLES_TITLE}</h2>
          <p className="muted">{DASHBOARD_MONTHLY_RECEIVABLES_DESCRIPTION}</p>
        </div>
        <Select
          id="dashboard-monthly-receivables-year"
          label="Year"
          value={String(selectedYear)}
          disabled={isLoading}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className={dashboardClass('dashboard-overview__yearSelect')}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <section className={dashboardClass('dashboard-overview__interestCard')} aria-busy="true">
          <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')} role="status" aria-live="polite">
            <div>
              <strong>Loading {selectedYear} receivables</strong>
              <p>Comparing scheduled receivables with posted collections for the selected year.</p>
            </div>
          </div>
        </section>
      ) : error ? (
        <section className={dashboardClass('dashboard-overview__interestCard')}>
          <div className="notice" role="alert">{error}</div>
        </section>
      ) : !activeData ? (
        <section className={dashboardClass('dashboard-overview__interestCard')}>
          <div className="notice" role="alert">
            Monthly receivables are unavailable. Other dashboard totals are still current; refresh to try this section again.
          </div>
        </section>
      ) : (
        <section className={dashboardClass('dashboard-overview__interestCard')}>
          <div className={dashboardClass('dashboard-overview__tableCardHeader')}>
            <div>
              <h3>Monthly receivables</h3>
              <p>Actual collections are recorded by payment month. The current month&apos;s expected target is prorated through today.</p>
            </div>
          </div>

          {activeData.hasReceivables ? (
            <DashboardProfitByMonthChartLoader
              currency={currency}
              rows={activeData.rows}
              variant="receivables"
            />
          ) : (
            <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
              <span className={dashboardClass('dashboard-overview__emptyIcon', 'dashboard-overview__emptyIcon--text')}>+</span>
              <div>
                <strong>No receivables for {activeData.year}</strong>
                <p>Scheduled installments and posted collections will appear here when data becomes available.</p>
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  )
}
