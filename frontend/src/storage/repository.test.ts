import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { databaseNameForUser } from './database'
import { createLocalStorage, type LocalStorageRepository } from './repository'
import type { ImportRecord, TransactionRecord } from './types'

const USER_A = '00000000-0000-4000-8000-000000000001'
const USER_B = '00000000-0000-4000-8000-000000000002'
const IMPORT_A = '10000000-0000-4000-8000-000000000001'
const IMPORT_B = '10000000-0000-4000-8000-000000000002'
const TRANSACTION_A = '20000000-0000-4000-8000-000000000001'

const openedRepositories: LocalStorageRepository[] = []
const databaseNames = new Set<string>()

function repository(userId = USER_A): LocalStorageRepository {
  const storage = createLocalStorage(userId)
  openedRepositories.push(storage)
  databaseNames.add(databaseNameForUser(userId))
  return storage
}

function importRecord(
  overrides: Partial<ImportRecord> = {},
): ImportRecord {
  return {
    id: IMPORT_A,
    period_start: '2026-04-01',
    period_end: '2026-04-30',
    created_at: '2026-10-03T08:00:00.000Z',
    ...overrides,
  }
}

function transactionRecord(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  return {
    id: TRANSACTION_A,
    import_id: IMPORT_A,
    source_row: 2,
    date: '2026-04-05',
    description: 'Demo Market',
    amount_cents: -3_000,
    kind: 'expense',
    category_code: 'groceries',
    ...overrides,
  }
}

afterEach(async () => {
  for (const storage of openedRepositories.splice(0)) {
    storage.close()
  }
  await Promise.all([...databaseNames].map((name) => Dexie.delete(name)))
  databaseNames.clear()
})

describe('local storage repository', () => {
  it('stores and reads an import with its transactions', async () => {
    const storage = repository()
    await storage.open()
    const storedImport = importRecord()
    const storedTransaction = transactionRecord()

    await storage.saveImportWithTransactions(storedImport, [storedTransaction])

    await expect(storage.listImports()).resolves.toEqual([storedImport])
    await expect(storage.listTransactions(IMPORT_A)).resolves.toEqual([
      storedTransaction,
    ])
  })

  it('keeps each signed-in user in a separate database', async () => {
    const firstUserStorage = repository(USER_A)
    const secondUserStorage = repository(USER_B)
    await Promise.all([firstUserStorage.open(), secondUserStorage.open()])

    await firstUserStorage.saveImportWithTransactions(importRecord(), [
      transactionRecord(),
    ])

    await expect(firstUserStorage.listImports()).resolves.toHaveLength(1)
    await expect(secondUserStorage.listImports()).resolves.toEqual([])
  })

  it('rejects a transaction that references another import', async () => {
    const storage = repository()
    await storage.open()

    await expect(
      storage.saveImportWithTransactions(importRecord(), [
        transactionRecord({ import_id: IMPORT_B }),
      ]),
    ).rejects.toMatchObject({ code: 'invalid_record' })
    await expect(storage.listImports()).resolves.toEqual([])
  })

  it('rolls back the whole write and preserves old data on failure', async () => {
    const storage = repository()
    await storage.open()
    const oldImport = importRecord()
    const oldTransaction = transactionRecord()
    await storage.saveImportWithTransactions(oldImport, [oldTransaction])

    const newImport = importRecord({
      id: IMPORT_B,
      period_start: '2026-05-01',
      period_end: '2026-05-31',
    })
    // Reusing an existing primary key makes bulkAdd fail after the new import was added.
    const conflictingTransaction = transactionRecord({
      import_id: IMPORT_B,
      date: '2026-05-05',
    })

    await expect(
      storage.saveImportWithTransactions(newImport, [conflictingTransaction]),
    ).rejects.toMatchObject({ code: 'storage_error' })
    await expect(storage.listImports()).resolves.toEqual([oldImport])
    await expect(storage.listTransactions(IMPORT_A)).resolves.toEqual([
      oldTransaction,
    ])
  })

  it('retains history after closing and reopening the database', async () => {
    const firstConnection = repository()
    await firstConnection.open()
    const storedImport = importRecord()
    const storedTransaction = transactionRecord()
    await firstConnection.saveImportWithTransactions(storedImport, [
      storedTransaction,
    ])
    firstConnection.close()

    const reopenedConnection = repository()
    await reopenedConnection.open()

    await expect(reopenedConnection.listImports()).resolves.toEqual([storedImport])
    await expect(reopenedConnection.listTransactions(IMPORT_A)).resolves.toEqual([
      storedTransaction,
    ])
  })

  it('rejects a partially overlapping period and preserves the old import', async () => {
    const storage = repository()
    await storage.open()
    const oldImport = importRecord({
      period_start: '2026-01-01',
      period_end: '2026-01-20',
    })
    await storage.saveImportWithTransactions(oldImport, [
      transactionRecord({ date: '2026-01-05' }),
    ])

    const overlappingImport = importRecord({
      id: IMPORT_B,
      period_start: '2026-01-02',
      period_end: '2026-01-10',
    })
    await expect(
      storage.saveImportWithTransactions(overlappingImport, [
        transactionRecord({
          id: '20000000-0000-4000-8000-000000000002',
          import_id: IMPORT_B,
          date: '2026-01-06',
        }),
      ]),
    ).rejects.toMatchObject({
      code: 'overlapping_period',
      message: expect.stringContaining(
        '2026-01-02–2026-01-10 menee päällekkäin jo tallennetun jakson 2026-01-01–2026-01-20',
      ),
    })
    await expect(storage.listImports()).resolves.toEqual([oldImport])
  })
})
