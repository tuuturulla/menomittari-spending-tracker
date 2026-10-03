import Dexie, { type Table } from 'dexie'
import type { ImportRecord, TransactionRecord } from './types'
import { isUuid } from './validation'

const DATABASE_PREFIX = 'menomittari'

export function databaseNameForUser(userId: string): string {
  if (!isUuid(userId)) {
    throw new TypeError('User id must be a UUID before opening local storage.')
  }
  return `${DATABASE_PREFIX}-${userId.toLowerCase()}`
}

export class MenomittariDatabase extends Dexie {
  readonly imports: Table<ImportRecord, string>
  readonly transactions: Table<TransactionRecord, string>

  constructor(userId: string) {
    super(databaseNameForUser(userId))

    // Version 1 matches the schema documented for the first local-first release.
    this.version(1).stores({
      imports: 'id, period_end, &[period_start+period_end]',
      transactions: 'id, &[import_id+source_row], [import_id+date+id]',
    })

    this.imports = this.table('imports')
    this.transactions = this.table('transactions')
  }
}
