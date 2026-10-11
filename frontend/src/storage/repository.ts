/** Reads local history and saves each import atomically after overlap and size checks. */
import { MenomittariDatabase } from './database'
import {
  MenomittariStorageError,
  type AnalysisSnapshot,
  type ImportRecord,
  type TransactionRecord,
} from './types'
import { isUuid, validateImportWrite } from './validation'

const MAX_DATABASE_TRANSACTIONS = 10_000
const MIN_STORED_DATE = '0000-01-01'
const MAX_STORED_DATE = '9999-12-31'
const MIN_STORED_ID = ''
const MAX_STORED_ID = '\uffff'

function wrapStorageError(error: unknown, message: string): never {
  if (error instanceof MenomittariStorageError) {
    throw error
  }
  throw new MenomittariStorageError('storage_error', message, { cause: error })
}

// The repository gives the rest of the app a small API without exposing Dexie objects.
export class LocalStorageRepository {
  private readonly database: MenomittariDatabase

  constructor(userId: string) {
    this.database = new MenomittariDatabase(userId)
  }

  get name(): string {
    return this.database.name
  }

  async open(): Promise<void> {
    try {
      // Opening creates the IndexedDB database and its stores when they do not exist yet.
      await this.database.open()
    } catch (error) {
      wrapStorageError(error, 'Paikallista tietokantaa ei voitu avata.')
    }
  }

  close(): void {
    this.database.close()
  }

  /** Check the period and capacity, then commit its parent and children together. */
  async saveImportWithTransactions(
    importRecord: ImportRecord,
    transactions: TransactionRecord[],
  ): Promise<void> {
    validateImportWrite(importRecord, transactions)

    try {
      // Every check and insert stays inside one transaction so a failure rolls back all writes.
      await this.database.transaction(
        'rw',
        this.database.imports,
        this.database.transactions,
        async () => {
          // Reject every intersecting period, not only an exact duplicate of both dates.
          const overlappingImport = await this.database.imports
            .filter(
              (storedImport) =>
                storedImport.period_start <= importRecord.period_end &&
                storedImport.period_end >= importRecord.period_start,
            )
            .first()
          if (overlappingImport) {
            throw new MenomittariStorageError(
              'overlapping_period',
              `Valitsemasi ajanjakso ${importRecord.period_start}–${importRecord.period_end} ` +
              `menee päällekkäin jo tallennetun jakson ${overlappingImport.period_start}–${overlappingImport.period_end} kanssa. ` +
              'MVP ei yhdistä päällekkäisiä tuonteja eikä korvaa aiempaa tuontia.',
            )
          }

          const storedTransactionCount = await this.database.transactions.count()
          if (
            storedTransactionCount + transactions.length >
            MAX_DATABASE_TRANSACTIONS
          ) {
            throw new MenomittariStorageError(
              'limit_exceeded',
              'Paikallisen historian 10 000 tapahtuman raja ylittyisi.',
            )
          }

          await this.database.imports.add(importRecord)
          await this.database.transactions.bulkAdd(transactions)
        },
      )
    } catch (error) {
      wrapStorageError(error, 'Tuontia ei voitu tallentaa paikallisesti.')
    }
  }

  async listImports(): Promise<ImportRecord[]> {
    try {
      const imports = await this.database.imports.toArray()
      // The UI expects the newest period first, with id as a stable tie-breaker.
      return imports.sort(
        (left, right) =>
          right.period_start.localeCompare(left.period_start) ||
          left.id.localeCompare(right.id),
      )
    } catch (error) {
      wrapStorageError(error, 'Tallennettuja tuonteja ei voitu lukea.')
    }
  }

  /** Read one import's transactions in stable date-and-ID order for the history view. */
  async listTransactions(importId: string): Promise<TransactionRecord[]> {
    if (!isUuid(importId)) {
      throw new MenomittariStorageError(
        'invalid_record',
        'Tuonnin tunniste ei ole kelvollinen UUID.',
      )
    }

    try {
      if (!(await this.database.imports.get(importId))) {
        throw new MenomittariStorageError(
          'import_not_found',
          'Tuontia ei löytynyt paikallisesta historiasta.',
        )
      }

      // The compound index returns one import's transactions in date and id order.
      return await this.database.transactions
        .where('[import_id+date+id]')
        .between(
          [importId, MIN_STORED_DATE, MIN_STORED_ID],
          [importId, MAX_STORED_DATE, MAX_STORED_ID],
        )
        .toArray()
    } catch (error) {
      wrapStorageError(error, 'Tapahtumia ei voitu lukea paikallisesti.')
    }
  }

  /** Read both stores in one snapshot so comparison never mixes two database moments. */
  async readAnalysisSnapshot(): Promise<AnalysisSnapshot> {
    try {
      return await this.database.transaction(
        'r',
        this.database.imports,
        this.database.transactions,
        async () => {
          const [imports, transactions] = await Promise.all([
            this.database.imports.toArray(),
            this.database.transactions.toArray(),
          ])
          return { imports, transactions }
        },
      )
    } catch (error) {
      wrapStorageError(error, 'Analyysin tietoja ei voitu lukea paikallisesti.')
    }
  }
}

export function createLocalStorage(userId: string): LocalStorageRepository {
  return new LocalStorageRepository(userId)
}
