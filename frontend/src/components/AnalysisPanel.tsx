/** Show the selected period's comparison and factual insights without recalculating them. */
import type { Analysis, ChangeValues, ComparisonStatus } from '../domain/analysis'
import { changeLabel, formatCurrency, formatPeriod } from './format'
import { CategoryComparison } from './CategoryComparison'
import { InfoHint } from './InfoHint'
import { InsightCard } from './InsightCard'
import { calendarMonthPeriod } from '../domain/periods'
import type { DatePeriod } from '../domain/periods'

interface AnalysisPanelProps {
  analysis: Analysis
  showTotal?: boolean
}

const BLOCKED_MESSAGES: Record<Exclude<ComparisonStatus, 'comparable'>, string> = {
  no_baseline: 'Aiempaa jaksoa ei ole. Tuo vertailuvälin kattava aineisto vertailua varten.',
  different_duration: 'Jaksojen pituudet eroavat, joten niitä ei verrata.',
  gap: 'Jaksojen väliin jää päiviä, joten niitä ei verrata.',
  incomplete_baseline: 'Edelliskuukauden vertailuväli ei sisälly kokonaan yhteen tallennettuun tuontijaksoon. Puuttuvia päiviä ei tulkita nollamenoiksi.',
  unavailable_dates: 'Vastaavia päivämääriä ei ole edelliskuukaudessa. Osajaksoa ei lyhennetä automaattisesti.',
}

/** Present already-calculated changes, including a zero baseline, without new arithmetic. */
export function ChangeMetric({ values, baselinePeriod }: { values: ChangeValues; baselinePeriod: DatePeriod | null }) {
  const percentage = values.delta_percent === null ? null :
    new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(values.delta_percent))
  return <div className="comparison-total">
    <span className="metric-label">Menojen muutos</span>
    <strong className="metric-value change-value">{changeLabel(values)}</strong>
    {percentage !== null && <strong className="change-percent">
      {values.delta_cents === 0 ? 'Menot ennallaan' : `Menot ${values.delta_cents > 0 ? 'kasvoivat' : 'laskivat'}`} {percentage} %
    </strong>}
    <div className="change-baseline">
      <span className="metric-context">Vertailujakson menot{baselinePeriod && <span className="baseline-dates">{formatPeriod(baselinePeriod)}</span>}</span>
      <strong>{formatCurrency(values.previous_cents)}</strong>
    </div>
  </div>
}

export function AnalysisPanel({ analysis, showTotal = true }: AnalysisPanelProps) {
  const { comparison, insights } = analysis
  const month = calendarMonthPeriod(comparison.current_period.period_start.slice(0, 7))
  // Only declared calendar coverage identifies a partial month; purchase dates cannot.
  const partialMonth = comparison.mode === 'previous_month' && month !== null &&
    (month.period_start !== comparison.current_period.period_start || month.period_end !== comparison.current_period.period_end)

  return (
    <section className="analysis-section" aria-labelledby="comparison-title">
      <div className="comparison-heading">
      <h4 id="comparison-title">
        {comparison.mode === 'previous_month'
          ? 'Vertailu edelliskuukauden vastaavaan ajanjaksoon'
          : 'Vertailu aiempaan jaksoon'}
      </h4>
      <InfoHint label="Tietoa vertailun tulkinnasta">Vertailu perustuu ilmoitettujen jaksojen aineistoon. Maksujen ajoitus voi vaikuttaa muutokseen; pienempi menosumma ei yksin tarkoita säästöä.</InfoHint>
      </div>
      {comparison.baseline_period && (
        <p className="comparison-periods">
          {comparison.status === 'comparable' ? 'Aiempi' : 'Tarvittava vertailuväli'}{' '}
          {formatPeriod(comparison.baseline_period)} → valittu {formatPeriod(comparison.current_period)}
        </p>
      )}
      {partialMonth && comparison.status === 'comparable' && (
        <p className="partial-period-note">Osajakso: verrataan edelliskuukauden samoja päiviä.</p>
      )}

      {comparison.status !== 'comparable' ? (
        <p className="empty-state">{BLOCKED_MESSAGES[comparison.status]}</p>
      ) : (
        <>
          {showTotal && comparison.totals && <ChangeMetric values={comparison.totals} baselinePeriod={comparison.baseline_period} />}

          <div className="analysis-columns">
          <section aria-labelledby="category-comparison-title">
            <h5 id="category-comparison-title">Menoryhmien vertailu</h5>
            <CategoryComparison categories={comparison.categories} />
          </section>

          <section aria-labelledby="insights-title">
            <h5 id="insights-title">Keskeiset muutokset</h5>
            {insights.length === 0 ? (
              <p className="empty-state">Näillä säännöillä ei löytynyt havaintoja.</p>
            ) : (
              <ol className="insight-list">
                {insights.map((item) => (
                  <InsightCard key={item.code} insight={item} />
                ))}
              </ol>
            )}
          </section>
          </div>
        </>
      )}
    </section>
  )
}
