import { describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import { parseImportCsv } from './csv-import'
import { calculateSummary, type SummaryPeriod } from './summary'

function period(id: string, periodStart: string, periodEnd: string): SummaryPeriod {
  return { id, period_start: periodStart, period_end: periodEnd }
}

describe('spending summary', () => {
  it('calculates the agreed demo totals without counting income or transfers', () => {
    const april = calculateSummary(
      period('april', '2026-04-01', '2026-04-30'),
      parseImportCsv(aprilCsv, '2026-04-01', '2026-04-30'),
    )
    const may = calculateSummary(
      period('may', '2026-05-01', '2026-05-31'),
      parseImportCsv(mayCsv, '2026-05-01', '2026-05-31'),
    )

    expect(april).toMatchObject({ expense_cents: 9_000, refund_cents: 500 })
    expect(may).toMatchObject({ expense_cents: 14_500, refund_cents: 500 })
    expect(april.categories).toEqual([
      { category_code: 'groceries', name: 'Ruokakauppa', expense_cents: 6_000 },
      { category_code: 'dining', name: 'Ravintolat', expense_cents: 2_000 },
      { category_code: 'transport', name: 'Liikenne', expense_cents: 500 },
      { category_code: 'unknown', name: 'Tunnistamattomat', expense_cents: 500 },
      { category_code: 'subscriptions', name: 'Tilaukset', expense_cents: 0 },
    ])
  })

  it('includes unknown expenses as their own category', () => {
    const summary = calculateSummary(period('unknown', '2026-06-01', '2026-06-30'), [
      { amount_cents: -275, kind: 'expense', category_code: 'unknown' },
    ])

    expect(summary.expense_cents).toBe(275)
    expect(summary.categories[0]).toEqual({
      category_code: 'unknown',
      name: 'Tunnistamattomat',
      expense_cents: 275,
    })
  })

  it('returns zero expenses and refunds for an income-only period', () => {
    const summary = calculateSummary(period('income', '2026-07-01', '2026-07-31'), [
      { amount_cents: 200_000, kind: 'income', category_code: 'unknown' },
      { amount_cents: -10_000, kind: 'transfer', category_code: 'unknown' },
    ])

    expect(summary.expense_cents).toBe(0)
    expect(summary.refund_cents).toBe(0)
    expect(summary.categories.every((category) => category.expense_cents === 0)).toBe(
      true,
    )
  })
})
