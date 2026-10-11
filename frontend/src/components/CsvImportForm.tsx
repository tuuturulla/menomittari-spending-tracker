/** Keeps CSV controls and their result together, before the potentially long history. */
import { useEffect, useRef, type FormEvent } from 'react'
import { ImportPeriodFields, type ImportPeriodSelection } from './ImportPeriodFields'

interface CsvImportFormProps {
  busy: boolean
  disabled?: boolean
  storageReady: boolean
  selection: ImportPeriodSelection
  onSelectionChange: (selection: ImportPeriodSelection) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  message: string
  error: string
}

export function CsvImportForm({
  busy, disabled = false, storageReady, selection, onSelectionChange, onSubmit, message, error,
}: CsvImportFormProps) {
  const feedbackRef = useRef<HTMLDivElement>(null)

  // Focus brings the result into view and makes it discoverable to keyboard users.
  useEffect(() => {
    if (error || message) {
      feedbackRef.current?.focus()
    }
  }, [error, message])

  return (
    <section className="import-card" aria-labelledby="import-title">
      <h3 id="import-title">Tuo tapahtumat</h3>
      <p id="import-help">
        Valitse Menomittarin demo-CSV tai tuettu S-Pankin
        tilitapahtuma-CSV ja ilmoita koko tiedoston kattama ajanjakso.
        Tiedosto käsitellään vain tässä selaimessa. Käytä kurssiversiossa
        vain fiktiivisiä tapahtumia.
      </p>
      <form onSubmit={onSubmit} aria-describedby="import-help">
        <label htmlFor="csv-file">CSV-tiedosto</label>
        <input
          id="csv-file"
          name="csv_file"
          type="file"
          accept=".csv,text/csv"
          required
          disabled={busy || disabled}
        />
        <ImportPeriodFields
          selection={selection}
          onChange={onSelectionChange}
          disabled={busy || disabled}
        />
        <button type="submit" disabled={!storageReady || busy || disabled}>
          {busy ? 'Tuodaan…' : 'Tuo tapahtumat'}
        </button>

        {(error || message) && (
          <div
            ref={feedbackRef}
            className={`import-feedback ${error ? 'import-error' : 'import-success'}`}
            role={error ? 'alert' : 'status'}
            tabIndex={-1}
          >
            {error ? <><strong>Tuonti estettiin</strong><p>{error}</p></> : <p>{message}</p>}
          </div>
        )}
      </form>
    </section>
  )
}
