/** Let the user choose a full calendar month or declare the CSV's custom coverage. */
import { calendarMonthPeriod } from '../domain/periods'

export interface ImportPeriodSelection {
  mode: 'month' | 'custom'
  month: string
  start: string
  end: string
}

interface ImportPeriodFieldsProps {
  selection: ImportPeriodSelection
  onChange: (selection: ImportPeriodSelection) => void
  disabled: boolean
}

export function ImportPeriodFields({ selection, onChange, disabled }: ImportPeriodFieldsProps) {
  // Both modes submit the same named date fields, so import validation stays unchanged.
  const period = selection.mode === 'month' ? calendarMonthPeriod(selection.month) : null
  const start = selection.mode === 'month' ? period?.period_start ?? '' : selection.start
  const end = selection.mode === 'month' ? period?.period_end ?? '' : selection.end

  return (
    <>
      <label htmlFor="period-mode">Tuonnin ajanjakso</label>
      <select
        id="period-mode"
        value={selection.mode}
        disabled={disabled}
        onChange={(event) => onChange({
          ...selection,
          mode: event.target.value === 'month' ? 'month' : 'custom',
          // Switching to custom dates starts from the visible month, not an unrelated range.
          start, end,
        })}
      >
        <option value="month">Kokonainen kuukausi</option>
        <option value="custom">Oma ajanjakso</option>
      </select>

      {selection.mode === 'month' && (
        <>
          <label htmlFor="import-month">Tuotava kuukausi</label>
          <input
            id="import-month"
            type="month"
            required
            value={selection.month}
            disabled={disabled}
            // Input events keep derived dates current across native month-picker implementations.
            onInput={(event) => onChange({ ...selection, month: event.currentTarget.value })}
          />
          <p className="field-hint">Tuo valitsemasi kuukauden kaikki tilitapahtumat. Päivät täyttyvät automaattisesti.</p>
        </>
      )}

      <div className="date-fields">
        <div>
          <label htmlFor="period-start">Ajanjakson alku</label>
          <input
            id="period-start"
            name="period_start"
            type="date"
            required
            value={start}
            readOnly={selection.mode === 'month'}
            disabled={disabled}
            onInput={(event) => onChange({ ...selection, start: event.currentTarget.value })}
          />
        </div>
        <div>
          <label htmlFor="period-end">Ajanjakson loppu</label>
          <input
            id="period-end"
            name="period_end"
            type="date"
            required
            value={end}
            min={start || undefined}
            readOnly={selection.mode === 'month'}
            disabled={disabled}
            onInput={(event) => onChange({ ...selection, end: event.currentTarget.value })}
          />
        </div>
      </div>
      {selection.mode === 'custom' && (
        <p className="field-hint">
          Ilmoita tiedoston koko kattavuus, ei vain ensimmäistä ja viimeistä ostospäivää.
          Yhden kuukauden sisäinen jakso vertautuu edelliskuukauden samoihin päiviin,
          jos niiden aineisto on tallessa.
        </p>
      )}
      <p className="field-hint">
        Tuontijaksot eivät saa mennä päällekkäin. MVP ei yhdistä osajaksoja kokonaiseksi kuukaudeksi
        eikä korvaa aiempaa tuontia. Tiedoston täydellisyyttä ei voida varmistaa automaattisesti.
      </p>
    </>
  )
}
