/** Parses supported CSV layouts into validated and categorized transactions. */
import Papa from 'papaparse'
import { categorizeTransaction } from './categorization'
import { TRANSACTION_KINDS, type TransactionKind } from './transactions'

const MENOMITTARI_HEADER = ['date', 'description', 'amount', 'kind'] as const

// A bank adapter is selected only when the complete header matches. This avoids
// silently interpreting an unknown bank export with the wrong column mapping.
const S_PANKKI_HEADER = [
  'Kirjauspäivä',
  'Maksupäivä',
  'Summa',
  'Tapahtumalaji',
  'Maksaja',
  'Saajan nimi',
  'Saajan tilinumero',
  'Saajan BIC-tunnus',
  'Viitenumero',
  'Viesti',
  'Arkistointitunnus',
] as const
const MAX_IMPORT_TRANSACTIONS = 5_000
const MAX_AMOUNT_CENTS = 100_000_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const AMOUNT_PATTERN = /^([+-]?)(\d+)\.(\d{2})$/
const FINNISH_AMOUNT_PATTERN = /^([+-]?)(\d+),(\d{2})$/
const FINNISH_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/

export type CsvImportErrorCode =
  | 'invalid_csv'
  | 'invalid_period'
  | 'limit_exceeded'

export type CsvImportField =
  | 'period_start'
  | 'period_end'
  | 'date'
  | 'description'
  | 'amount'
  | 'kind'

export class CsvImportValidationError extends Error {
  readonly code: CsvImportErrorCode
  readonly row: number | null
  readonly field: CsvImportField | null

  constructor(
    code: CsvImportErrorCode,
    message: string,
    row: number | null = null,
    field: CsvImportField | null = null,
  ) {
    super(message)
    this.name = 'CsvImportValidationError'
    this.code = code
    this.row = row
    this.field = field
  }
}

export interface ValidatedCsvTransaction {
  source_row: number
  date: string
  description: string
  amount_cents: number
  kind: TransactionKind
  category_code: ReturnType<typeof categorizeTransaction>
}

function invalidCsv(
  message: string,
  row: number | null = null,
  field: CsvImportField | null = null,
): never {
  throw new CsvImportValidationError('invalid_csv', message, row, field)
}

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function validatePeriod(periodStart: string, periodEnd: string): void {
  if (!isCalendarDate(periodStart)) {
    throw new CsvImportValidationError(
      'invalid_period',
      'Ajanjakson alkupäivä ei ole kelvollinen.',
      null,
      'period_start',
    )
  }
  if (!isCalendarDate(periodEnd)) {
    throw new CsvImportValidationError(
      'invalid_period',
      'Ajanjakson loppupäivä ei ole kelvollinen.',
      null,
      'period_end',
    )
  }
  if (periodStart > periodEnd) {
    throw new CsvImportValidationError(
      'invalid_period',
      'Ajanjakson alkupäivä ei voi olla loppupäivän jälkeen.',
      null,
      'period_start',
    )
  }
}

function parseAmount(value: string, row: number): number {
  const match = AMOUNT_PATTERN.exec(value)
  if (!match) {
    invalidCsv('Summan pitää olla esimerkiksi -12.50 tai +5.00.', row, 'amount')
  }

  const wholeEuros = Number(match[2])
  const decimalCents = Number(match[3])
  const absoluteCents = wholeEuros * 100 + decimalCents
  const amountCents = match[1] === '-' ? -absoluteCents : absoluteCents

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents === 0 ||
    Math.abs(amountCents) > MAX_AMOUNT_CENTS
  ) {
    invalidCsv(
      'Summan pitää olla nollasta poikkeava ja enintään 1 000 000 euroa.',
      row,
      'amount',
    )
  }
  return amountCents
}

function parseFinnishAmount(value: string, row: number): number {
  const match = FINNISH_AMOUNT_PATTERN.exec(value.trim())
  if (!match) {
    invalidCsv('S-Pankin summan pitää olla esimerkiksi -12,50 tai 5,00.', row, 'amount')
  }

  const wholeEuros = Number(match[2])
  const decimalCents = Number(match[3])
  const absoluteCents = wholeEuros * 100 + decimalCents
  const amountCents = match[1] === '-' ? -absoluteCents : absoluteCents

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents === 0 ||
    Math.abs(amountCents) > MAX_AMOUNT_CENTS
  ) {
    invalidCsv(
      'Summan pitää olla nollasta poikkeava ja enintään 1 000 000 euroa.',
      row,
      'amount',
    )
  }
  return amountCents
}

function parseFinnishDate(value: string, row: number): string {
  const match = FINNISH_DATE_PATTERN.exec(value.trim())
  if (!match) {
    invalidCsv('S-Pankin kirjauspäivän pitää olla muodossa P.K.VVVV.', row, 'date')
  }

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const isoDate = `${match[3]}-${month}-${day}`
  if (!isCalendarDate(isoDate)) {
    invalidCsv('S-Pankin kirjauspäivä ei ole kelvollinen.', row, 'date')
  }
  return isoDate
}

function parseKind(value: string, row: number): TransactionKind {
  if (!TRANSACTION_KINDS.includes(value as TransactionKind)) {
    invalidCsv('Tapahtuman tyyppi ei ole sallittu.', row, 'kind')
  }
  return value as TransactionKind
}

function validateAmountSign(
  amountCents: number,
  kind: TransactionKind,
  row: number,
): void {
  if (kind === 'expense' && amountCents >= 0) {
    invalidCsv('Menon summan pitää olla negatiivinen.', row, 'amount')
  }
  if ((kind === 'income' || kind === 'refund') && amountCents <= 0) {
    invalidCsv('Tulon tai palautuksen summan pitää olla positiivinen.', row, 'amount')
  }
}

