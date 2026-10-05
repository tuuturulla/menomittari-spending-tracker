import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { importCsv } from './application/import-csv'
import {
  AuthApiError,
  getCurrentUser,
  login,
  logout,
  register,
  type PublicUser,
} from './auth-api'
import {
  createLocalStorage,
  type LocalStorageRepository,
} from './storage/repository'

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [user, setUser] = useState<PublicUser | null>(null)
  const [openedStorage, setOpenedStorage] = useState<{
    owner: PublicUser
    repository: LocalStorageRepository
  } | null>(null)
  const [busy, setBusy] = useState(true)
  const [importBusy, setImportBusy] = useState(false)
  const [message, setMessage] = useState('Tarkistetaan kirjautumistila…')
  const [error, setError] = useState('')
  const currentStorage = openedStorage?.owner === user ? openedStorage.repository : null

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        setMessage(currentUser ? 'Olet kirjautunut sisään.' : '')
      })
      .catch(() => setError('Kirjautumistilaa ei voitu tarkistaa.'))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true
    // The backend user UUID selects a separate local database for this signed-in account.
    const storage = createLocalStorage(user.id)
    storage
      .open()
      .then(() => {
        if (active) {
          setOpenedStorage({ owner: user, repository: storage })
        }
      })
      .catch(() => {
        if (active) {
          setError('Paikallista taloushistoriaa ei voitu avata tässä selaimessa.')
        }
      })

    // Closing releases this tab's connection but deliberately keeps the user's data.
    return () => {
      active = false
      storage.close()
    }
  }, [user])

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'register') {
        await register(email, password)
        form.reset()
        setMode('login')
        setMessage('Käyttäjätili luotiin. Voit nyt kirjautua sisään.')
      } else {
        const authenticatedUser = await login(email, password)
        setUser(authenticatedUser)
        form.reset()
        setMessage('Kirjautuminen onnistui.')
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof AuthApiError
          ? caughtError.message
          : 'Yhteys palvelimeen epäonnistui.',
      )
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    setBusy(true)
    setError('')
    try {
      await logout()
      setUser(null)
      setMessage('Olet kirjautunut ulos.')
    } catch (caughtError) {
      setError(
        caughtError instanceof AuthApiError
          ? caughtError.message
          : 'Uloskirjautuminen epäonnistui.',
      )
    } finally {
      setBusy(false)
    }
  }

  const submitImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const storage = currentStorage
    if (!storage) {
      setError('Paikallinen tallennus ei ole vielä valmis.')
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get('csv_file')
    if (!(file instanceof File) || file.size === 0) {
      setError('Valitse tuotava CSV-tiedosto.')
      return
    }

    setImportBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await importCsv(
        file,
        String(formData.get('period_start') ?? ''),
        String(formData.get('period_end') ?? ''),
        storage,
      )
      if (!result.ok) {
        const rowPrefix = result.error.row ? `Tietue ${result.error.row}: ` : ''
        setError(`${rowPrefix}${result.error.message}`)
        return
      }

      form.reset()
      setMessage(
        `Tuonti onnistui: ${result.data.transaction_count} tapahtumaa tallennettiin selaimeen.`,
      )
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">Kurssiprojekti</p>
        <h1 id="app-title">Menomittari</h1>
        <p className="lead">
          Selainsovellus oman rahankäytön tarkasteluun ja kahden ajanjakson
          vertailuun. Taloustiedot pysyvät tässä selaimessa.
        </p>

        <section className="auth-card" aria-labelledby="auth-title">
          {user ? (
            <div className="account-panel">
              <p className="eyebrow">Kirjautunut käyttäjä</p>
              <h2 id="auth-title">{user.email}</h2>
              <p className="account-summary">
                Istunto on backendissä, mutta tulevat taloustiedot tallennetaan
                vain tähän selaimeen.
              </p>

              <section className="import-card" aria-labelledby="import-title">
                <h3 id="import-title">Tuo tapahtumat</h3>
                <p id="import-help">
                  Valitse Menomittarin demo-CSV tai tuettu S-Pankin
                  tilitapahtuma-CSV ja ilmoita koko tiedoston kattama ajanjakso.
                  Tiedosto käsitellään vain tässä selaimessa.
                </p>
                <form onSubmit={submitImport} aria-describedby="import-help">
                  <label htmlFor="csv-file">CSV-tiedosto</label>
                  <input
                    id="csv-file"
                    name="csv_file"
                    type="file"
                    accept=".csv,text/csv"
                    required
                    disabled={importBusy}
                  />

                  <div className="date-fields">
                    <div>
                      <label htmlFor="period-start">Ajanjakson alku</label>
                      <input
                        id="period-start"
                        name="period_start"
                        type="date"
                        required
                        disabled={importBusy}
                      />
                    </div>
                    <div>
                      <label htmlFor="period-end">Ajanjakson loppu</label>
                      <input
                        id="period-end"
                        name="period_end"
                        type="date"
                        required
                        disabled={importBusy}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={!currentStorage || importBusy}>
                    {importBusy ? 'Tuodaan…' : 'Tuo tapahtumat'}
                  </button>
                </form>
              </section>

              <button
                className="secondary-button"
                type="button"
                onClick={signOut}
                disabled={busy || importBusy}
              >
                Kirjaudu ulos
              </button>
            </div>
          ) : (
            <>
              <div className="auth-tabs" aria-label="Käyttäjätilin toiminto">
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  aria-pressed={mode === 'login'}
                  onClick={() => setMode('login')}
                  disabled={busy}
                >
                  Kirjaudu
                </button>
                <button
                  type="button"
                  className={mode === 'register' ? 'active' : ''}
                  aria-pressed={mode === 'register'}
                  onClick={() => setMode('register')}
                  disabled={busy}
                >
                  Luo käyttäjätili
                </button>
              </div>

              <h2 id="auth-title">
                {mode === 'login' ? 'Kirjaudu Menomittariin' : 'Luo käyttäjätili'}
              </h2>
              <form onSubmit={submitCredentials}>
                <label htmlFor="email">Sähköposti</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={busy}
                />

                <label htmlFor="password">Salasana</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={busy}
                />
                {mode === 'register' && (
                  <p className="field-hint">Käytä vähintään 12 merkkiä.</p>
                )}

                <button type="submit" disabled={busy}>
                  {busy
                    ? 'Odota…'
                    : mode === 'login'
                      ? 'Kirjaudu sisään'
                      : 'Luo tili'}
                </button>
              </form>
            </>
          )}

          <div className="feedback" aria-live="polite">
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
