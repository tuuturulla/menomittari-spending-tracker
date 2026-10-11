/** Shows period selection, spending totals, and paged transactions from local storage. */
import { useEffect, useState, type ChangeEvent } from 'react'
import { getAnalysis, type AnalysisStorage } from '../application/analysis'
import {
  listHistoryImports,
  loadTransactionView,
  TRANSACTION_PAGE_SIZE,
  type HistoryStorage,
  type TransactionPage,
  type TransactionView,
} from '../application/transaction-history'
import { CATEGORY_NAMES, type TransactionKind } from '../domain/transactions'
import type { Analysis } from '../domain/analysis'
import type { ImportRecord } from '../storage/types'
import { AnalysisPanel } from './AnalysisPanel'
import { formatCurrency, formatDate, formatPeriod } from './format'

interface TransactionHistoryProps {
  storage: HistoryStorage & AnalysisStorage
  refreshKey: number
}

interface ImportsLoad {
  storage: HistoryStorage
  refreshKey: number
  items: ImportRecord[]
  error: string
}

interface ViewLoad {
  storage: HistoryStorage
  importId: string
  offset: number
  view: TransactionView | null
  error: string
}

interface AnalysisLoad {
  storage: HistoryStorage & AnalysisStorage
  refreshKey: number
  importId: string
  analysis: Analysis | null
  error: string
}

const KIND_NAMES: Record<TransactionKind, string> = {
  expense: 'Meno',
  income: 'Tulo',
  refund: 'Palautus',
  transfer: 'Tilisiirto',
}

/** Render the selected page; React escapes descriptions supplied by CSV files. */
export function TransactionList({ page }: { page: TransactionPage }) {
  if (page.items.length === 0) {
    return <p className="empty-state">Valitulla sivulla ei ole tapahtumia.</p>
  }

  return (
    <ul className="transaction-list" aria-label="Jakson tapahtumat">
      {page.items.map((transaction) => (
        <li className="transaction-row" key={transaction.id}>
          <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
          <span className="transaction-description">{transaction.description}</span>
          <span className="transaction-meta">
            {KIND_NAMES[transaction.kind]} · {CATEGORY_NAMES[transaction.category_code]}
          </span>
          <strong className="transaction-amount">
            {formatCurrency(transaction.amount_cents)}
          </strong>
        </li>
      ))}
    </ul>
  )
}

