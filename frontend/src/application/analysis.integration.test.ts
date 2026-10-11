import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import juneCsv from '../../tests/fixtures/s-pankki-demo-2026-06.csv?raw'
import julyHalfCsv from '../../tests/fixtures/s-pankki-demo-2026-07-half.csv?raw'
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
      new Blob([mayCsv]), '2026-05-01', '2026-05-31', storage, dependencies,
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

  it('imports all four public demos and compares only matching June days for July', async () => {
    await storage.open()
    const demos = [
      { csv: aprilCsv, start: '2026-04-01', end: '2026-04-30', count: 9 },
      { csv: mayCsv, start: '2026-05-01', end: '2026-05-31', count: 9 },
      { csv: juneCsv, start: '2026-06-01', end: '2026-06-30', count: 9 },
      { csv: julyHalfCsv, start: '2026-07-01', end: '2026-07-15', count: 6 },
    ]
    const imports = []
    for (const demo of demos) {
      const result = await importCsv(
        new Blob([demo.csv]), demo.start, demo.end, storage, dependencies,
      )
      expect(result).toMatchObject({ ok: true, data: { transaction_count: demo.count } })
      if (!result.ok) return
      imports.push(result.data)
    }

    const june = imports[2]
    const july = imports[3]
    const juneAnalysis = await getAnalysis(storage, june.id)
    expect(juneAnalysis).toMatchObject({
      ok: true,
      data: {
        summary: { expense_cents: 12_500 },
        comparison: {
          baseline_import_id: imports[1].id,
          baseline_period: { period_start: '2026-05-01', period_end: '2026-05-31' },
          totals: { previous_cents: 14_500, current_cents: 12_500, delta_percent: -13.79 },
        },
      },
    })

    // Reopening tests saved history; analysis must not rewrite June into a half-month.
    storage.close()
    await storage.open()
    const before = await storage.readAnalysisSnapshot()
    const julyAnalysis = await getAnalysis(storage, july.id)
    expect(julyAnalysis).toMatchObject({
      ok: true,
      data: {
        summary: { expense_cents: 5_750, refund_cents: 0 },
        comparison: {
          status: 'comparable', baseline_import_id: june.id, mode: 'previous_month',
          current_period: { period_start: '2026-07-01', period_end: '2026-07-15' },
          baseline_period: { period_start: '2026-06-01', period_end: '2026-06-15' },
          totals: { previous_cents: 9_500, current_cents: 5_750, delta_cents: -3_750, delta_percent: -39.47 },
          categories: expect.arrayContaining([
            expect.objectContaining({ category_code: 'groceries', previous_cents: 6_000, current_cents: 3_000 }),
            expect.objectContaining({ category_code: 'dining', previous_cents: 2_000, current_cents: 750 }),
            expect.objectContaining({ category_code: 'subscriptions', previous_cents: 1_500, current_cents: 1_500 }),
            expect.objectContaining({ category_code: 'transport', previous_cents: 0, current_cents: 0 }),
            expect.objectContaining({ category_code: 'unknown', previous_cents: 0, current_cents: 500 }),
          ]),
        },
        insights: [
          expect.objectContaining({ code: 'total_change', delta_cents: -3_750 }),
          expect.objectContaining({ code: 'new_category_spend', category_code: 'unknown' }),
        ],
      },
    })
    expect(await storage.readAnalysisSnapshot()).toEqual(before)
    expect(before.imports).toHaveLength(4)
    expect(before.transactions).toHaveLength(33)

    // A rejected second import names the conflicting period and changes nothing.
    const repeated = await importCsv(
      new Blob([julyHalfCsv]), '2026-07-01', '2026-07-31', storage, dependencies,
    )
    expect(repeated).toMatchObject({ ok: false, error: { code: 'overlapping_period' } })
    if (!repeated.ok) {
      expect(repeated.error.message).toContain('2026-07-01–2026-07-15')
      expect(repeated.error.message).toContain('2026-07-01–2026-07-31')
    }
    expect(await storage.readAnalysisSnapshot()).toEqual(before)
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
