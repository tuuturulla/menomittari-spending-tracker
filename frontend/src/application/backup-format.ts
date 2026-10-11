/** Validates untrusted JSON before restoring the original local history records. */
import type { AnalysisSnapshot, ImportRecord, TransactionRecord } from '../storage/types'
import { isUtcTimestamp, validateHistoryWrite } from '../storage/validation'

export interface BackupDocument extends AnalysisSnapshot {
  format_version: 1
  exported_at: string
  currency: 'EUR'
}

export class BackupValidationError extends Error {
  readonly code: 'invalid_backup' | 'unsupported_backup_version'

  constructor(
    code: 'invalid_backup' | 'unsupported_backup_version',
    message: string,
  ) {
    super(message)
    this.code = code
    this.name = 'BackupValidationError'
  }
}

function invalid(message: string): never {
  throw new BackupValidationError('invalid_backup', message)
}

function exactObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalid('Varmuuskopion tietueen pitää olla JSON-olio.')
  }
  const actual = Object.keys(value)
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    invalid('Varmuuskopiosta puuttuu kenttiä tai siinä on ylimääräisiä kenttiä.')
  }
  return value as Record<string, unknown>
}

function typedRecord(value: unknown, stringKeys: string[], numberKeys: string[] = []) {
  const record = exactObject(value, [...stringKeys, ...numberKeys])
  if (stringKeys.some((key) => typeof record[key] !== 'string') ||
      numberKeys.some((key) => typeof record[key] !== 'number')) {
    invalid('Varmuuskopion kentän tietotyyppi on virheellinen.')
  }
  return record
}

/** Check field types before treating records as typed data, then verify their relationships. */
export function validateBackupDocument(value: unknown): BackupDocument {
  const object = exactObject(value, ['format_version', 'exported_at', 'currency', 'imports', 'transactions'])
  if (typeof object.format_version !== 'number' || !Number.isSafeInteger(object.format_version) || object.format_version < 1) {
    invalid('Varmuuskopion version pitää olla positiivinen kokonaisluku.')
  }
  if (object.format_version !== 1) {
    throw new BackupValidationError('unsupported_backup_version', 'Varmuuskopion versiota ei tueta. Tuettu versio on 1.')
  }
  if (object.currency !== 'EUR' || typeof object.exported_at !== 'string' || !isUtcTimestamp(object.exported_at)) {
    invalid('Varmuuskopion valuutan pitää olla EUR ja vientiajan kelvollinen UTC-aikaleima.')
  }
  if (!Array.isArray(object.imports) || !Array.isArray(object.transactions)) {
    invalid('Varmuuskopion tuontien ja tapahtumien pitää olla taulukoita.')
  }
  if (object.imports.length > 10_000 || object.transactions.length > 10_000) {
    invalid('Varmuuskopion historian 10 000 tapahtuman raja ylittyy.')
  }
  const imports = object.imports.map((record) => typedRecord(record,
    ['id', 'period_start', 'period_end', 'created_at']) as unknown as ImportRecord)
  const transactions = object.transactions.map((record) => typedRecord(record,
    ['id', 'import_id', 'date', 'description', 'kind', 'category_code'],
    ['source_row', 'amount_cents']) as unknown as TransactionRecord)
  const snapshot = { imports, transactions }
  try {
    // Reuse write-boundary invariants so CSV imports and backups follow the same rules.
    validateHistoryWrite(snapshot)
  } catch {
    invalid('Varmuuskopion tunnisteet, viitteet, jaksot tai tapahtumat ovat virheellisiä.')
  }
  return { ...snapshot, format_version: 1, currency: 'EUR', exported_at: object.exported_at }
}