function SummaryPanel({ view }: { view: TransactionView }) {
  return (
    <>
      <div className="summary-metrics">
        <div>
          <span>Menot yhteensä</span>
          <strong>{formatCurrency(view.summary.expense_cents)}</strong>
        </div>
        <div>
          <span>Palautukset erikseen</span>
          <strong>{formatCurrency(view.summary.refund_cents)}</strong>
        </div>
      </div>

      <section className="category-section" aria-labelledby="category-title">
        <h4 id="category-title">Menot ryhmittäin</h4>
        <ul className="category-summary">
          {view.summary.categories.map((category) => (
            <li key={category.category_code}>
              <span>{category.name}</span>
              <strong>{formatCurrency(category.expense_cents)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/** Keep period selection and page state in sync with the stored import history. */
export function TransactionHistory({
  storage,
  refreshKey,
}: TransactionHistoryProps) {
  const [selectedImportId, setSelectedImportId] = useState('')
  const [offset, setOffset] = useState(0)
  const [importsLoad, setImportsLoad] = useState<ImportsLoad | null>(null)
  const [viewLoad, setViewLoad] = useState<ViewLoad | null>(null)
  const [analysisLoad, setAnalysisLoad] = useState<AnalysisLoad | null>(null)

  // Reload periods when the database opens or a new import increments `refreshKey`.
  useEffect(() => {
    let active = true

    listHistoryImports(storage)
      .then((result) => {
        if (!active) {
          return
        }
        if (!result.ok) {
          setImportsLoad({
            storage,
            refreshKey,
            items: [],
            error: result.error.message,
          })
          setSelectedImportId('')
          return
        }

        setImportsLoad({
          storage,
          refreshKey,
          items: result.data.items,
          error: '',
        })
        // A fresh session and a successful import both return to the newest period.
        setSelectedImportId(result.data.items[0]?.id ?? '')
        setOffset(0)
      })

    return () => {
      active = false
    }
  }, [storage, refreshKey])

  // Ignore a saved result if it belongs to an older database or refresh cycle.
  const currentImportsLoad =
    importsLoad?.storage === storage && importsLoad.refreshKey === refreshKey
      ? importsLoad
      : null
  const imports = currentImportsLoad?.items ?? []
  const loadingImports = currentImportsLoad === null
  const selectedImport = imports.find((item) => item.id === selectedImportId) ?? null

  // Fetch the chosen period and page; changing either makes the old result inactive.
  useEffect(() => {
    if (!selectedImport) {
      return
    }

    let active = true

    loadTransactionView(storage, selectedImport, offset)
      .then((result) => {
        // Cleanup marks an older request inactive when the user changes period quickly.
        if (!active) {
          return
        }
        if (result.ok) {
          setViewLoad({
            storage,
            importId: selectedImport.id,
            offset,
            view: result.data,
            error: '',
          })
        } else {
          setViewLoad({
            storage,
            importId: selectedImport.id,
            offset,
            view: null,
            error: result.error.message,
          })
        }
      })

    return () => {
      active = false
    }
  }, [offset, selectedImport, storage])

  // Analysis does not depend on the visible transaction page, only on the selected period.
  useEffect(() => {
    if (!selectedImport) {
      return
    }

    let active = true
    getAnalysis(storage, selectedImport.id).then((result) => {
      if (!active) {
        return
      }
      setAnalysisLoad({
        storage,
        refreshKey,
        importId: selectedImport.id,
        analysis: result.ok ? result.data : null,
        error: result.ok ? '' : result.error.message,
      })
    })

    return () => {
      active = false
    }
  }, [refreshKey, selectedImport, storage])

  const selectPeriod = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedImportId(event.target.value)
    setOffset(0)
  }

  // Only a result tagged with the current selection and offset may appear on screen.
  const currentViewLoad =
    selectedImport &&
    viewLoad?.storage === storage &&
    viewLoad.importId === selectedImport.id &&
    viewLoad.offset === offset
      ? viewLoad
      : null
  const view = currentViewLoad?.view ?? null
  const loadingView = selectedImport !== null && currentViewLoad === null
  const error = currentImportsLoad?.error || currentViewLoad?.error || ''
  const page = view?.transactions
  const currentAnalysisLoad =
    selectedImport &&
    analysisLoad?.storage === storage &&
    analysisLoad.refreshKey === refreshKey &&
    analysisLoad.importId === selectedImport.id
      ? analysisLoad
      : null
  const loadingAnalysis = selectedImport !== null && currentAnalysisLoad === null
  const currentPage = page ? Math.floor(page.offset / page.limit) + 1 : 1
  const pageCount = page ? Math.max(1, Math.ceil(page.total / page.limit)) : 1

  return (
    <section className="history-card" aria-labelledby="history-title">
      <h3 id="history-title">Tapahtumat ja yhteenveto</h3>

      {loadingImports && <p className="status-message">Ladataan tallennettuja jaksoja…</p>}

      {!loadingImports && imports.length === 0 && !error && (
        <p className="empty-state">
          Ei tallennettuja jaksoja. Tuo ensin CSV-tiedosto yllä olevalla lomakkeella.
        </p>
      )}

      {imports.length > 0 && (
        <>
          <label htmlFor="history-period">Tarkasteltava ajanjakso</label>
          <select
            id="history-period"
            value={selectedImportId}
            onChange={selectPeriod}
            disabled={loadingImports}
          >
            {imports.map((item) => (
              <option key={item.id} value={item.id}>
                {formatPeriod(item)}
              </option>
            ))}
          </select>
        </>
      )}

      {error && <p className="error-message history-error">{error}</p>}
      {loadingView && <p className="status-message">Ladataan tapahtumia…</p>}

      {selectedImport && view && !loadingView && (
        <div className="history-content">
          <p className="selected-period">
            Valittu ajanjakso: <strong>{formatPeriod(selectedImport)}</strong>
          </p>
          <SummaryPanel view={view} />
          {loadingAnalysis && <p className="status-message">Lasketaan vertailua…</p>}
          {currentAnalysisLoad?.error && (
            <p className="error-message">{currentAnalysisLoad.error}</p>
          )}
          {currentAnalysisLoad?.analysis && (
            <AnalysisPanel analysis={currentAnalysisLoad.analysis} />
          )}

          <section className="transactions-section" aria-labelledby="transactions-title">
            <div className="section-heading">
              <div>
                <h4 id="transactions-title">Tapahtumat</h4>
                <p>
                  {page?.total ?? 0} tapahtumaa · sivu {currentPage}/{pageCount}
                </p>
              </div>
              <div className="pagination" aria-label="Tapahtumien sivutus">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!page || page.offset === 0 || loadingView}
                  onClick={() => setOffset((current) => Math.max(0, current - TRANSACTION_PAGE_SIZE))}
                >
                  Edellinen
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!page || page.offset + page.items.length >= page.total || loadingView}
                  onClick={() => setOffset((current) => current + TRANSACTION_PAGE_SIZE)}
                >
                  Seuraava
                </button>
              </div>
            </div>
            {page && <TransactionList page={page} />}
          </section>
        </div>
      )}
    </section>
  )
}
