/** Show the selected period's comparison and factual insights without recalculating them. */
import type { Analysis, ChangeValues, ComparisonStatus } from '../domain/analysis'
import { formatCurrency, formatPercent, formatPeriod, formatSignedCurrency } from './format'

interface AnalysisPanelProps {
  analysis: Analysis
}

const BLOCKED_MESSAGES: Record<Exclude<ComparisonStatus, 'comparable'>, string> = {
  no_baseline: 'Aiempaa jaksoa ei ole. Tuo vertailuvälin kattava aineisto vertailua varten.',
  different_duration: 'Jaksojen pituudet eroavat, joten niitä ei verrata.',
  gap: 'Jaksojen väliin jää päiviä, joten niitä ei verrata.',
  incomplete_baseline: 'Edelliskuukauden vertailuväli ei sisälly kokonaan yhteen tallennettuun tuontijaksoon. Puuttuvia päiviä ei tulkita nollamenoiksi.',
  unavailable_dates: 'Vastaavia päivämääriä ei ole edelliskuukaudessa. Osajaksoa ei lyhennetä automaattisesti.',
}

function ChangeLine({ values }: { values: ChangeValues }) {
  // A zero baseline has no percentage; describe the visible change instead.
  if (values.previous_cents === 0) {
    return (
      <span>
        Aiemmin {formatCurrency(0)} → nyt {formatCurrency(values.current_cents)} ·{' '}
        {values.current_cents === 0
          ? 'ei muutosta'
          : `muutos ${formatSignedCurrency(values.delta_cents)} (uusi meno)`}
      </span>
    )
  }

  return (
    <span>
      Aiemmin {formatCurrency(values.previous_cents)} → nyt{' '}
      {formatCurrency(values.current_cents)} · muutos{' '}
      {formatSignedCurrency(values.delta_cents)} ({formatPercent(values.delta_percent)})
    </span>
  )
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const { comparison, insights } = analysis

  return (
    <section className="analysis-section" aria-labelledby="comparison-title">
      <h4 id="comparison-title">
        {comparison.mode === 'previous_month'
          ? 'Vertailu edelliskuukauden vastaavaan ajanjaksoon'
          : 'Vertailu aiempaan jaksoon'}
      </h4>
      {comparison.baseline_period && (
        <p className="comparison-periods">
          {comparison.status === 'comparable' ? 'Aiempi' : 'Tarvittava vertailuväli'}{' '}
          {formatPeriod(comparison.baseline_period)} → valittu {formatPeriod(comparison.current_period)}
        </p>
      )}
      <p className="field-hint">
        Vertailu perustuu ilmoitettujen jaksojen aineistoon. Maksujen ajoitus voi vaikuttaa muutokseen;
        pienempi menosumma ei yksin tarkoita säästöä.
      </p>

      {comparison.status !== 'comparable' ? (
        <p className="empty-state">{BLOCKED_MESSAGES[comparison.status]}</p>
      ) : (
        <>
          {comparison.totals && (
            <div className="comparison-total">
              <strong>Menojen muutos</strong>
              <ChangeLine values={comparison.totals} />
            </div>
          )}

          <section aria-labelledby="category-comparison-title">
            <h5 id="category-comparison-title">Menoryhmien vertailu</h5>
            <ul className="comparison-categories">
              {comparison.categories.map((category) => (
                <li key={category.category_code}>
                  <strong>{category.name}</strong>
                  <ChangeLine values={category} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="insights-title">
            <h5 id="insights-title">Havainnot</h5>
            {insights.length === 0 ? (
              <p className="empty-state">Näillä säännöillä ei löytynyt havaintoja.</p>
            ) : (
              <ol className="insight-list">
                {insights.map((item) => (
                  <li key={item.code}>
                    <strong>{item.message}</strong>
                    <p><ChangeLine values={item} /></p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  )
}
