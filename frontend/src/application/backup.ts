/** Exports and restores local JSON files; financial data never goes to an HTTP API. */
import { BackupValidationError, validateBackupDocument } from './backup-format'
import { MenomittariStorageError, type AnalysisSnapshot } from '../storage/types'

const MAX_BACKUP_BYTES = 16 * 1024 * 1024
export type BackupErrorCode = 'file_too_large' | 'invalid_backup' | 'unsupported_backup_version'
  | 'restore_requires_empty_database' | 'storage_error' | 'internal_error'
export type BackupResult<T> = { ok: true; data: T } | {
  ok: false; error: { code: BackupErrorCode; message: string; row: null; field: null }
}
export interface BackupFile { readonly size: number; arrayBuffer(): Promise<ArrayBuffer> }
export interface BackupStorage {
  readAnalysisSnapshot(): Promise<AnalysisSnapshot>
  restoreEmptyHistory(snapshot: AnalysisSnapshot): Promise<void>
}

function failure(code: BackupErrorCode, message: string): BackupResult<never> {
  return { ok: false, error: { code, message, row: null, field: null } }
}
function caughtFailure(error: unknown): BackupResult<never> {
  if (error instanceof BackupValidationError) return failure(error.code, error.message)
  if (error instanceof MenomittariStorageError) {
    return failure(error.code === 'restore_requires_empty_database' ? error.code : 'storage_error', error.message)
  }
  return failure('internal_error', 'Varmuuskopion käsittely epäonnistui odottamattomasti.')
}

/** Read both stores consistently and package them without account or session information. */
export async function exportBackup(
  storage: Pick<BackupStorage, 'readAnalysisSnapshot'>,
  now: () => Date = () => new Date(),
): Promise<BackupResult<{ blob: Blob; filename: string }>> {
  try {
    const snapshot = await storage.readAnalysisSnapshot()
    const exportedAt = now().toISOString()
    const document = validateBackupDocument({ ...snapshot, format_version: 1, exported_at: exportedAt, currency: 'EUR' })
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json;charset=utf-8' })
    if (blob.size > MAX_BACKUP_BYTES) return failure('file_too_large', 'Varmuuskopio saa olla enintään 16 MiB.')
    return { ok: true, data: { blob, filename: `${exportedAt.slice(0, 10)}.menomittari-backup.json` } }
  } catch (error) {
    return caughtFailure(error)
  }
}

/** Validate the complete file first; the repository then checks emptiness atomically. */
export async function restoreBackup(
  file: BackupFile,
  storage: Pick<BackupStorage, 'restoreEmptyHistory'>,
): Promise<BackupResult<{ import_count: number; transaction_count: number }>> {
  if (file.size > MAX_BACKUP_BYTES) return failure('file_too_large', 'Varmuuskopio saa olla enintään 16 MiB.')
  let value: unknown
  try {
    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_BACKUP_BYTES) return failure('file_too_large', 'Varmuuskopio saa olla enintään 16 MiB.')
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return failure('invalid_backup', 'Varmuuskopion pitää olla kelvollinen UTF-8 JSON-tiedosto.')
  }
  try {
    const document = validateBackupDocument(value)
    await storage.restoreEmptyHistory({ imports: document.imports, transactions: document.transactions })
    return { ok: true, data: { import_count: document.imports.length, transaction_count: document.transactions.length } }
  } catch (error) {
    return caughtFailure(error)
  }
}
