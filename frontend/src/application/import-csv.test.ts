import { describe, expect, it, vi } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import { MenomittariStorageError } from '../storage/types'
import { importCsv, type CsvFile, type ImportStorage } from './import-csv'

const IMPORT_ID = '10000000-0000-4000-8000-000000000001'
const TRANSACTION_IDS = Array.from(
  { length: 9 },
  (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
)

function dependencies() {
  const ids = [IMPORT_ID, ...TRANSACTION_IDS]
  return {
    createId: () => ids.shift() ?? '30000000-0000-4000-8000-000000000001',
    now: () => new Date('2026-10-05T08:00:00.000Z'),
  }
}

describe('CSV import application service', () => {
  it('creates ids and stores one fully validated batch', async () => {
    const saveImportWithTransactions = vi.fn<ImportStorage['saveImportWithTransactions']>()
    const result = await importCsv(
      new Blob([aprilCsv]),
      '2026-04-01',
      '2026-04-30',
      { saveImportWithTransactions },
      dependencies(),
    )

    expect(result).toEqual({
      ok: true,
      data: {
        id: IMPORT_ID,
        period_start: '2026-04-01',
        period_end: '2026-04-30',
        created_at: '2026-10-05T08:00:00.000Z',
        transaction_count: 9,
      },
    })
    expect(saveImportWithTransactions).toHaveBeenCalledOnce()
    expect(saveImportWithTransactions.mock.calls[0][1]).toHaveLength(9)
    expect(saveImportWithTransactions.mock.calls[0][1][0]).toMatchObject({
      id: TRANSACTION_IDS[0],
      import_id: IMPORT_ID,
      amount_cents: -3_000,
      category_code: 'groceries',
    })
  })

  it('checks the one MiB limit before reading the file', async () => {
    const arrayBuffer = vi.fn<() => Promise<ArrayBuffer>>()
    const oversizedFile: CsvFile = {
      size: 1024 * 1024 + 1,
      arrayBuffer,
    }
    const saveImportWithTransactions = vi.fn<ImportStorage['saveImportWithTransactions']>()

    const result = await importCsv(
      oversizedFile,
      '2026-04-01',
      '2026-04-30',
      { saveImportWithTransactions },
    )

    expect(result).toMatchObject({ ok: false, error: { code: 'file_too_large' } })
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(saveImportWithTransactions).not.toHaveBeenCalled()
  })

  it('rejects invalid UTF-8 without calling storage', async () => {
    const invalidUtf8 = new Blob([new Uint8Array([0xc3, 0x28])])
    const saveImportWithTransactions = vi.fn<ImportStorage['saveImportWithTransactions']>()

    const result = await importCsv(
      invalidUtf8,
      '2026-04-01',
      '2026-04-30',
      { saveImportWithTransactions },
    )

    expect(result).toMatchObject({ ok: false, error: { code: 'invalid_csv' } })
    expect(saveImportWithTransactions).not.toHaveBeenCalled()
  })

  it('returns field and row details without partially storing invalid CSV', async () => {
    const saveImportWithTransactions = vi.fn<ImportStorage['saveImportWithTransactions']>()
    const result = await importCsv(
      new Blob([
        'date;description;amount;kind\n2026-04-02;Demo Market;12,50;expense\n',
      ]),
      '2026-04-01',
      '2026-04-30',
      { saveImportWithTransactions },
    )

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'invalid_csv', row: 2, field: 'amount' },
    })
    expect(saveImportWithTransactions).not.toHaveBeenCalled()
  })

  it('preserves a storage overlap error for the user interface', async () => {
    const saveImportWithTransactions = vi.fn<ImportStorage['saveImportWithTransactions']>(
      async () => {
        throw new MenomittariStorageError(
          'overlapping_period',
          'Ajanjakso on jo tuotu kokonaan tai osittain.',
        )
      },
    )

    const result = await importCsv(
      new Blob([aprilCsv]),
      '2026-04-01',
      '2026-04-30',
      { saveImportWithTransactions },
      dependencies(),
    )

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'overlapping_period' },
    })
  })
})
