/** Validates a CSV import, creates record IDs, and saves the complete batch locally. */
import {
  CsvImportValidationError,
  parseImportCsv,
  type CsvImportField,
} from '../domain/csv-import'
import {
  MenomittariStorageError,
  type ImportRecord,
  type TransactionRecord,
} from '../storage/types'

const MAX_CSV_BYTES = 1024 * 1024

export type ImportErrorCode =
  | 'invalid_request'
  | 'file_too_large'
  | 'invalid_csv'
  | 'invalid_period'
  | 'limit_exceeded'
  | 'overlapping_period'
  | 'storage_error'
  | 'internal_error'

export interface ImportError {
  code: ImportErrorCode
  message: string
  row: number | null
  field: CsvImportField | null
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ImportError }

export interface ImportedCsv extends ImportRecord {
  transaction_count: number
}

export interface ImportStorage {
  saveImportWithTransactions(
    importRecord: ImportRecord,
    transactions: TransactionRecord[],
  ): Promise<void>
}

export interface CsvFile {
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

interface ImportDependencies {
  createId: () => string
  now: () => Date
}

const defaultDependencies: ImportDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
}

function failure(
  code: ImportErrorCode,
  message: string,
  row: number | null = null,
  field: CsvImportField | null = null,
): Result<never> {
  return { ok: false, error: { code, message, row, field } }
}

function storageFailure(error: MenomittariStorageError): Result<never> {
  if (error.code === 'overlapping_period' || error.code === 'limit_exceeded') {
    return failure(error.code, error.message)
  }
  return failure('storage_error', error.message)
}

export async function importCsv(
  file: CsvFile,
  periodStart: string,
  periodEnd: string,
  storage: ImportStorage,
  dependencies: ImportDependencies = defaultDependencies,
): Promise<Result<ImportedCsv>> {
  // Size is checked before reading so an oversized file is never loaded into memory.
  if (file.size > MAX_CSV_BYTES) {
    return failure('file_too_large', 'CSV-tiedosto saa olla enintään 1 MiB.')
  }

  let csvText: string
  try {
    const bytes = await file.arrayBuffer()
    csvText = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return failure('invalid_csv', 'CSV-tiedoston pitää olla kelvollista UTF-8-tekstiä.')
  }

  try {
    const rows = parseImportCsv(csvText, periodStart, periodEnd)
    const importId = dependencies.createId()
    const importRecord: ImportRecord = {
      id: importId,
      period_start: periodStart,
      period_end: periodEnd,
      created_at: dependencies.now().toISOString(),
    }
    const transactions: TransactionRecord[] = rows.map((row) => ({
      id: dependencies.createId(),
      import_id: importId,
      ...row,
    }))

    // Only a fully parsed and validated batch reaches the atomic IndexedDB write.
    await storage.saveImportWithTransactions(importRecord, transactions)
    return {
      ok: true,
      data: { ...importRecord, transaction_count: transactions.length },
    }
  } catch (error) {
    if (error instanceof CsvImportValidationError) {
      return failure(error.code, error.message, error.row, error.field)
    }
    if (error instanceof MenomittariStorageError) {
      return storageFailure(error)
    }
    return failure('internal_error', 'Tuonti epäonnistui odottamattomasti.')
  }
}
