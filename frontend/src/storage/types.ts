import type { CategoryCode, TransactionKind } from '../domain/transactions'

export type { CategoryCode, TransactionKind } from '../domain/transactions'

// One import record identifies the time period covered by a single CSV import.
export interface ImportRecord {
  id: string
  period_start: string
  period_end: string
  created_at: string
}

// Each transaction points back to its import through import_id.
export interface TransactionRecord {
  id: string
  import_id: string
  // The source record keeps identical-looking purchases distinct within an import.
  source_row: number
  date: string
  description: string
  // Integer cents avoid rounding changes when totals are calculated.
  amount_cents: number
  kind: TransactionKind
  category_code: CategoryCode
}

export interface AnalysisSnapshot {
  imports: ImportRecord[]
  transactions: TransactionRecord[]
}

export type StorageErrorCode =
  | 'invalid_record'
  | 'import_not_found'
  | 'overlapping_period'
  | 'limit_exceeded'
  | 'storage_error'
  | 'restore_requires_empty_database'

export class MenomittariStorageError extends Error {
  readonly code: StorageErrorCode

  constructor(code: StorageErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MenomittariStorageError'
    this.code = code
  }
}
