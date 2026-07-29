'use client'

import { useEffect, useRef, useState } from 'react'
import { DashboardMonthlyProfitDetailDialog, DashboardMonthlyProfitTable } from '@/components/dashboard/dashboard-monthly-profit-details'
import { DashboardProfitByMonthChartLoader } from '@/components/dashboard/dashboard-profit-by-month-chart-loader'
import { Select } from '@/components/shared'
import { formatCurrency } from '@/lib/format'
import {
  buildDashboardProfitGrowthData,
  type DashboardProfitGrowthData,
} from '@/components/dashboard/dashboard-overview-data'
import type { DashboardMonthlyProfitDetailResponse, DashboardMonthlyProfitRow } from '@/lib/types/lending'
import { getDashboardMonthlyProfit, getDashboardMonthlyProfitDetails } from '@/services/dashboard'
import { DASHBOARD_PROFIT_GROWTH_DESCRIPTION, DASHBOARD_PROFIT_GROWTH_TITLE } from './dashboard-copy'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function GrowthMetric({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <article className={dashboardClass('dashboard-overview__miniCard')}>
      <span className={dashboardClass('dashboard-overview__statLabel')}>{label}</span>
      <strong className={dashboardClass('dashboard-overview__miniValue')}>{value}</strong>
      <span className={dashboardClass('dashboard-overview__miniMeta')}>{meta}</span>
    </article>
  )
}

function formatMonthOverMonth(data: DashboardProfitGrowthData) {
  const { percentageChange, trend } = data.monthOverMonth

  if (trend === 'new_growth') {
    return 'New growth'
  }

  if (trend === 'no_change' || percentageChange === null) {
    return 'No change'
  }

  const sign = percentageChange > 0 ? '+' : ''
  return `${sign}${percentageChange.toFixed(2)}%`
}

