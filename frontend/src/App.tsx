/** Connects account access, local CSV imports, and transaction history on one page. */
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
import { TransactionHistory } from './components/TransactionHistory'
import { CsvImportForm } from './components/CsvImportForm'
import { type ImportPeriodSelection } from './components/ImportPeriodFields'
import {
  createLocalStorage,
  type LocalStorageRepository,
} from './storage/repository'

const EMPTY_IMPORT_PERIOD: ImportPeriodSelection = {
  mode: 'month', month: '', start: '', end: '',
}

function App() {
  // React state holds what the page currently shows; the databases own persistent data.
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [user, setUser] = useState<PublicUser | null>(null)
  const [openedStorage, setOpenedStorage] = useState<{
    owner: PublicUser
    repository: LocalStorageRepository
  } | null>(null)
  const [busy, setBusy] = useState(true)
  const [importBusy, setImportBusy] = useState(false)
  const [importPeriod, setImportPeriod] = useState(EMPTY_IMPORT_PERIOD)
  const [historyRevision, setHistoryRevision] = useState(0)
  const [message, setMessage] = useState('Tarkistetaan kirjautumistila…')
  const [error, setError] = useState('')
  // Import feedback belongs to its form, not to the account controls below the history.
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  // Never show a previous account's local database while a different user is active.
  const currentStorage = openedStorage?.owner === user ? openedStorage.repository : null

  // On page load, ask the backend whether the browser already has a valid session.
  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        setMessage(currentUser ? 'Olet kirjautunut sisään.' : '')
      })
      .catch(() => setError('Kirjautumistilaa ei voitu tarkistaa.'))
      .finally(() => setBusy(false))
  }, [])

  // A signed-in user opens their own IndexedDB database; cleanup closes the connection.
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
    // FormData reads the named HTML inputs; login then updates `user` above.
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
      setImportMessage('')
      setImportError('')
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
    setImportError('')
    setImportMessage('')
    const storage = currentStorage
    if (!storage) {
      setImportError('Paikallinen tallennus ei ole vielä valmis.')
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get('csv_file')
    if (!(file instanceof File) || file.size === 0) {
      setImportError('Valitse tuotava CSV-tiedosto.')
      return
    }

    setImportBusy(true)
    try {
      const result = await importCsv(
        file,
        String(formData.get('period_start') ?? ''),
        String(formData.get('period_end') ?? ''),
        storage,
      )
      if (!result.ok) {
        const rowPrefix = result.error.row ? `Tietue ${result.error.row}: ` : ''
        setImportError(`${rowPrefix}${result.error.message}`)
        return
      }

      form.reset()
      setImportPeriod(EMPTY_IMPORT_PERIOD)
      // The import changed IndexedDB, so the history component must reload its list.
      setHistoryRevision((current) => current + 1)
      setImportMessage(
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
                Istunto on backendissä, mutta taloustiedot tallennetaan
                vain tähän selaimeen.
              </p>

              <CsvImportForm
                busy={importBusy}
                storageReady={Boolean(currentStorage)}
                selection={importPeriod}
                onSelectionChange={setImportPeriod}
                onSubmit={submitImport}
                message={importMessage}
                error={importError}
              />

              {currentStorage && (
                <TransactionHistory
                  storage={currentStorage}
                  refreshKey={historyRevision}
                />
              )}

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
