/** Lead with the finding; keep its exact comparison and scope in accessible detail. */
import type { Insight } from '../domain/analysis'
import { CATEGORY_NAMES } from '../domain/transactions'
import { changeLabel, formatCurrency, formatPercent, formatSignedCurrency } from './format'
import { InfoHint } from './InfoHint'

export function InsightCard({ insight }: { insight: Insight }) {
  const name = insight.category_code === 'unknown' ? 'Tunnistamattomat' :
    insight.category_code ? CATEGORY_NAMES[insight.category_code] : ''
  // The visible finding should explain the direction, not just name the metric.
  const title = insight.code === 'total_change' ?
    (insight.delta_cents > 0 ? 'Kokonaismenot kasvoivat' : 'Kokonaismenot pienenivät') :
    insight.code === 'new_category_spend' ? `Uusi meno: ${name}` : `${name}: menot kasvoivat`
  const detail = `${insight.message} Aiemmin ${formatCurrency(insight.previous_cents)}, ` +
    `nyt ${formatCurrency(insight.current_cents)}. Muutos ${formatSignedCurrency(insight.delta_cents)}` +
    (insight.delta_percent === null ? '. Prosenttimuutosta ei lasketa nollasta.' : ` (${formatPercent(insight.delta_percent)}).`) +
    (insight.code === 'new_category_spend' ? ' Uusi meno tarkoittaa uutta tällä vertailuvälillä, ei koko historiassa. Maksujen toistuvuutta ei tunnisteta.' : '')

  return <li>
    <div className="insight-heading"><strong>{title}</strong>
      <InfoHint label={`Lisätietoa: ${title}`}>{detail}</InfoHint>
    </div>
    <p className="insight-result">
      <strong>{insight.code === 'new_category_spend' ? formatCurrency(insight.current_cents) : changeLabel(insight)}</strong>
      {insight.delta_percent !== null && <span>{formatPercent(insight.delta_percent)}</span>}
    </p>
  </li>
}
