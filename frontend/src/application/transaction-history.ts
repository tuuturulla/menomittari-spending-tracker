/** Loads saved periods and builds a full-period summary with a paged event list. */
import { calculateSummary, type SpendingSummary } from '../domain/summary'
import { MenomittariStorageError } from '../storage/types'
import type { ImportRecord, TransactionRecord } from '../storage/types'

export const TRANSACTION_PAGE_SIZE = 50

export type HistoryErrorCode =
  | 'invalid_request'
  | 'import_not_found'
  | 'storage_error'
  | 'internal_error'

export interface HistoryError {
  code: HistoryErrorCode
  message: string
  row: null
  field: null
}

export type HistoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: HistoryError }

export interface HistoryStorage {
  listImports(): Promise<ImportRecord[]>
  listTransactions(importId: string): Promise<TransactionRecord[]>
}

export interface TransactionListItem {
  id: string
  import_id: string
  date: string
  description: string
  amount_cents: number
  kind: TransactionRecord['kind']
  category_code: TransactionRecord['category_code']
}

export interface TransactionPage {
  items: TransactionListItem[]
  total: number
  offset: number
  limit: number
}

export interface TransactionView {
  summary: SpendingSummary
  transactions: TransactionPage
}

function failure(code: HistoryErrorCode, message: string): HistoryResult<never> {
  return { ok: false, error: { code, message, row: null, field: null } }
}

function storageFailure(error: MenomittariStorageError): HistoryResult<never> {
  if (error.code === 'import_not_found') {
    return failure('import_not_found', error.message)
  }
  if (error.code === 'invalid_record') {
    return failure('invalid_request', error.message)
  }
  return failure('storage_error', error.message)
}

export async function listHistoryImports(
  storage: HistoryStorage,
): Promise<HistoryResult<{ items: ImportRecord[] }>> {
  try {
    return { ok: true, data: { items: await storage.listImports() } }
  } catch (error) {
    if (error instanceof MenomittariStorageError) {
      return storageFailure(error)
    }
    return failure('internal_error', 'Tallennettuja jaksoja ei voitu lukea.')
  }
}

export async function loadTransactionView(
  storage: HistoryStorage,
  selectedImport: ImportRecord,
  offset = 0,
  limit = TRANSACTION_PAGE_SIZE,
): Promise<HistoryResult<TransactionView>> {
  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 200
  ) {
    return failure('invalid_request', 'Tapahtumasivun rajaus ei ole kelvollinen.')
  }

  try {
    // One immutable import dataset feeds both the summary and the visible page.
    const storedTransactions = await storage.listTransactions(selectedImport.id)
    const items = storedTransactions.slice(offset, offset + limit).map((transaction) => ({
      id: transaction.id,
      import_id: transaction.import_id,
      date: transaction.date,
      description: transaction.description,
      amount_cents: transaction.amount_cents,
      kind: transaction.kind,
      category_code: transaction.category_code,
    }))

    return {
      ok: true,
      data: {
        summary: calculateSummary(selectedImport, storedTransactions),
        transactions: {
          items,
          total: storedTransactions.length,
          offset,
          limit,
        },
      },
    }
  } catch (error) {
    if (error instanceof MenomittariStorageError) {
      return storageFailure(error)
    }
    return failure('internal_error', 'Tapahtumia ei voitu lukea.')
  }
}
