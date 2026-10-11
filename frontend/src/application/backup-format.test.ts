import { describe, expect, it } from 'vitest'
import { validateBackupDocument } from './backup-format'

function validBackup() {
  const id = '10000000-0000-4000-8000-000000000001'
  return {
    format_version: 1, currency: 'EUR', exported_at: '2026-10-11T08:00:00.000Z',
    imports: [{ id, period_start: '2026-04-01', period_end: '2026-04-30', created_at: '2026-10-01T08:00:00Z' }],
    transactions: [{ id: '20000000-0000-4000-8000-000000000001', import_id: id, source_row: 2,
      date: '2026-04-01', description: 'Demo Market', amount_cents: -3000, kind: 'expense', category_code: 'groceries' }],
  }
}

describe('backup format', () => {
  it('preserves original fields and accepts an empty history', () => {
    expect(validateBackupDocument(validBackup())).toEqual(validBackup())
    const empty = { ...validBackup(), imports: [], transactions: [] }
    expect(validateBackupDocument(empty)).toEqual(empty)
  })

  it('distinguishes an unsupported version', () => {
    expect(() => validateBackupDocument({ ...validBackup(), format_version: 2 })).toThrowError(
      expect.objectContaining({ code: 'unsupported_backup_version' }),
    )
  })

  it.each([
    ['null', () => null],
    ['array root', () => []],
    ['missing field', () => ({ format_version: 1 })],
    ['extra root field', () => ({ ...validBackup(), account: 'not exported' })],
    ['string version', () => ({ ...validBackup(), format_version: '1' })],
    ['zero version', () => ({ ...validBackup(), format_version: 0 })],
    ['non-EUR currency', () => ({ ...validBackup(), currency: 'USD' })],
    ['non-UTC timestamp', () => ({ ...validBackup(), exported_at: '2026-10-11T08:00:00+03:00' })],
    ['impossible timestamp', () => ({ ...validBackup(), exported_at: '2026-02-30T08:00:00Z' })],
    ['non-array imports', () => ({ ...validBackup(), imports: {} })],
    ['too many transactions', () => ({ ...validBackup(), transactions: Array(10001).fill({}) })],
  ])('rejects %s', (_name, value) => {
    expect(() => validateBackupDocument(value())).toThrowError(expect.objectContaining({ code: 'invalid_backup' }))
  })

  it.each([
    ['extra import field', { bank: 'not exported' }],
    ['invalid UUID', { id: 'not-a-uuid' }],
    ['impossible date', { period_start: '2026-02-30' }],
    ['inverted period', { period_start: '2026-05-01' }],
    ['non-string date', { period_start: 20260401 }],
    ['invalid creation timestamp', { created_at: '2026-02-30T08:00:00Z' }],
  ])('rejects import: %s', (_name, changes) => {
    const value = validBackup()
    Object.assign(value.imports[0], changes)
    expect(() => validateBackupDocument(value)).toThrowError(expect.objectContaining({ code: 'invalid_backup' }))
  })

  it.each([
    ['extra field', { raw_csv: 'not exported' }],
    ['unknown category', { category_code: 'other' }],
    ['unknown kind', { kind: 'purchase' }],
    ['orphan reference', { import_id: '10000000-0000-4000-8000-000000000099' }],
    ['invalid ID', { id: 'not-a-uuid' }],
    ['fractional cents', { amount_cents: -0.5 }],
    ['zero amount', { amount_cents: 0 }],
    ['oversized amount', { amount_cents: -100000001 }],
    ['positive expense', { amount_cents: 100 }],
    ['negative refund', { kind: 'refund' }],
    ['classified income', { kind: 'income', amount_cents: 100 }],
    ['classified transfer', { kind: 'transfer' }],
    ['invalid row', { source_row: 1 }],
    ['fractional row', { source_row: 2.5 }],
    ['unsafe row', { source_row: Number.MAX_SAFE_INTEGER + 1 }],
    ['outside period', { date: '2026-05-01' }],
    ['impossible day', { date: '2026-04-31' }],
    ['blank description', { description: '' }],
    ['untrimmed description', { description: ' Demo Market' }],
    ['oversized description', { description: 'x'.repeat(201) }],
    ['wrong description type', { description: null }],
  ])('rejects transaction: %s', (_name, changes) => {
    const value = validBackup()
    Object.assign(value.transactions[0], changes)
    expect(() => validateBackupDocument(value)).toThrowError(expect.objectContaining({ code: 'invalid_backup' }))
  })

  it('rejects duplicate IDs, duplicate rows, overlapping periods and empty imports', () => {
    const duplicateImport = validBackup()
    duplicateImport.imports.push({ ...duplicateImport.imports[0] })
    const duplicateTransaction = validBackup()
    duplicateTransaction.transactions.push({ ...duplicateTransaction.transactions[0], source_row: 3 })
    const duplicateRow = validBackup()
    duplicateRow.transactions.push({ ...duplicateRow.transactions[0], id: '20000000-0000-4000-8000-000000000002' })
    const overlap = validBackup()
    const otherId = '10000000-0000-4000-8000-000000000002'
    overlap.imports.push({ ...overlap.imports[0], id: otherId, period_start: '2026-04-15' })
    overlap.transactions.push({ ...overlap.transactions[0], id: '20000000-0000-4000-8000-000000000002', import_id: otherId, date: '2026-04-15' })
    for (const value of [duplicateImport, duplicateTransaction, duplicateRow, overlap, { ...validBackup(), transactions: [] }]) {
      expect(() => validateBackupDocument(value)).toThrowError(expect.objectContaining({ code: 'invalid_backup' }))
    }
  })

  it('rejects over 5000 rows in one import even when the history total fits', () => {
    const value = validBackup()
    value.transactions = Array.from({ length: 5001 }, (_, index) => ({
      ...value.transactions[0], source_row: index + 2,
      id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }))
    expect(() => validateBackupDocument(value)).toThrowError(expect.objectContaining({ code: 'invalid_backup' }))
  })
})
