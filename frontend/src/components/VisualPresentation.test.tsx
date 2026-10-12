import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApplicationNav } from './ApplicationNav'
import { CategoryComparison } from './CategoryComparison'
import { InfoHint } from './InfoHint'
import { InsightCard } from './InsightCard'
import { ChangeMetric } from './AnalysisPanel'
import type { Insight } from '../domain/analysis'
import { SummaryPanel } from './TransactionHistory'
import { calculateSummary } from '../domain/summary'
import { changeLabel } from './format'

describe('P0-09 presentation', () => {
  it('names the percentage direction and the actual baseline window beside its total', () => {
    const html = renderToStaticMarkup(<ChangeMetric values={{ previous_cents: 14500, current_cents: 12500, delta_cents: -2000, delta_percent: -13.79 }} baselinePeriod={{period_start: '2026-05-01', period_end: '2026-05-31'}} />)
    expect(html).toContain('Menot laskivat')
    expect(html).toContain('13,79 %')
    expect(html).toContain('Vertailujakson menot')
    expect(html).toContain('1.5.2026–31.5.2026')
    expect(html).toContain('145,00')
  })
  it('omits an empty refund line without changing the spending calculation', () => {
    const summary = calculateSummary({ id: 'demo', period_start: '2026-05-01', period_end: '2026-05-31' }, [])
    const html = renderToStaticMarkup(<SummaryPanel view={{ summary, transactions: { items: [], total: 0, offset: 0, limit: 50 } }} />)
    expect(summary.refund_cents).toBe(0)
    expect(html).not.toContain('Palautukset erikseen')
    expect(html).not.toContain('Tietoa palautusten laskennasta')
  })
  it.each([
    ['total_change', -500, null, 'Kokonaismenot pienenivät'],
    ['total_change', 500, null, 'Kokonaismenot kasvoivat'],
    ['largest_category_increase', 500, 'groceries', 'Ruokakauppa: menot kasvoivat'],
    ['new_category_spend', 500, 'subscriptions', 'Uusi meno: Tilaukset'],
  ] as const)('keeps %s informative without opening its detail', (code, delta, category, title) => {
    const insight: Insight = {
      code, category_code: category, delta_cents: delta,
      previous_cents: code === 'new_category_spend' ? 0 : 1000,
      current_cents: code === 'new_category_spend' ? 500 : 1000 + delta,
      delta_percent: code === 'new_category_spend' ? null : delta / 10,
      current_import_id: 'current', baseline_import_id: 'baseline', message: 'Tarkempi selitys.',
    }
    const html = renderToStaticMarkup(<InsightCard insight={insight} />)
    const visible = html.replace(/<span[^>]*role="tooltip"[\s\S]*?<\/span>/g, '')
    expect(visible).toContain(`<strong>${title}</strong>`)
    expect(visible).not.toContain('Tarkempi selitys')
    expect(html).toContain('Tarkempi selitys')
  })
  it('names all sections and marks only the chosen one', () => {
    const html = renderToStaticMarkup(<ApplicationNav selected="transactions" disabled={false} onSelect={() => {}} />)
    for (const label of ['Yhteenveto', 'Tapahtumat', 'Tuo CSV', 'Varmuuskopio']) expect(html).toContain(label)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toContain('aria-current="page">Tapahtumat')
  })
  it('locks navigation while a local operation is running', () => {
    const html = renderToStaticMarkup(<ApplicationNav selected="overview" disabled onSelect={() => {}} />)
    expect(html.match(/disabled=""/g)).toHaveLength(4)
  })
  it.each([[0, 0, 'ei muutosta'], [0, 1500, 'uusi meno'], [1000, 1500, 'enemmän'], [1500, 1000, 'vähemmän'], [1500, 1500, 'ei muutosta']])(
    'describes %s to %s with words', (previous, current, expected) => {
      expect(changeLabel({ previous_cents: Number(previous), current_cents: Number(current), delta_cents: Number(current) - Number(previous) })).toContain(String(expected))
    },
  )
  it('uses a common bar scale and a separate change column without mutating data', () => {
    const categories = [
      { category_code: 'dining' as const, name: 'Ravintolat', previous_cents: 0, current_cents: 1500, delta_cents: 1500, delta_percent: null },
      { category_code: 'groceries' as const, name: 'Ruokakauppa', previous_cents: 6000, current_cents: 9000, delta_cents: 3000, delta_percent: 50 },
    ]
    const before = structuredClone(categories)
    const html = renderToStaticMarkup(<CategoryComparison categories={categories} />)
    expect(html).toContain('width:100%')
    expect(html).toContain('width:66.66666666666667%')
    expect(html).toContain('class="category-change"')
    expect(html).toContain('Muutos')
    expect(html).toContain('enemmän')
    expect(html).toContain('uusi meno')
    expect(categories).toEqual(before)
  })
  it('shows zero bars without NaN or an undefined percentage', () => {
    const html = renderToStaticMarkup(<CategoryComparison categories={[{ category_code: 'unknown', name: 'Tunnistamattomat', previous_cents: 0, current_cents: 0, delta_cents: 0, delta_percent: null }]} />)
    expect(html).toContain('ei muutosta')
    expect(html).not.toMatch(/NaN|Infinity|Ei laskettavissa/)
  })
  it('retains the refund total and an accessible explanatory control', () => {
    const summary = calculateSummary({ id: 'demo', period_start: '2026-05-01', period_end: '2026-05-31' }, [
      { kind: 'expense', amount_cents: -10000, category_code: 'groceries' },
      { kind: 'refund', amount_cents: 2000, category_code: 'groceries' },
    ])
    const html = renderToStaticMarkup(<SummaryPanel view={{ summary, transactions: { items: [], total: 2, offset: 0, limit: 50 } }} />)
    expect(summary.expense_cents).toBe(10000)
    expect(summary.refund_cents).toBe(2000)
    expect(html).toContain('Palautukset erikseen')
    expect(html).toContain('Tietoa palautusten laskennasta')
    expect(html).toContain('Palautuksia ei vähennetä menoista')
  })
  it('starts the tooltip closed and connects it to a real button', () => {
    const html = renderToStaticMarkup(<InfoHint label="Lisätieto">Selitys</InfoHint>)
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-describedby=')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('hidden=""')
  })
})
