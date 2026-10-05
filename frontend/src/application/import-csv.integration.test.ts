import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import { databaseNameForUser } from '../storage/database'
import { createLocalStorage } from '../storage/repository'
import { importCsv } from './import-csv'

const USER_ID = '00000000-0000-4000-8000-000000000010'
const IMPORT_ID = '10000000-0000-4000-8000-000000000010'

afterEach(async () => {
  await Dexie.delete(databaseNameForUser(USER_ID))
})

describe('CSV import with local storage', () => {
  it('stores the demo as one import and seven separate transactions', async () => {
    const storage = createLocalStorage(USER_ID)
    await storage.open()
    const ids = [
      IMPORT_ID,
      ...Array.from(
        { length: 7 },
        (_, index) =>
          `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      ),
    ]

    try {
      const result = await importCsv(
        new Blob([aprilCsv]),
        '2026-04-01',
        '2026-04-30',
        storage,
        {
          createId: () => ids.shift() ?? '30000000-0000-4000-8000-000000000001',
          now: () => new Date('2026-10-05T08:00:00.000Z'),
        },
      )

      expect(result).toMatchObject({ ok: true, data: { transaction_count: 7 } })
      await expect(storage.listImports()).resolves.toHaveLength(1)
      await expect(storage.listTransactions(IMPORT_ID)).resolves.toHaveLength(7)
    } finally {
      storage.close()
    }
  })
})
