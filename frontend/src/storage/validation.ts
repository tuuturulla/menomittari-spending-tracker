/** Rechecks record invariants at the IndexedDB write boundary. */
import {
  MenomittariStorageError,
  type ImportRecord,
  type TransactionRecord,
  type AnalysisSnapshot,
} from './types'
import { CATEGORY_CODES, TRANSACTION_KINDS } from '../domain/transactions'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
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

export function isUtcTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return false
  }
  const parsed = new Date(value)
  // Date parsing can normalize impossible dates; do not accept that as valid backup data.
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19)
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
  if (!Number.isSafeInteger(record.source_row) || record.source_row < 2) {
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

/** Validate a whole history, including links and uniqueness across separate imports. */
export function validateHistoryWrite(snapshot: AnalysisSnapshot): void {
  if (snapshot.transactions.length > 10_000 || snapshot.imports.length > 10_000) {
    invalid('Historian 10 000 tapahtuman raja ylittyy.')
  }
  const imports = new Map<string, ImportRecord>()
  const importIds = new Set<string>()
  const transactionIds = new Set<string>()
  const grouped = new Map<string, TransactionRecord[]>()
  for (const record of snapshot.imports) {
    validateImportRecord(record)
    const identity = record.id.toLowerCase()
    if (importIds.has(identity)) {
      invalid('Tuontitunniste ei saa toistua historiassa.')
    }
    importIds.add(identity)
    imports.set(record.id, record)
    grouped.set(record.id, [])
  }
  for (const record of snapshot.transactions) {
    if (!imports.has(record.import_id)) {
      invalid('Tapahtumalta puuttuu sitä vastaava tuonti.')
    }
    const identity = record.id.toLowerCase()
    if (transactionIds.has(identity)) {
      invalid('Tapahtumatunniste ei saa toistua historiassa.')
    }
    transactionIds.add(identity)
    grouped.get(record.import_id)!.push(record)
  }
  for (const record of snapshot.imports) {
    validateImportWrite(record, grouped.get(record.id)!)
  }
  // Sorting a copy preserves the backup's arrays while detecting every intersecting pair.
  const sorted = [...snapshot.imports].sort((a, b) => a.period_start.localeCompare(b.period_start))
  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index - 1].period_end >= sorted[index].period_start) {
      invalid('Historian tuontijaksot eivät saa mennä päällekkäin.')
    }
  }
}

/** Reject an invalid parent-child batch before any record reaches the database. */
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
