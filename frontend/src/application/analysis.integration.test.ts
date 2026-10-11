import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import { databaseNameForUser } from '../storage/database'
import { createLocalStorage } from '../storage/repository'
import { getAnalysis } from './analysis'
import { importCsv } from './import-csv'

const USER_ID = '00000000-0000-4000-8000-000000000007'
const storage = createLocalStorage(USER_ID)
let idCounter = 1
const dependencies = {
  createId: () =>
    `70000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
  now: () => new Date('2026-10-08T08:00:00.000Z'),
}

afterEach(async () => {
  storage.close()
  await Dexie.delete(databaseNameForUser(USER_ID))
  idCounter = 1
})

describe('analysis with IndexedDB', () => {
  it('compares real saved demo imports even when May was imported first', async () => {
    await storage.open()
    const may = await importCsv(
      new Blob([mayCsv]), '2026-05-01', '2026-05-30', storage, dependencies,
    )
    const april = await importCsv(
      new Blob([aprilCsv]), '2026-04-01', '2026-04-30', storage, dependencies,
    )
    expect(may.ok).toBe(true)
    expect(april.ok).toBe(true)
    if (!may.ok || !april.ok) {
      return
    }

    const result = await getAnalysis(storage, may.data.id)

    expect(result).toMatchObject({
      ok: true,
      data: {
        summary: { expense_cents: 14_500, refund_cents: 500 },
        comparison: {
          status: 'comparable',
          baseline_import_id: april.data.id,
          totals: { delta_cents: 5_500, delta_percent: 61.11 },
        },
      },
    })
    if (result.ok) {
      expect(result.data.insights.map((item) => item.code)).toEqual([
        'total_change', 'largest_category_increase', 'new_category_spend',
      ])
    }
  })

  it('filters a saved full month to the matching days of a partial-month import', async () => {
    await storage.open()
    const april = await importCsv(
      new Blob(['date;description;amount;kind\n2026-04-05;Demo Market;-10.00;expense\n2026-04-20;Demo Market;-90.00;expense']),
      '2026-04-01', '2026-04-30', storage, dependencies,
    )
    const may = await importCsv(
      new Blob(['date;description;amount;kind\n2026-05-05;Demo Market;-15.00;expense']),
      '2026-05-01', '2026-05-15', storage, dependencies,
    )
    expect(april.ok && may.ok).toBe(true)
    if (!april.ok || !may.ok) return

    await expect(getAnalysis(storage, may.data.id)).resolves.toMatchObject({
      ok: true,
      data: {
        comparison: {
          status: 'comparable', baseline_import_id: april.data.id,
          baseline_period: { period_start: '2026-04-01', period_end: '2026-04-15' },
          totals: { previous_cents: 1_000, current_cents: 1_500, delta_percent: 50 },
        },
      },
    })
    // Analysis is a read: it must not shorten or otherwise rewrite the stored import.
    await expect(storage.listTransactions(april.data.id)).resolves.toHaveLength(2)
    expect((await storage.listImports()).find((item) => item.id === april.data.id)?.period_end)
      .toBe('2026-04-30')
  })
})
