/** Offers local backup downloads and safe, empty-history restoration with nearby feedback. */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { exportBackup, restoreBackup, type BackupStorage } from '../application/backup'

interface BackupPanelProps {
  storage: BackupStorage | null
  disabled: boolean
  onBusyChange: (busy: boolean) => void
  onRestored: () => void
}

/** A blob URL downloads directly from memory; it is not an upload to the backend. */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Give the browser time to start the download before releasing the temporary URL.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

export function BackupPanel({ storage, disabled, onBusyChange, onRestored }: BackupPanelProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const feedbackRef = useRef<HTMLDivElement>(null)
  const controlsDisabled = disabled || busy || !storage

  useEffect(() => {
    if (message || error) feedbackRef.current?.focus()
  }, [message, error])

  function begin() {
    setMessage('')
    setError('')
    setBusy(true)
    onBusyChange(true)
  }
  function finish() {
    setBusy(false)
    onBusyChange(false)
  }

  async function download() {
    if (!storage || controlsDisabled) return
    begin()
    try {
      const result = await exportBackup(storage)
      if (!result.ok) { setError(result.error.message); return }
      downloadFile(result.data.blob, result.data.filename)
      setMessage('Varmuuskopio annettiin selaimen ladattavaksi. Varmista, että tiedosto löytyy latauksistasi, ja säilytä se turvallisessa paikassa.')
    } catch {
      setError('Varmuuskopion lataamista ei voitu käynnistää. Historiaa ei muutettu.')
    } finally { finish() }
  }

  async function restore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!storage || controlsDisabled) return
    const form = event.currentTarget
    const file = new FormData(form).get('backup_file')
    begin()
    try {
      if (!(file instanceof File)) { setError('Valitse palautettava JSON-varmuuskopio.'); return }
      const result = await restoreBackup(file, storage)
      if (!result.ok) { setError(result.error.message); return }
      form.reset()
      onRestored()
      setMessage(`Palautus onnistui: ${result.data.import_count} tuontijaksoa ja ${result.data.transaction_count} tapahtumaa. Historia ja vertailut päivitettiin.`)
    } finally { finish() }
  }

  return (
    <section className="backup-card" aria-labelledby="backup-title">
      <h3 id="backup-title">Varmuuskopio</h3>
      <p id="backup-help">
        Taloushistoria säilyy vain tässä selaimessa. Selaimen sivustotietojen
        poistaminen tai laitteen rikkoutuminen voi hävittää sen. Lataa varmuuskopio
        säännöllisesti ja säilytä kopio myös laitteen ulkopuolella turvallisesti.
      </p>
      <p className="backup-warning">
        Kopio on salaamaton JSON-tiedosto: sen avaava henkilö voi lukea tapahtumat.
        Kopio ei sisällä käyttäjätiliä tai salasanaa eikä sitä lähetetä palvelimelle.
        Käytä kurssiversiossa vain fiktiivisiä tietoja.
      </p>
      <button type="button" onClick={download} disabled={controlsDisabled}>Lataa varmuuskopio</button>
      <form onSubmit={restore} aria-describedby="backup-help restore-help">
        <p id="restore-help">Palauta vain tyhjään historiaan. Nykyisiä tietoja ei yhdistetä, poisteta tai korvata.</p>
        <label htmlFor="backup-file">Palautettava varmuuskopio</label>
        <input id="backup-file" name="backup_file" type="file" accept=".json,application/json" required disabled={controlsDisabled} />
        <button type="submit" disabled={controlsDisabled}>{busy ? 'Käsitellään…' : 'Palauta varmuuskopio'}</button>
      </form>
      {(error || message) && (
        <div ref={feedbackRef} className={`import-feedback ${error ? 'import-error' : 'import-success'}`}
          role={error ? 'alert' : 'status'} tabIndex={-1}>
          {error ? <><strong>Varmuuskopion käsittely epäonnistui</strong><p>{error}</p></> : <p>{message}</p>}
        </div>
      )}
    </section>
  )
}
