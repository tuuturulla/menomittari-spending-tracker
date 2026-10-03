import Dexie, { type Table } from 'dexie'
import type { ImportRecord, TransactionRecord } from './types'
import { isUuid } from './validation'

const DATABASE_PREFIX = 'menomittari'

export function databaseNameForUser(userId: string): string {
  if (!isUuid(userId)) {
    throw new TypeError('User id must be a UUID before opening local storage.')
  }
  // A separate browser database keeps each signed-in user's financial history isolated.
  return `${DATABASE_PREFIX}-${userId.toLowerCase()}`
}

// Dexie is the small wrapper that maps this class to the browser's IndexedDB API.
export class MenomittariDatabase extends Dexie {
  readonly imports: Table<ImportRecord, string>
  readonly transactions: Table<TransactionRecord, string>

  constructor(userId: string) {
    super(databaseNameForUser(userId))

    // Schema strings list primary keys and indexes, not every field stored in a record.
    // `&` makes an index unique; repository checks handle partially overlapping periods.
    this.version(1).stores({
      imports: 'id, period_end, &[period_start+period_end]',
      transactions: 'id, &[import_id+source_row], [import_id+date+id]',
    })

    // Typed table references keep Dexie details inside the storage layer.
    this.imports = this.table('imports')
    this.transactions = this.table('transactions')
  }
}
