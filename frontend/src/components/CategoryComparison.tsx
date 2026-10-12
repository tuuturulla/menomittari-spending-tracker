/** Two money series share one scale; the change has its own labelled reading column. */
import type { CategoryChange } from '../domain/analysis'
import { changeLabel, formatCurrency, formatPercent } from './format'

export function CategoryComparison({ categories }: { categories: CategoryChange[] }) {
  // A common maximum lets users compare groups, not just the two bars in one row.
  const maximum = Math.max(1, ...categories.flatMap((item) => [item.previous_cents, item.current_cents]))
  return <ul className="comparison-categories">
    {[...categories].sort((a, b) => b.current_cents - a.current_cents || a.category_code.localeCompare(b.category_code)).map((category) => <li key={category.category_code}>
      <strong className="comparison-name">{category.name}</strong>
      <div className="comparison-bars">
        {([['Aiempi', category.previous_cents, 'previous'], ['Valittu', category.current_cents, 'current']] as const).map(([label, cents, series]) => (
          <div className="comparison-bar-row" key={series}>
            <span className="bar-label">{label}</span>
            <span className="bar-track" aria-hidden="true"><span className={`bar-fill ${series}`} style={{ width: `${100 * cents / maximum}%` }} /></span>
            <span className="bar-value">{formatCurrency(cents)}</span>
          </div>
        ))}
      </div>
      <div className="category-change"><span className="metric-label">Muutos</span>
        <strong>{changeLabel(category)}</strong>
        {category.delta_percent !== null && category.delta_cents !== 0 && <span>{formatPercent(category.delta_percent)}</span>}
      </div>
    </li>)}
  </ul>
}