export function DashboardProfitGrowth({
  currentYear,
  data,
  fallbackCurrency,
  yearOptions,
}: {
  currentYear: number
  data: DashboardProfitGrowthData | null
  fallbackCurrency: string
  yearOptions: number[]
}) {
  const initialYear = data?.year ?? yearOptions[0] ?? currentYear
  const dataByYearRef = useRef(new Map<number, DashboardProfitGrowthData>(
    data ? [[data.year, data]] : [],
  ))
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [activeData, setActiveData] = useState(data)
  const [profitError, setProfitError] = useState<string | null>(null)
  const [isProfitLoading, setIsProfitLoading] = useState(false)
  const [selectedRow, setSelectedRow] = useState<DashboardMonthlyProfitRow | null>(null)
  const [detail, setDetail] = useState<DashboardMonthlyProfitDetailResponse | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

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
    setSelectedRow(null)
    const cachedData = dataByYearRef.current.get(selectedYear)
    if (cachedData) {
      setActiveData(cachedData)
      setProfitError(null)
      setIsProfitLoading(false)
      return
    }

    let isActive = true
    setActiveData(null)
    setProfitError(null)
    setIsProfitLoading(true)

    void getDashboardMonthlyProfit(selectedYear)
      .then((response) => {
        if (!isActive) {
          return
        }

        const nextData = buildDashboardProfitGrowthData(response)
        dataByYearRef.current.set(selectedYear, nextData)
        setActiveData(nextData)
      })
      .catch((error: unknown) => {
        if (isActive) {
          setProfitError(error instanceof Error ? error.message : 'Unable to load monthly profit')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsProfitLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedYear])

  useEffect(() => {
    if (!selectedRow) {
      setDetail(null)
      setDetailError(null)
      setIsDetailLoading(false)
      return
    }

    let isActive = true
    const month = Number(selectedRow.monthKey.slice(5, 7))
    const year = Number(selectedRow.monthKey.slice(0, 4))
    setDetail(null)
    setDetailError(null)
    setIsDetailLoading(true)

    void getDashboardMonthlyProfitDetails(year, month)
      .then((response) => {
        if (isActive) {
          setDetail(response)
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setDetailError(error instanceof Error ? error.message : 'Unable to load monthly profit details')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsDetailLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedRow])

  const currency = activeData?.currency ?? fallbackCurrency
  const currentMonth = activeData && activeData.elapsedMonthCount > 0
    ? activeData.rows[activeData.elapsedMonthCount - 1]
    : null
  const previousMonth = activeData && activeData.elapsedMonthCount > 1
    ? activeData.rows[activeData.elapsedMonthCount - 2]
    : null
  const isCurrentYear = activeData?.year === currentYear
  const isFutureYear = typeof activeData?.year === 'number' && activeData.year > currentYear

  return (
    <section className={dashboardClass('dashboard-overview__operator')}>
      <div className={dashboardClass('dashboard-overview__operatorHeader')}>
        <div>
          <h2 className="section-title title-offset">{DASHBOARD_PROFIT_GROWTH_TITLE}</h2>
          <p className="muted">{DASHBOARD_PROFIT_GROWTH_DESCRIPTION}</p>
        </div>
        <Select
          id="dashboard-profit-growth-year"
          label="Year"
          value={String(selectedYear)}
          disabled={isProfitLoading}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className={dashboardClass('dashboard-overview__yearSelect')}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </Select>
      </div>

      {isProfitLoading ? (
        <section className={dashboardClass('dashboard-overview__interestCard')} aria-busy="true">
          <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')} role="status" aria-live="polite">
            <div>
              <strong>Loading {selectedYear} profit</strong>
              <p>Collecting posted interest and penalty totals for the selected year.</p>
            </div>
          </div>
        </section>
      ) : profitError ? (
        <section className={dashboardClass('dashboard-overview__interestCard')}>
          <div className="notice" role="alert">{profitError}</div>
        </section>
      ) : !activeData ? (
        <section className={dashboardClass('dashboard-overview__interestCard')}>
          <div className="notice" role="alert">
            Monthly profit is unavailable. Other dashboard totals are still current; refresh to try this section again.
          </div>
        </section>
      ) : (
        <>
          <section className={dashboardClass('dashboard-overview__miniGrid', 'dashboard-overview__miniGrid--five')} aria-label="Growth KPIs at a glance">
            <GrowthMetric
              label={isCurrentYear ? 'YTD Collected Profit' : `${activeData.year} Collected Profit`}
              value={formatMinorCurrency(activeData.ytdCollectedProfitMinor, currency)}
              meta={isFutureYear ? 'No collections yet' : `Interest and penalties through ${currentMonth?.monthLabel ?? activeData.year}`}
            />
            <GrowthMetric
              label="Avg Monthly Collected Profit"
              value={formatMinorCurrency(activeData.averageMonthlyProfitMinor, currency)}
              meta={activeData.elapsedMonthCount > 0
                ? `Across ${activeData.elapsedMonthCount.toLocaleString('en-PH')} month${activeData.elapsedMonthCount === 1 ? '' : 's'}`
                : 'No elapsed months'}
            />
            <GrowthMetric
              label="Scheduled Interest Due"
              value={formatMinorCurrency(activeData.scheduledInterestDueMinor, currency)}
              meta={`Avg monthly expected: ${formatMinorCurrency(activeData.averageMonthlyInterestDueMinor, currency)}`}
            />
            <GrowthMetric
              label="Best Month"
              value={formatMinorCurrency(activeData.bestMonth?.netProfitMinor ?? activeData.bestMonth?.totalProfitMinor ?? 0, currency)}
              meta={activeData.bestMonth ? `${activeData.bestMonth.monthLabel} ${activeData.year}` : 'No collected profit yet'}
            />
            <GrowthMetric
              label={isCurrentYear ? 'This Month vs Last Month' : isFutureYear ? 'Month-over-month' : `${currentMonth?.monthLabel ?? 'Latest'} vs ${previousMonth?.monthLabel ?? 'Prior'}`}
              value={isFutureYear ? 'Not started' : formatMonthOverMonth(activeData)}
              meta={isFutureYear
                ? 'No payment months elapsed'
                : `${currentMonth?.monthLabel ?? 'Current'} ${formatMinorCurrency(activeData.monthOverMonth.currentMonthProfitMinor, currency)} vs ${previousMonth?.monthLabel ?? 'prior'} ${formatMinorCurrency(activeData.monthOverMonth.previousMonthProfitMinor, currency)}`}
            />
          </section>

          <section className={dashboardClass('dashboard-overview__interestCard')}>
            <div className={dashboardClass('dashboard-overview__tableCardHeader')}>
              <div>
                <h3>Monthly collected profit</h3>
                <p>Interest and penalties received across {activeData.year}. The average includes zero-profit months.</p>
              </div>
            </div>

            {activeData.hasCollectedProfit || activeData.hasInterestDue ? (
              <DashboardProfitByMonthChartLoader
                averageMonthlyProfitMinor={activeData.averageMonthlyProfitMinor}
                currency={currency}
                rows={activeData.rows}
                showInterestDue
              />
            ) : (
              <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
                <span className={dashboardClass('dashboard-overview__emptyIcon', 'dashboard-overview__emptyIcon--text')}>+</span>
                <div>
                  <strong>No profit or interest due for {activeData.year}</strong>
                  <p>Scheduled interest and posted collections will appear here when data becomes available.</p>
                </div>
              </div>
            )}

            <DashboardMonthlyProfitTable
              currency={currency}
              rows={activeData.rows}
              onSelectMonth={setSelectedRow}
            />
          </section>

          <DashboardMonthlyProfitDetailDialog
            currency={currency}
            detail={detail}
            error={detailError}
            loading={isDetailLoading}
            selectedRow={selectedRow}
            onClose={() => setSelectedRow(null)}
          />
        </>
      )}
    </section>
  )
}
