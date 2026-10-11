import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import { databaseNameForUser } from '../storage/database'
import { createLocalStorage } from '../storage/repository'
import { importCsv } from './import-csv'
import { listHistoryImports, loadTransactionView } from './transaction-history'

const USER_ID = '00000000-0000-4000-8000-000000000006'
const storage = createLocalStorage(USER_ID)

let idCounter = 1
const dependencies = {
  createId: () =>
    `60000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
  now: () => new Date('2026-10-06T08:00:00.000Z'),
}

afterEach(async () => {
  storage.close()
  await Dexie.delete(databaseNameForUser(USER_ID))
  idCounter = 1
})

describe('transaction history integration', () => {
  it('imports two periods and loads the selected period summary from IndexedDB', async () => {
    await storage.open()
    const aprilImport = await importCsv(
      new Blob([aprilCsv]),
      '2026-04-01',
      '2026-04-30',
      storage,
      dependencies,
    )
    const mayImport = await importCsv(
      new Blob([mayCsv]),
      '2026-05-01',
      '2026-05-31',
      storage,
      dependencies,
    )
    expect(aprilImport.ok).toBe(true)
    expect(mayImport.ok).toBe(true)

    const importsResult = await listHistoryImports(storage)
    expect(importsResult.ok).toBe(true)
    if (!importsResult.ok) {
      return
    }

    expect(importsResult.data.items.map((item) => item.period_start)).toEqual([
      '2026-05-01',
      '2026-04-01',
    ])

    const mayView = await loadTransactionView(storage, importsResult.data.items[0])
    const aprilView = await loadTransactionView(storage, importsResult.data.items[1])

    expect(mayView).toMatchObject({
      ok: true,
      data: { summary: { expense_cents: 14_500, refund_cents: 500 } },
    })
    expect(aprilView).toMatchObject({
      ok: true,
      data: { summary: { expense_cents: 9_000, refund_cents: 500 } },
    })
  })
})
