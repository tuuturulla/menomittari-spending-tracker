import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { analyzePeriods, type AnalysisTransaction } from '../domain/analysis'
import type { ImportRecord } from '../storage/types'
import { AnalysisPanel } from './AnalysisPanel'

const april: ImportRecord = {
  id: 'april',
  period_start: '2026-04-01',
  period_end: '2026-04-30',
  created_at: '2026-05-01T00:00:00.000Z',
}
const may: ImportRecord = {
  id: 'may',
  period_start: '2026-05-01',
  period_end: '2026-05-30',
  created_at: '2026-05-31T00:00:00.000Z',
}

function expense(importId: string, cents: number): AnalysisTransaction {
  return { import_id: importId, amount_cents: -cents, kind: 'expense', category_code: 'groceries' }
}

describe('analysis panel', () => {
  it('shows both periods and a readable blocked reason with one import', () => {
    const analysis = analyzePeriods(april, [april], [expense('april', 9_000)])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} periods={[april]} />)

    expect(html).toContain('Aiempaa jaksoa ei ole')
    expect(html).not.toContain('Menojen muutos')
  })

  it('calls a zero-to-positive change new spending without an undefined percentage', () => {
    const analysis = analyzePeriods(may, [may, april], [expense('may', 1_500)])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} periods={[may, april]} />)

    expect(html).toContain('1.4.2026–30.4.2026')
    expect(html).toContain('1.5.2026–30.5.2026')
    expect(html).toContain('15,00')
    expect(html).toContain('+15,00')
    expect(html).toContain('uusi meno')
    expect(html).not.toContain('Ei laskettavissa')
    expect(html).toContain('Kokonaismenot kasvoivat.')
  })

  it('calls an unchanged zero category no change and keeps defined percentages', () => {
    const analysis = analyzePeriods(may, [may, april], [
      expense('april', 1_000),
      expense('may', 1_500),
    ])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} periods={[may, april]} />)

    expect(html).toContain('ei muutosta')
    expect(html).toContain('+50,00 %')
    expect(html).not.toContain('Ei laskettavissa')
  })
})
