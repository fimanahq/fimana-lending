import { describe, expect, it } from 'vitest'
import type { DashboardMonthlyProfitResponse, DashboardMonthlyProfitSource, LoanDashboardSummary } from '@/lib/types/lending'
import { buildDashboardOverviewData, buildDashboardProfitGrowthData } from './dashboard-overview-data'

function monthlyProfit(
  year: number,
  rows: DashboardMonthlyProfitSource[],
): DashboardMonthlyProfitResponse {
  return {
    year,
    currency: 'PHP',
    timezone: 'Asia/Manila',
    rows,
  }
}

function row(
  monthKey: string,
  overrides: Partial<Omit<DashboardMonthlyProfitSource, 'monthKey'>> = {},
): DashboardMonthlyProfitSource {
  return {
    monthKey,
    interestDueMinor: 0,
    interestCollectedMinor: 0,
    penaltyCollectedMinor: 0,
    totalProfitMinor: 0,
    paymentCount: 0,
    ...overrides,
  }
}

describe('buildDashboardProfitGrowthData', () => {
  it('divides full-year scheduled interest by 12', () => {
    const data = buildDashboardProfitGrowthData(monthlyProfit(2026, [
      row('2026-01', { interestDueMinor: 120_000 }),
      row('2026-12', { interestDueMinor: 240_000 }),
    ]), new Date('2026-06-15T12:00:00Z'))

    expect(data.scheduledInterestDueMinor).toBe(360_000)
    expect(data.averageMonthlyInterestDueMinor).toBe(30_000)
  })

  it('continues to divide collected profit by elapsed months', () => {
    const data = buildDashboardProfitGrowthData(monthlyProfit(2026, [
      row('2026-01', { interestCollectedMinor: 9_000, penaltyCollectedMinor: 1_000, totalProfitMinor: 10_000 }),
      row('2026-02', { interestCollectedMinor: 20_000, totalProfitMinor: 20_000 }),
      row('2026-06', { interestCollectedMinor: 30_000, totalProfitMinor: 30_000 }),
    ]), new Date('2026-06-15T12:00:00Z'))

    expect(data.elapsedMonthCount).toBe(6)
    expect(data.ytdCollectedProfitMinor).toBe(60_000)
    expect(data.averageMonthlyProfitMinor).toBe(10_000)
  })

  it('preserves excess profit and Treasury interest for graph breakdowns', () => {
    const data = buildDashboardProfitGrowthData(monthlyProfit(2026, [
      row('2026-03', {
        interestCollectedMinor: 10_000,
        penaltyCollectedMinor: 2_000,
        excessProfitMinor: 3_000,
        treasuryInterestEarnedMinor: 500,
        totalProfitMinor: 15_500,
      }),
    ]), new Date('2026-03-15T12:00:00Z'))

    expect(data.rows[2]).toEqual(expect.objectContaining({
      excessProfitMinor: 3_000,
      treasuryInterestEarnedMinor: 500,
      totalProfitMinor: 15_500,
    }))
    expect(data.ytdCollectedProfitMinor).toBe(15_500)
  })

  it('returns zero expected average when scheduled interest is zero', () => {
    const data = buildDashboardProfitGrowthData(
      monthlyProfit(2026, []),
      new Date('2026-06-15T12:00:00Z'),
    )

    expect(data.scheduledInterestDueMinor).toBe(0)
    expect(data.averageMonthlyInterestDueMinor).toBe(0)
  })

  it('uses 12 months for future-year expected profit while collected average remains zero', () => {
    const data = buildDashboardProfitGrowthData(monthlyProfit(2027, [
      row('2027-03', { interestDueMinor: 144_000 }),
    ]), new Date('2026-06-15T12:00:00Z'))

    expect(data.elapsedMonthCount).toBe(0)
    expect(data.averageMonthlyInterestDueMinor).toBe(12_000)
    expect(data.averageMonthlyProfitMinor).toBe(0)
  })

  it('does not include collected penalties in the expected average', () => {
    const withoutPenalty = buildDashboardProfitGrowthData(monthlyProfit(2026, [
      row('2026-01', { interestDueMinor: 120_000, interestCollectedMinor: 10_000, totalProfitMinor: 10_000 }),
    ]), new Date('2026-01-15T12:00:00Z'))
    const withPenalty = buildDashboardProfitGrowthData(monthlyProfit(2026, [
      row('2026-01', {
        interestDueMinor: 120_000,
        interestCollectedMinor: 10_000,
        penaltyCollectedMinor: 50_000,
        totalProfitMinor: 60_000,
      }),
    ]), new Date('2026-01-15T12:00:00Z'))

    expect(withoutPenalty.averageMonthlyInterestDueMinor).toBe(10_000)
    expect(withPenalty.averageMonthlyInterestDueMinor).toBe(10_000)
    expect(withPenalty.averageMonthlyProfitMinor).toBe(60_000)
  })
})

describe('buildDashboardOverviewData', () => {
  it('keeps collected active-loan profit outside the current receivable mix', () => {
    const data = buildDashboardOverviewData({
      applications: [],
      summary: {
        moneyWithBorrowersMinor: 300_000,
        activeCollectedProfitMinor: 50_000,
        remainingProjectedProfitMinor: 30_000,
      } as LoanDashboardSummary,
    })

    expect(data.activeLoanBalanceSegments).toEqual([
      expect.objectContaining({
        key: 'capital_in_active_loans',
        valueMinor: 300_000,
        percentage: (300_000 / 330_000) * 100,
      }),
      expect.objectContaining({
        key: 'incoming_interest',
        valueMinor: 30_000,
        percentage: (30_000 / 330_000) * 100,
      }),
    ])
    expect(data.activeLoanBalanceSegments).toHaveLength(2)
  })
})
