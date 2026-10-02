import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import {
  AuthApiError,
  getCurrentUser,
  login,
  logout,
  register,
  type PublicUser,
} from './auth-api'

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [user, setUser] = useState<PublicUser | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('Tarkistetaan kirjautumistila…')
  const [error, setError] = useState('')

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        setMessage(currentUser ? 'Olet kirjautunut sisään.' : '')
      })
      .catch(() => setError('Kirjautumistilaa ei voitu tarkistaa.'))
      .finally(() => setBusy(false))
  }, [])

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
              <p>
                Istunto on backendissä, mutta tulevat taloustiedot tallennetaan
                vain tähän selaimeen.
              </p>
              <button type="button" onClick={signOut} disabled={busy}>
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