function isEmptyRecord(record: string[]): boolean {
  return record.every((field) => field.trim() === '')
}

function headerMatches(header: string[], expected: readonly string[]): boolean {
  return (
    header.length === expected.length &&
    expected.every((field, index) => header[index] === field)
  )
}

function validateTransactionDate(
  date: string,
  periodStart: string,
  periodEnd: string,
  sourceRow: number,
): void {
  if (date < periodStart || date > periodEnd) {
    throw new CsvImportValidationError(
      'invalid_period',
      'Tapahtuman päivämäärä ei kuulu annettuun ajanjaksoon.',
      sourceRow,
      'date',
    )
  }
}

function validateDescription(description: string, row: number): void {
  if (description.length === 0 || description.length > 200) {
    invalidCsv(
      'Tapahtuman kuvauksen pitää olla 1–200 merkkiä pitkä.',
      row,
      'description',
    )
  }
}

function parseMenomittariRecord(
  record: string[],
  sourceRow: number,
  periodStart: string,
  periodEnd: string,
): ValidatedCsvTransaction {
  if (record.length !== MENOMITTARI_HEADER.length) {
    invalidCsv('Tapahtumarivillä pitää olla täsmälleen neljä kenttää.', sourceRow)
  }

  const [date, rawDescription, rawAmount, rawKind] = record
  if (!isCalendarDate(date)) {
    invalidCsv('Tapahtuman päivämäärä ei ole kelvollinen.', sourceRow, 'date')
  }
  validateTransactionDate(date, periodStart, periodEnd, sourceRow)

  const description = rawDescription.trim()
  validateDescription(description, sourceRow)
  const amountCents = parseAmount(rawAmount, sourceRow)
  const kind = parseKind(rawKind, sourceRow)
  validateAmountSign(amountCents, kind, sourceRow)

  return {
    source_row: sourceRow,
    date,
    description,
    amount_cents: amountCents,
    kind,
    category_code: categorizeTransaction(description, kind),
  }
}

function parseSPankkiRecord(
  record: string[],
  sourceRow: number,
  periodStart: string,
  periodEnd: string,
): ValidatedCsvTransaction {
  if (record.length !== S_PANKKI_HEADER.length) {
    invalidCsv('S-Pankin tapahtumarivillä pitää olla täsmälleen 11 kenttää.', sourceRow)
  }

  const [
    rawBookingDate,
    ,
    rawAmount,
    transactionType,
    payer,
    recipient,
    ,
    ,
    ,
    message,
  ] = record
  const date = parseFinnishDate(rawBookingDate, sourceRow)
  validateTransactionDate(date, periodStart, periodEnd, sourceRow)
  const amountCents = parseFinnishAmount(rawAmount, sourceRow)

  // S-Pankki does not provide Menomittari's domain type. Sign gives a safe
  // baseline, while refunds and transfers remain impossible to infer reliably.
  const kind: TransactionKind = amountCents < 0 ? 'expense' : 'income'
  const counterparty = amountCents < 0 ? recipient.trim() : payer.trim()
  const otherCounterparty = amountCents < 0 ? payer.trim() : recipient.trim()
  const description =
    counterparty || otherCounterparty || message.trim() || transactionType.trim()
  validateDescription(description, sourceRow)

  return {
    source_row: sourceRow,
    date,
    description,
    amount_cents: amountCents,
    kind,
    category_code: categorizeTransaction(description, kind),
  }
}

export function parseImportCsv(
  csvText: string,
  periodStart: string,
  periodEnd: string,
): ValidatedCsvTransaction[] {
  validatePeriod(periodStart, periodEnd)

  // Papa Parse handles quoted separators and line breaks as one logical CSV record.
  const parsed = Papa.parse<string[]>(csvText.replace(/^\uFEFF/u, ''), {
    delimiter: ';',
    skipEmptyLines: false,
  })
  const firstParseError = parsed.errors[0]
  if (firstParseError) {
    invalidCsv(
      'CSV-tiedoston rakennetta ei voitu lukea.',
      typeof firstParseError.row === 'number' ? firstParseError.row + 1 : null,
    )
  }

  const [header, ...dataRecords] = parsed.data
  if (!header) {
    invalidCsv('CSV-tiedostossa ei ole otsikkoa.', 1)
  }

  const isMenomittariCsv = headerMatches(header, MENOMITTARI_HEADER)
  const isSPankkiCsv = headerMatches(header, S_PANKKI_HEADER)
  if (!isMenomittariCsv && !isSPankkiCsv) {
    invalidCsv(
      'CSV-otsikko ei vastaa Menomittarin tai S-Pankin tuettua muotoa.',
      1,
    )
  }

  const nonEmptyRecordCount = dataRecords.filter((record) => !isEmptyRecord(record)).length
  if (nonEmptyRecordCount === 0) {
    invalidCsv('CSV-tiedostossa ei ole tapahtumia.')
  }
  if (nonEmptyRecordCount > MAX_IMPORT_TRANSACTIONS) {
    throw new CsvImportValidationError(
      'limit_exceeded',
      'Yhdessä tiedostossa saa olla enintään 5 000 tapahtumaa.',
    )
  }

  const transactions: ValidatedCsvTransaction[] = []
  dataRecords.forEach((record, dataIndex) => {
    const sourceRow = dataIndex + 2
    if (isEmptyRecord(record)) {
      return
    }
    transactions.push(
      isSPankkiCsv
        ? parseSPankkiRecord(record, sourceRow, periodStart, periodEnd)
        : parseMenomittariRecord(record, sourceRow, periodStart, periodEnd),
    )
  })

  return transactions
}
