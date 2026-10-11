import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import aprilCsv from '../../tests/fixtures/demo-2026-04.csv?raw'
import mayCsv from '../../tests/fixtures/demo-2026-05.csv?raw'
import juneCsv from '../../tests/fixtures/s-pankki-demo-2026-06.csv?raw'
import julyCsv from '../../tests/fixtures/s-pankki-demo-2026-07-half.csv?raw'
import { MenomittariDatabase } from '../storage/database'
import { createLocalStorage, type LocalStorageRepository } from '../storage/repository'
import { getAnalysis } from './analysis'
import { importCsv } from './import-csv'
import { exportBackup, restoreBackup } from './backup'

const repositories: LocalStorageRepository[] = []
function repository(userId = crypto.randomUUID()) {
  const storage = createLocalStorage(userId)
  repositories.push(storage)
  return storage
}
afterEach(async () => {
  vi.restoreAllMocks()
  for (const storage of repositories) storage.close()
  await Promise.all(repositories.map((storage) => Dexie.delete(storage.name)))
  repositories.length = 0
})
async function populatedSource() {
  const storage = repository()
  await storage.open()
  for (const [csv, start, end] of [[aprilCsv, '2026-04-01', '2026-04-30'], [mayCsv, '2026-05-01', '2026-05-31'],
    [juneCsv, '2026-06-01', '2026-06-30'], [julyCsv, '2026-07-01', '2026-07-15']]) {
    expect((await importCsv(new Blob([csv]), start, end, storage)).ok).toBe(true)
  }
  return storage
}
async function exported(storage: LocalStorageRepository) {
  const result = await exportBackup(storage)
  if (!result.ok) throw new Error(result.error.message)
  return result.data.blob
}

describe('local backup round trip', () => {
  it('restores every original ID, category and analysis, including the half-month comparison', async () => {
    const source = await populatedSource()
    const original = await source.readAnalysisSnapshot()
    const target = repository()
    await target.open()
    expect(await restoreBackup(await exported(source), target)).toEqual({ ok: true, data: { import_count: 4, transaction_count: 33 } })
    target.close()
    await target.open()
    expect(await target.readAnalysisSnapshot()).toEqual(original)
    expect(await source.readAnalysisSnapshot()).toEqual(original)
    for (const record of original.imports) {
      const expected = await getAnalysis(source, record.id)
      expect(expected.ok).toBe(true)
      expect(await getAnalysis(target, record.id)).toEqual(expected)
    }
  })

  it('rejects restoration into existing history without changing it', async () => {
    const target = await populatedSource()
    const before = await target.readAnalysisSnapshot()
    expect(await restoreBackup(await exported(target), target)).toMatchObject({ ok: false, error: { code: 'restore_requires_empty_database' } })
    expect(await target.readAnalysisSnapshot()).toEqual(before)
  })

  it('rolls back imports if transaction insertion fails', async () => {
    const source = await populatedSource()
    const target = repository()
    await target.open()
    // A test-only fault after the parent insert verifies rollback of the entire transaction.
    const database = (target as unknown as { database: MenomittariDatabase }).database
    vi.spyOn(database.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('simulated disk failure'))
    expect(await restoreBackup(await exported(source), target)).toMatchObject({ ok: false, error: { code: 'storage_error' } })
    expect(await target.readAnalysisSnapshot()).toEqual({ imports: [], transactions: [] })
  })

  it('allows only one of two concurrent restores through separate connections', async () => {
    const source = await populatedSource()
    const userId = crypto.randomUUID()
    const first = repository(userId)
    const second = repository(userId)
    await Promise.all([first.open(), second.open()])
    const blob = await exported(source)
    const results = await Promise.all([restoreBackup(blob, first), restoreBackup(blob, second)])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.find((result) => !result.ok)).toMatchObject({ error: { code: 'restore_requires_empty_database' } })
    expect(await first.readAnalysisSnapshot()).toEqual(await source.readAnalysisSnapshot())
  })

  it('restores an empty backup as a no-op and rejects corrupt files without partial records', async () => {
    const target = repository()
    await target.open()
    expect(await restoreBackup(await exported(target), target)).toEqual({ ok: true, data: { import_count: 0, transaction_count: 0 } })
    expect(await restoreBackup(new Blob(['{"format_version":1}']), target)).toMatchObject({ ok: false, error: { code: 'invalid_backup' } })
    expect(await target.readAnalysisSnapshot()).toEqual({ imports: [], transactions: [] })
  })
})
