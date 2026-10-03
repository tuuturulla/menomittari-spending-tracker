export const TRANSACTION_KINDS = [
  'expense',
  'income',
  'refund',
  'transfer',
] as const

export const CATEGORY_CODES = [
  'groceries',
  'dining',
  'transport',
  'subscriptions',
  'unknown',
] as const

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]
export type CategoryCode = (typeof CATEGORY_CODES)[number]

export interface ImportRecord {
  id: string
  period_start: string
  period_end: string
  created_at: string
}

export interface TransactionRecord {
  id: string
  import_id: string
  source_row: number
  date: string
  description: string
  amount_cents: number
  kind: TransactionKind
  category_code: CategoryCode
}

export type StorageErrorCode =
  | 'invalid_record'
  | 'import_not_found'
  | 'overlapping_period'
  | 'limit_exceeded'
  | 'storage_error'

export class MenomittariStorageError extends Error {
  readonly code: StorageErrorCode

  constructor(code: StorageErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MenomittariStorageError'
    this.code = code
  }
}
