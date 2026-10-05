import {
  MenomittariStorageError,
  type ImportRecord,
  type TransactionRecord,
} from './types'
import { CATEGORY_CODES, TRANSACTION_KINDS } from '../domain/transactions'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UTC_TIMESTAMP_PATTERN = /Z$/
const MAX_IMPORT_TRANSACTIONS = 5_000
const MAX_AMOUNT_CENTS = 100_000_000

function invalid(message: string): never {
  throw new MenomittariStorageError('invalid_record', message)
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value))
}

function validateImportRecord(record: ImportRecord): void {
  if (!isUuid(record.id)) {
    invalid('Tuonnin tunniste ei ole kelvollinen UUID.')
  }
  if (!isCalendarDate(record.period_start) || !isCalendarDate(record.period_end)) {
    invalid('Tuonnin ajanjakson päivämäärä ei ole kelvollinen.')
  }
  if (record.period_start > record.period_end) {
    invalid('Tuonnin alkupäivä ei voi olla loppupäivän jälkeen.')
  }
  if (!isUtcTimestamp(record.created_at)) {
    invalid('Tuonnin luontiajan pitää olla UTC-aikaleima.')
  }
}

function validateTransactionRecord(
  record: TransactionRecord,
  parent: ImportRecord,
): void {
  if (!isUuid(record.id)) {
    invalid('Tapahtuman tunniste ei ole kelvollinen UUID.')
  }
  if (record.import_id !== parent.id) {
    invalid('Tapahtuma viittaa väärään tuontiin.')
  }
  if (!Number.isInteger(record.source_row) || record.source_row < 2) {
    invalid('Tapahtuman lähderivin pitää olla kokonaisluku vähintään 2.')
  }
  if (
    !isCalendarDate(record.date) ||
    record.date < parent.period_start ||
    record.date > parent.period_end
  ) {
    invalid('Tapahtuman päivämäärä ei kuulu tuonnin ajanjaksoon.')
  }
  if (
    record.description.length === 0 ||
    record.description.length > 200 ||
    record.description !== record.description.trim()
  ) {
    invalid('Tapahtuman kuvauksen pitää olla siistitty ja 1–200 merkkiä pitkä.')
  }
  if (
    !Number.isSafeInteger(record.amount_cents) ||
    record.amount_cents === 0 ||
    Math.abs(record.amount_cents) > MAX_AMOUNT_CENTS
  ) {
    invalid('Tapahtuman summan pitää olla sallittu kokonainen senttimäärä.')
  }
  if (!TRANSACTION_KINDS.includes(record.kind)) {
    invalid('Tapahtuman tyyppi ei ole sallittu.')
  }
  if (!CATEGORY_CODES.includes(record.category_code)) {
    invalid('Tapahtuman kategoriakoodi ei ole sallittu.')
  }
  if (record.kind === 'expense' && record.amount_cents >= 0) {
    invalid('Menon summan pitää olla negatiivinen.')
  }
  if (
    (record.kind === 'income' || record.kind === 'refund') &&
    record.amount_cents <= 0
  ) {
    invalid('Tulon tai palautuksen summan pitää olla positiivinen.')
  }
  if (
    (record.kind === 'income' || record.kind === 'transfer') &&
    record.category_code !== 'unknown'
  ) {
    invalid('Tulo ja tilisiirto tallennetaan unknown-kategorialla.')
  }
}

export function validateImportWrite(
  importRecord: ImportRecord,
  transactions: TransactionRecord[],
): void {
  // Validate the complete parent-child batch before the repository starts writing it.
  validateImportRecord(importRecord)
  if (
    transactions.length === 0 ||
    transactions.length > MAX_IMPORT_TRANSACTIONS
  ) {
    invalid('Yhdessä tuonnissa pitää olla 1–5 000 tapahtumaa.')
  }

  const transactionIds = new Set<string>()
  const sourceRows = new Set<number>()
  // Sets catch duplicates inside the incoming batch before IndexedDB sees the records.
  for (const transaction of transactions) {
    validateTransactionRecord(transaction, importRecord)
    if (transactionIds.has(transaction.id)) {
      invalid('Tapahtumatunniste ei saa toistua tuonnissa.')
    }
    if (sourceRows.has(transaction.source_row)) {
      invalid('Lähderivi ei saa toistua samassa tuonnissa.')
    }
    transactionIds.add(transaction.id)
    sourceRows.add(transaction.source_row)
  }
}
