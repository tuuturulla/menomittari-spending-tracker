import './App.css'

// P0-01 provides only the visible application shell; later tasks add data and interactions.
function App() {
  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">Kurssiprojekti</p>
        <h1 id="app-title">Menomittari</h1>
        <p className="lead">
          Selainsovellus oman rahankäytön tarkasteluun ja kahden ajanjakson
          vertailuun. Tadaa!
        </p>

        <div className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>Sovelluksen runko toimii</h2>
            <p>
              Tietojen tuonti ja paikallinen tallennus lisätään seuraavissa
              työvaiheissa.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
