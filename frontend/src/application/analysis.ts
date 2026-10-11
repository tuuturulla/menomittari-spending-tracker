/** Load one local snapshot and turn it into the selected period's comparison. */
import { analyzePeriods, type Analysis } from '../domain/analysis'
import { MenomittariStorageError, type AnalysisSnapshot } from '../storage/types'
import { isUuid } from '../storage/validation'
import type { HistoryErrorCode, HistoryResult } from './transaction-history'

export interface AnalysisStorage {
  readAnalysisSnapshot(): Promise<AnalysisSnapshot>
}

function failure(code: HistoryErrorCode, message: string): HistoryResult<never> {
  return { ok: false, error: { code, message, row: null, field: null } }
}

/** Find the requested import; the domain chooses and filters the comparison window. */
export async function getAnalysis(
  storage: AnalysisStorage,
  selectedImportId: string,
): Promise<HistoryResult<Analysis>> {
  if (!isUuid(selectedImportId)) {
    return failure('invalid_request', 'Valitun jakson tunniste ei ole kelvollinen.')
  }

  try {
    const snapshot = await storage.readAnalysisSnapshot()
    const current = snapshot.imports.find((item) => item.id === selectedImportId)
    if (!current) {
      return failure('import_not_found', 'Valittua jaksoa ei löytynyt paikallisesta historiasta.')
    }

    // Domain rules receive plain records; Dexie stays behind the storage boundary.
    return {
      ok: true,
      data: analyzePeriods(current, snapshot.imports, snapshot.transactions),
    }
  } catch (error) {
    if (error instanceof MenomittariStorageError) {
      return failure('storage_error', error.message)
    }
    return failure('internal_error', 'Vertailua ei voitu laskea.')
  }
}
