import { describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import { CsvImportValidationError, parseImportCsv } from './csv-import'

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
    const may = parseImportCsv(mayCsv, '2026-05-01', '2026-05-30')

    expect(april).toHaveLength(7)
    expect(may).toHaveLength(7)
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
