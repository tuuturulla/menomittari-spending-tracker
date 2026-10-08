import { describe, expect, it, vi } from 'vitest'
import { MenomittariStorageError } from '../storage/types'
import { getAnalysis, type AnalysisStorage } from './analysis'

const IMPORT_ID = '10000000-0000-4000-8000-000000000001'

describe('analysis application service', () => {
  it('rejects an invalid id before reading local storage', async () => {
    const readAnalysisSnapshot = vi.fn<AnalysisStorage['readAnalysisSnapshot']>()

    await expect(getAnalysis({ readAnalysisSnapshot }, 'not-a-uuid'))
      .resolves.toMatchObject({ ok: false, error: { code: 'invalid_request' } })
    expect(readAnalysisSnapshot).not.toHaveBeenCalled()
  })

  it('reports a missing import from a valid snapshot', async () => {
    const storage: AnalysisStorage = {
      readAnalysisSnapshot: vi.fn(async () => ({ imports: [], transactions: [] })),
    }

    await expect(getAnalysis(storage, IMPORT_ID))
      .resolves.toMatchObject({ ok: false, error: { code: 'import_not_found' } })
  })

  it('turns a local storage failure into a safe result', async () => {
    const storage: AnalysisStorage = {
      readAnalysisSnapshot: vi.fn(async () => {
        throw new MenomittariStorageError('storage_error', 'Paikallista tietokantaa ei voitu lukea.')
      }),
    }

    await expect(getAnalysis(storage, IMPORT_ID))
      .resolves.toMatchObject({ ok: false, error: { code: 'storage_error', row: null, field: null } })
  })
})
