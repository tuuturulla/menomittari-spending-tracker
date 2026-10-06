import { describe, expect, it, vi } from 'vitest'
import { MenomittariStorageError } from '../storage/types'
import type { ImportRecord, TransactionRecord } from '../storage/types'
import {
  listHistoryImports,
  loadTransactionView,
  TRANSACTION_PAGE_SIZE,
  type HistoryStorage,
} from './transaction-history'

const IMPORT_A = '10000000-0000-4000-8000-000000000001'
const IMPORT_B = '10000000-0000-4000-8000-000000000002'

function importRecord(id: string, start: string, end: string): ImportRecord {
  return {
    id,
    period_start: start,
    period_end: end,
    created_at: '2026-10-06T08:00:00.000Z',
  }
}

function transactions(importId: string, count: number, amountCents = -100): TransactionRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${importId}-${String(index).padStart(4, '0')}`,
    import_id: importId,
    source_row: index + 2,
    date: '2026-04-05',
    description: `Demo ${index + 1}`,
    amount_cents: amountCents,
    kind: 'expense',
    category_code: 'unknown',
  }))
}

describe('transaction history application service', () => {
  it('returns imports from storage', async () => {
    const imports = [
      importRecord(IMPORT_B, '2026-05-01', '2026-05-30'),
      importRecord(IMPORT_A, '2026-04-01', '2026-04-30'),
    ]
    const storage: HistoryStorage = {
      listImports: vi.fn(async () => imports),
      listTransactions: vi.fn(),
    }

    await expect(listHistoryImports(storage)).resolves.toEqual({
      ok: true,
      data: { items: imports },
    })
  })

  it('returns a 50-row page while calculating the summary from every transaction', async () => {
    const selectedImport = importRecord(IMPORT_A, '2026-04-01', '2026-04-30')
    const storedTransactions = transactions(IMPORT_A, 51)
    const storage: HistoryStorage = {
      listImports: vi.fn(),
      listTransactions: vi.fn(async () => storedTransactions),
    }

    const result = await loadTransactionView(storage, selectedImport)

    expect(result).toMatchObject({
      ok: true,
      data: {
        summary: { expense_cents: 5_100 },
        transactions: {
          total: 51,
          offset: 0,
          limit: TRANSACTION_PAGE_SIZE,
        },
      },
    })
    if (result.ok) {
      expect(result.data.transactions.items).toHaveLength(50)
      expect(result.data.transactions.items[0]).not.toHaveProperty('source_row')
    }
  })

  it('loads the requested page and keeps different selected periods separate', async () => {
    const april = importRecord(IMPORT_A, '2026-04-01', '2026-04-30')
    const may = importRecord(IMPORT_B, '2026-05-01', '2026-05-30')
    const byImport = new Map([
      [IMPORT_A, transactions(IMPORT_A, 51, -100)],
      [IMPORT_B, transactions(IMPORT_B, 2, -500)],
    ])
    const storage: HistoryStorage = {
      listImports: vi.fn(),
      listTransactions: vi.fn(async (importId) => byImport.get(importId) ?? []),
    }

    const aprilSecondPage = await loadTransactionView(storage, april, 50)
    const mayFirstPage = await loadTransactionView(storage, may)

    expect(aprilSecondPage).toMatchObject({
      ok: true,
      data: {
        summary: { import_id: IMPORT_A, expense_cents: 5_100 },
        transactions: { total: 51, offset: 50, items: [{ description: 'Demo 51' }] },
      },
    })
    expect(mayFirstPage).toMatchObject({
      ok: true,
      data: {
        summary: { import_id: IMPORT_B, expense_cents: 1_000 },
        transactions: { total: 2, offset: 0 },
      },
    })
  })

  it('rejects invalid pagination before reading storage', async () => {
    const listTransactions = vi.fn<HistoryStorage['listTransactions']>()
    const storage: HistoryStorage = { listImports: vi.fn(), listTransactions }
    const selectedImport = importRecord(IMPORT_A, '2026-04-01', '2026-04-30')

    await expect(loadTransactionView(storage, selectedImport, -1)).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_request' },
    })
    await expect(loadTransactionView(storage, selectedImport, 0, 201)).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_request' },
    })
    expect(listTransactions).not.toHaveBeenCalled()
  })

  it('preserves a missing-import error for the user interface', async () => {
    const storage: HistoryStorage = {
      listImports: vi.fn(),
      listTransactions: vi.fn(async () => {
        throw new MenomittariStorageError(
          'import_not_found',
          'Tuontia ei löytynyt paikallisesta historiasta.',
        )
      }),
    }

    await expect(
      loadTransactionView(
        storage,
        importRecord(IMPORT_A, '2026-04-01', '2026-04-30'),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'import_not_found' },
    })
  })
})
