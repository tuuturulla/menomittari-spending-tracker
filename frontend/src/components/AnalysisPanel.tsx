/** Show the selected period's comparison and factual insights without recalculating them. */
import type { Analysis, ChangeValues, ComparisonStatus } from '../domain/analysis'
import type { ImportRecord } from '../storage/types'
import { formatCurrency, formatPercent, formatPeriod, formatSignedCurrency } from './format'

interface AnalysisPanelProps {
  analysis: Analysis
  periods: readonly ImportRecord[]
}

const BLOCKED_MESSAGES: Record<Exclude<ComparisonStatus, 'comparable'>, string> = {
  no_baseline: 'Aiempaa jaksoa ei ole. Tuo toinen peräkkäinen jakso vertailua varten.',
  different_duration: 'Jaksojen pituudet eroavat, joten niitä ei verrata.',
  gap: 'Jaksojen väliin jää päiviä, joten niitä ei verrata.',
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

export function AnalysisPanel({ analysis, periods }: AnalysisPanelProps) {
  const { comparison, insights } = analysis
  const baseline = periods.find((period) => period.id === comparison.baseline_import_id)

  return (
    <section className="analysis-section" aria-labelledby="comparison-title">
      <h4 id="comparison-title">Vertailu aiempaan jaksoon</h4>
      {baseline && (
        <p className="comparison-periods">
          Aiempi {formatPeriod(baseline)} → valittu {formatPeriod(analysis.summary)}
        </p>
      )}

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
