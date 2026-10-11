import { describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import sPankkiCsv from '../../tests/fixtures/s-pankki-demo-2026-06.csv?raw'
import sPankkiHalfCsv from '../../tests/fixtures/s-pankki-demo-2026-07-half.csv?raw'
import { CsvImportValidationError, parseImportCsv } from './csv-import'
import { calculateSummary } from './summary'

function validationError(action: () => unknown): CsvImportValidationError {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(CsvImportValidationError)
    return error as CsvImportValidationError
  }
  throw new Error('Expected CSV validation to fail.')
}

describe('CSV import domain', () => {
  it('parses both fictional demo periods with the expected categories and totals', () => {
    const april = parseImportCsv(aprilCsv, '2026-04-01', '2026-04-30')
    const may = parseImportCsv(mayCsv, '2026-05-01', '2026-05-31')

    expect(april).toHaveLength(9)
    expect(may).toHaveLength(9)
    expect(
      april.filter((row) => row.kind === 'expense').reduce(
        (sum, row) => sum + row.amount_cents,
        0,
      ),
    ).toBe(-9_000)
    expect(
      may.filter((row) => row.kind === 'expense').reduce(
        (sum, row) => sum + row.amount_cents,
        0,
      ),
    ).toBe(-14_500)
    expect(april.find((row) => row.description === 'Demo Bus')?.category_code).toBe(
      'transport',
    )
    expect(may.find((row) => row.description === 'Demo Stream')?.category_code).toBe(
      'subscriptions',
    )
  })

  it('handles BOM, quotes, semicolons, line breaks, empty records and Finnish letters', () => {
    const csv =
      '\uFEFFdate;description;amount;kind\n' +
      '2026-04-02;"  Demo   Market  ";-12.50;expense\n' +
      '\n' +
      '2026-04-03;"Ääkköset; ja\nrivinvaihto";-7.25;expense\n'

    const rows = parseImportCsv(csv, '2026-04-01', '2026-04-30')

    expect(rows).toMatchObject([
      {
        source_row: 2,
        description: 'Demo   Market',
        amount_cents: -1_250,
        category_code: 'groceries',
      },
      {
        source_row: 4,
        description: 'Ääkköset; ja\nrivinvaihto',
        amount_cents: -725,
        category_code: 'unknown',
      },
    ])
  })

  it('recognizes the S-Pankki field layout and normalizes fictional transactions', () => {
    const rows = parseImportCsv(sPankkiCsv, '2026-06-01', '2026-06-30')

    expect(rows).toHaveLength(9)
    expect(rows.slice(0, 3)).toMatchObject([
      {
        source_row: 2,
        date: '2026-06-02',
        description: 'Demo Market',
        amount_cents: -3_000,
        kind: 'expense',
        category_code: 'groceries',
      },
      {
        source_row: 3,
        date: '2026-06-05',
        description: 'Demo Cafe',
        amount_cents: -1_250,
        kind: 'expense',
        category_code: 'dining',
      },
      {
        source_row: 4,
        date: '2026-06-15',
        description: 'Demo Employer',
        amount_cents: 200_000,
        kind: 'income',
        category_code: 'unknown',
      },
    ])
  })

  // Keep every public demo small, but cover real import and comparison boundaries.
  it.each([
    { name: 'April', csv: aprilCsv, start: '2026-04-01', end: '2026-04-30',
      expenses: 9_000, refunds: 500, firstHalf: 7_500, firstDay: 1_000, lastDay: 500 },
    { name: 'May', csv: mayCsv, start: '2026-05-01', end: '2026-05-31',
      expenses: 14_500, refunds: 500, firstHalf: 12_500, firstDay: 2_000, lastDay: 1_500 },
    { name: 'June', csv: sPankkiCsv, start: '2026-06-01', end: '2026-06-30',
      expenses: 12_500, refunds: 0, firstHalf: 9_500, firstDay: 750, lastDay: 500 },
    { name: 'July half-month', csv: sPankkiHalfCsv, start: '2026-07-01', end: '2026-07-15',
      expenses: 9_000, refunds: 0, firstHalf: 9_000, firstDay: 500, lastDay: 1_000 },
  ])('keeps the $name fixture balanced and hand-checkable', (demo) => {
    const rows = parseImportCsv(demo.csv, demo.start, demo.end)
    const summary = calculateSummary(
      { id: demo.name, period_start: demo.start, period_end: demo.end }, rows,
    )
    const expensesOn = (matches: (date: string) => boolean) => -rows
      .filter((row) => row.kind === 'expense' && matches(row.date))
      .reduce((sum, row) => sum + row.amount_cents, 0)

    expect(rows).toHaveLength(9)
    expect(summary).toMatchObject({ expense_cents: demo.expenses, refund_cents: demo.refunds })
    expect(summary.categories.find((item) => item.category_code === 'unknown')?.expense_cents)
      .toBe(500)
    expect(rows.filter((row) => row.kind === 'income').map((row) => row.amount_cents))
      .toEqual([200_000])
    expect(expensesOn((date) => date.slice(8) <= '15')).toBe(demo.firstHalf)
    expect(expensesOn((date) => date === demo.start)).toBe(demo.firstDay)
    expect(expensesOn((date) => date === demo.end)).toBe(demo.lastDay)

    // Two same-day, same-amount purchases are valid rows, not accidental duplicates.
    const marketPurchases = rows.filter((row) =>
      row.description === 'Demo Market' && row.kind === 'expense',
    )
    const matchingPurchases = marketPurchases.filter((row) =>
      row.date === marketPurchases[0].date && row.amount_cents === marketPurchases[0].amount_cents,
    )
    expect(matchingPurchases).toHaveLength(2)
    expect(new Set(rows.map((row) => row.source_row)).size).toBe(9)
  })

  it('does not guess an S-Pankki layout when the complete header does not match', () => {
    const unknownHeader = sPankkiCsv.replace(
      'Kirjauspäivä;Maksupäivä',
      'Maksupäivä;Kirjauspäivä',
    )

    expect(
      validationError(() =>
        parseImportCsv(unknownHeader, '2026-06-01', '2026-06-30'),
      ),
    ).toMatchObject({ code: 'invalid_csv', row: 1 })
  })

  it('rejects an invalid S-Pankki amount without storing an approximate value', () => {
    const invalidAmount = sPankkiCsv.replace('-30,00', '-30.00')

    expect(
      validationError(() =>
        parseImportCsv(invalidAmount, '2026-06-01', '2026-06-30'),
      ),
    ).toMatchObject({ code: 'invalid_csv', row: 2, field: 'amount' })
  })

  it('rejects an impossible S-Pankki booking date', () => {
    const invalidDate = sPankkiCsv.replace('2.6.2026', '31.2.2026')

    expect(
      validationError(() =>
        parseImportCsv(invalidDate, '2026-02-01', '2026-06-30'),
      ),
    ).toMatchObject({ code: 'invalid_csv', row: 2, field: 'date' })
  })

  it('keeps identical purchases as separate source records', () => {
    const rows = parseImportCsv(
      'date;description;amount;kind\n' +
        '2026-04-03;Demo Market;-30.00;expense\n' +
        '2026-04-03;Demo Market;-30.00;expense\n',
      '2026-04-01',
      '2026-04-30',
    )

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.source_row)).toEqual([2, 3])
  })

  it('applies every fixed merchant rule to expenses and refunds', () => {
    const rows = parseImportCsv(
      'date;description;amount;kind\n' +
        '2026-04-02;Demo Market;-1.00;expense\n' +
        '2026-04-03;Demo Cafe;-1.00;expense\n' +
        '2026-04-04;Demo Bus;-1.00;expense\n' +
        '2026-04-05;Demo Stream;-1.00;expense\n' +
        '2026-04-06;Demo Market;+1.00;refund\n',
      '2026-04-01',
      '2026-04-30',
    )

    expect(rows.map((row) => row.category_code)).toEqual([
      'groceries',
      'dining',
      'transport',
      'subscriptions',
      'groceries',
    ])
  })

  it('requires the exact header and at least one transaction', () => {
    expect(
      validationError(() =>
        parseImportCsv('date;description;amount\n', '2026-04-01', '2026-04-30'),
      ),
    ).toMatchObject({ code: 'invalid_csv', row: 1 })

    expect(
      validationError(() =>
        parseImportCsv(
          'date;description;amount;kind\n\n',
          '2026-04-01',
          '2026-04-30',
        ),
      ),
    ).toMatchObject({ code: 'invalid_csv', row: null })
  })

  it.each(['12,50', '12.5', '1 000.00', '0.00', '1000000.01'])(
    'rejects the invalid amount %s',
    (amount) => {
      const error = validationError(() =>
        parseImportCsv(
          `date;description;amount;kind\n2026-04-02;Demo Market;${amount};expense\n`,
          '2026-04-01',
          '2026-04-30',
        ),
      )

      expect(error).toMatchObject({ code: 'invalid_csv', row: 2, field: 'amount' })
    },
  )

  it('rejects impossible dates and dates outside the declared period', () => {
    expect(
      validationError(() =>
        parseImportCsv(
          'date;description;amount;kind\n2026-02-30;Demo Market;-1.00;expense\n',
          '2026-02-01',
          '2026-02-28',
        ),
      ),
    ).toMatchObject({ code: 'invalid_csv', row: 2, field: 'date' })

    expect(
      validationError(() =>
        parseImportCsv(
          'date;description;amount;kind\n2026-05-01;Demo Market;-1.00;expense\n',
          '2026-04-01',
          '2026-04-30',
        ),
      ),
    ).toMatchObject({ code: 'invalid_period', row: 2, field: 'date' })
  })

  it('rejects a reversed import period before parsing records', () => {
    expect(
      validationError(() => parseImportCsv(aprilCsv, '2026-04-30', '2026-04-01')),
    ).toMatchObject({
      code: 'invalid_period',
      row: null,
      field: 'period_start',
    })
  })

  it('rejects more than 5,000 non-empty records', () => {
    const rows = Array.from(
      { length: 5_001 },
      () => '2026-04-02;Demo Market;-1.00;expense',
    )
    const error = validationError(() =>
      parseImportCsv(
        `date;description;amount;kind\n${rows.join('\n')}`,
        '2026-04-01',
        '2026-04-30',
      ),
    )

    expect(error).toMatchObject({ code: 'limit_exceeded' })
  })

  it('uses unknown for non-matching merchants, income and transfers', () => {
    const rows = parseImportCsv(
      'date;description;amount;kind\n' +
        '2026-04-02;Demo Marketplace;-1.00;expense\n' +
        '2026-04-03;Demo Market;+100.00;income\n' +
        '2026-04-04;Demo Cafe;-20.00;transfer\n',
      '2026-04-01',
      '2026-04-30',
    )

    expect(rows.map((row) => row.category_code)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ])
  })
})
