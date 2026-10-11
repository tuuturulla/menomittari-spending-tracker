import { describe, expect, it, vi } from 'vitest'
import { MenomittariStorageError } from '../storage/types'
import { exportBackup, restoreBackup } from './backup'

const emptyDocument = { format_version: 1, exported_at: '2026-10-11T08:00:00.000Z', currency: 'EUR', imports: [], transactions: [] }

describe('backup application service', () => {
  it('exports a UTF-8 JSON blob with a dated filename and no account data', async () => {
    const result = await exportBackup({ readAnalysisSnapshot: async () => ({ imports: [], transactions: [] }) },
      () => new Date(emptyDocument.exported_at))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected successful export')
    expect(result.data.filename).toBe('2026-10-11.menomittari-backup.json')
    expect(result.data.blob.type).toBe('application/json;charset=utf-8')
    expect(JSON.parse(await result.data.blob.text())).toEqual(emptyDocument)
  })

  it('checks file size before reading or writing anything', async () => {
    const arrayBuffer = vi.fn<() => Promise<ArrayBuffer>>()
    const restoreEmptyHistory = vi.fn()
    const result = await restoreBackup({ size: 16 * 1024 * 1024 + 1, arrayBuffer }, { restoreEmptyHistory })
    expect(result).toMatchObject({ ok: false, error: { code: 'file_too_large' } })
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(restoreEmptyHistory).not.toHaveBeenCalled()
  })

  it.each([new Blob(['{broken']), new Blob([new Uint8Array([0xff])]), new Blob([JSON.stringify({ ...emptyDocument, extra: true })])])(
    'rejects malformed data before a write', async (file) => {
      const restoreEmptyHistory = vi.fn()
      expect(await restoreBackup(file, { restoreEmptyHistory })).toMatchObject({ ok: false, error: { code: 'invalid_backup' } })
      expect(restoreEmptyHistory).not.toHaveBeenCalled()
    },
  )

  it('returns the repository nonempty error instead of silently replacing data', async () => {
    const result = await restoreBackup(new Blob([JSON.stringify(emptyDocument)]), {
      restoreEmptyHistory: async () => { throw new MenomittariStorageError('restore_requires_empty_database', 'Historia ei ole tyhjä.') },
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'restore_requires_empty_database', message: 'Historia ei ole tyhjä.' } })
  })

  it('converts read errors and unexpected failures into safe messages', async () => {
    expect(await exportBackup({ readAnalysisSnapshot: async () => { throw new MenomittariStorageError('storage_error', 'Luku epäonnistui.') } }))
      .toMatchObject({ ok: false, error: { code: 'storage_error' } })
    expect(await restoreBackup(new Blob([JSON.stringify(emptyDocument)]), { restoreEmptyHistory: async () => { throw new Error('private details') } }))
      .toMatchObject({ ok: false, error: { code: 'internal_error', message: expect.not.stringContaining('private details') } })
  })
})
