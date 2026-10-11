import { describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import { parseImportCsv } from './csv-import'
import { analyzePeriods, findBaseline, type AnalysisTransaction } from './analysis'
import type { SummaryPeriod } from './summary'
import type { CategoryCode, TransactionKind } from './transactions'

function period(id: string, start: string, end: string): SummaryPeriod {
  return { id, period_start: start, period_end: end }
}

function transaction(
  importId: string,
  amountCents: number,
  categoryCode: CategoryCode = 'unknown',
  kind: TransactionKind = 'expense',
  date = importId === 'previous' ? '2025-12-01' : '2026-01-01',
): AnalysisTransaction {
  return {
    import_id: importId,
    date,
    amount_cents: amountCents,
    category_code: categoryCode,
    kind,
  }
}

describe('period comparison and insights', () => {
  it('matches both demo periods and emits the three agreed insights in order', () => {
    const april = period('april', '2026-04-01', '2026-04-30')
    const may = period('may', '2026-05-01', '2026-05-30')
    const rows = [
      ...parseImportCsv(aprilCsv, april.period_start, april.period_end)
        .map((row) => ({ ...row, import_id: april.id })),
      ...parseImportCsv(mayCsv, may.period_start, may.period_end)
        .map((row) => ({ ...row, import_id: may.id })),
    ]

    const result = analyzePeriods(may, [may, april], rows)

    expect(result.summary).toMatchObject({ expense_cents: 14_500, refund_cents: 500 })
    expect(result.comparison).toMatchObject({
      status: 'comparable',
      baseline_import_id: 'april',
      totals: {
        previous_cents: 9_000,
        current_cents: 14_500,
        delta_cents: 5_500,
        delta_percent: 61.11,
      },
    })
    expect(result.comparison.categories.map((category) => category.category_code)).toEqual([
      'dining', 'groceries', 'subscriptions', 'transport', 'unknown',
    ])
    expect(result.comparison.categories.find((category) => category.category_code === 'groceries'))
      .toMatchObject({ previous_cents: 6_000, current_cents: 9_000, delta_cents: 3_000, delta_percent: 50 })
    expect(result.insights.map((item) => item.code)).toEqual([
      'total_change', 'largest_category_increase', 'new_category_spend',
    ])
    expect(result.insights[1]).toMatchObject({
      category_code: 'groceries', delta_cents: 3_000, delta_percent: 50,
    })
    expect(result.insights[2]).toMatchObject({
      category_code: 'subscriptions', current_cents: 1_500, delta_percent: null,
    })
  })

  it('chooses the previous month even when periods were imported out of order', () => {
    const old = period('old', '2026-01-01', '2026-01-31')
    const near = period('near', '2026-02-01', '2026-02-28')
    const current = period('current', '2026-03-01', '2026-03-31')

    expect(findBaseline(current, [current, old, near])).toBe(near)
    expect(analyzePeriods(current, [current, old, near], []).comparison)
      .toMatchObject({ status: 'comparable', baseline_import_id: 'near' })
  })

  it('keeps the selected summary when there is no earlier period', () => {
    const current = period('current', '2026-01-01', '2026-01-01')
    const result = analyzePeriods(current, [current], [transaction('current', -500)])

    expect(result.summary.expense_cents).toBe(500)
    expect(result.comparison).toMatchObject({
      status: 'no_baseline', baseline_import_id: null, totals: null, categories: [],
    })
    expect(result.insights).toEqual([])
  })

  it('reports unequal duration before a gap when both problems exist', () => {
    const previous = period('previous', '2025-11-01', '2025-11-02')
    const current = period('current', '2025-12-20', '2026-01-05')
    const result = analyzePeriods(current, [previous, current], [])

    expect(result.comparison).toMatchObject({
      status: 'different_duration', baseline_import_id: 'previous', totals: null,
    })
    expect(result.insights).toEqual([])
  })

  it('reports a gap between equal-length periods', () => {
    const previous = period('previous', '2025-11-01', '2025-11-17')
    const current = period('current', '2025-12-20', '2026-01-05')

    expect(analyzePeriods(current, [current, previous], []).comparison)
      .toMatchObject({ status: 'gap', baseline_import_id: 'previous' })
  })

  it('uses null percentages when previous spending is zero', () => {
    const previous = period('previous', '2025-12-01', '2025-12-01')
    const current = period('current', '2026-01-01', '2026-01-01')
    const result = analyzePeriods(current, [previous, current], [
      transaction('previous', 100_000, 'unknown', 'income'),
      transaction('current', -100, 'unknown'),
    ])

    expect(result.comparison.totals).toMatchObject({
      previous_cents: 0, current_cents: 100, delta_percent: null,
    })
    expect(result.insights.map((item) => item.code)).toEqual([
      'total_change', 'new_category_spend',
    ])
    expect(result.insights[1].message).toContain('Tunnistamattomat menot')
  })

  it('returns no insights for unchanged spending and handles a decrease', () => {
    const previous = period('previous', '2025-12-01', '2025-12-01')
    const current = period('current', '2026-01-01', '2026-01-01')
    const unchanged = analyzePeriods(current, [previous, current], [
      transaction('previous', -100), transaction('current', -100),
    ])
    const decreased = analyzePeriods(current, [previous, current], [
      transaction('previous', -100), transaction('current', -25),
    ])

    expect(unchanged.insights).toEqual([])
    expect(decreased.comparison.totals).toMatchObject({
      delta_cents: -75, delta_percent: -75,
    })
    expect(decreased.insights.map((item) => item.code)).toEqual(['total_change'])
  })

  it('breaks equal category increases and new spending by category code', () => {
    const previous = period('previous', '2025-12-01', '2025-12-01')
    const current = period('current', '2026-01-01', '2026-01-01')
    const result = analyzePeriods(current, [previous, current], [
      transaction('previous', -100, 'dining'),
      transaction('previous', -100, 'groceries'),
      transaction('current', -200, 'dining'),
      transaction('current', -200, 'groceries'),
      transaction('current', -50, 'subscriptions'),
      transaction('current', -50, 'transport'),
    ])

    expect(result.insights[1].category_code).toBe('dining')
    expect(result.insights[2].category_code).toBe('subscriptions')
  })

  it('compares matching days from a full prior import, including both boundary days only', () => {
    const previous = period('previous', '2026-04-01', '2026-04-30')
    const current = period('current', '2026-05-05', '2026-05-15')
    const rows = [
      transaction('previous', -10_000, 'groceries', 'expense', '2026-04-04'),
      transaction('previous', -1_000, 'groceries', 'expense', '2026-04-05'),
      transaction('previous', -2_000, 'groceries', 'expense', '2026-04-15'),
      transaction('previous', -20_000, 'groceries', 'expense', '2026-04-16'),
      transaction('current', -4_000, 'groceries', 'expense', '2026-05-10'),
    ]
    const result = analyzePeriods(current, [current, previous], rows)

    expect(result.comparison).toMatchObject({
      status: 'comparable', mode: 'previous_month', baseline_import_id: 'previous',
      baseline_period: { period_start: '2026-04-05', period_end: '2026-04-15' },
      totals: { previous_cents: 3_000, current_cents: 4_000, delta_cents: 1_000, delta_percent: 33.33 },
    })
    expect(result.summary.expense_cents).toBe(4_000)
    expect(result.insights[1]).toMatchObject({ previous_cents: 3_000, delta_cents: 1_000 })
  })

  it.each([
    ['2026-05-01', '2026-05-31', '2026-06-01', '2026-06-30'],
    ['2024-02-01', '2024-02-29', '2024-03-01', '2024-03-31'],
    ['2025-12-01', '2025-12-31', '2026-01-01', '2026-01-31'],
  ])('compares complete calendar months %s–%s and %s–%s without normalization', (start, end, currentStart, currentEnd) => {
    const previous = period('previous', start, end)
    const current = period('current', currentStart, currentEnd)
    const result = analyzePeriods(current, [current, previous], [
      transaction('previous', -1_000, 'groceries', 'expense', start),
      transaction('current', -1_500, 'groceries', 'expense', currentEnd),
    ])
    expect(result.comparison).toMatchObject({
      status: 'comparable', baseline_period: { period_start: start, period_end: end },
      totals: { previous_cents: 1_000, current_cents: 1_500, delta_cents: 500, delta_percent: 50 },
    })
  })

  it('reports missing coverage rather than interpreting missing days as zero', () => {
    const previous = period('previous', '2026-04-02', '2026-04-30')
    const current = period('current', '2026-05-01', '2026-05-15')
    const result = analyzePeriods(current, [previous, current], [])

    expect(result.comparison).toMatchObject({
      status: 'incomplete_baseline', baseline_import_id: null, totals: null,
      baseline_period: { period_start: '2026-04-01', period_end: '2026-04-15' },
    })
    expect(result.insights).toEqual([])
  })

  it('does not fall back to older months or combine separate imports to fill coverage', () => {
    const current = period('current', '2026-05-01', '2026-05-15')
    const older = period('older', '2026-03-01', '2026-03-31')
    const firstHalf = period('first', '2026-04-01', '2026-04-07')
    const secondHalf = period('second', '2026-04-08', '2026-04-15')

    expect(analyzePeriods(current, [current, older], []).comparison.status).toBe('incomplete_baseline')
    expect(analyzePeriods(current, [current, secondHalf, firstHalf], []).comparison.status)
      .toBe('incomplete_baseline')
  })

  it('finds a covering import rather than a closer non-covering import', () => {
    const current = period('current', '2026-05-01', '2026-05-15')
    const covering = period('covering', '2026-04-01', '2026-04-15')
    const closer = period('closer', '2026-04-16', '2026-04-30')

    expect(analyzePeriods(current, [closer, current, covering], []).comparison)
      .toMatchObject({ status: 'comparable', baseline_import_id: 'covering' })
  })

  it('keeps partial dates exact when the previous month has fewer days', () => {
    const previous = period('previous', '2026-02-01', '2026-02-28')
    const current = period('current', '2026-03-01', '2026-03-30')

    expect(analyzePeriods(current, [previous, current], []).comparison)
      .toMatchObject({ status: 'unavailable_dates', totals: null, baseline_period: null })
  })

  it('retains the original comparison for consecutive cross-month custom periods', () => {
    const previous = period('previous', '2025-12-15', '2026-01-14')
    const current = period('current', '2026-01-15', '2026-02-14')
    expect(analyzePeriods(current, [current, previous], []).comparison)
      .toMatchObject({ status: 'comparable', mode: 'consecutive_periods' })
  })
})
