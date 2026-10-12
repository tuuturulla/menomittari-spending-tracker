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
  return {
    import_id: importId, date: importId === 'april' ? '2026-04-03' : '2026-05-03',
    amount_cents: -cents, kind: 'expense', category_code: 'groceries',
  }
}

describe('analysis panel', () => {
  it('keeps the long interpretation note in detail for complete months', () => {
    const completeMay = { ...may, period_end: '2026-05-31' }
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analyzePeriods(completeMay, [april, completeMay], [expense('april', 1000), expense('may', 1500)])} />)
    const visible = html.replace(/<span[^>]*role="tooltip"[\s\S]*?<\/span>/g, '')
    expect(html).toContain('Tietoa vertailun tulkinnasta')
    expect(visible).not.toContain('Vertailu perustuu')
    expect(visible).not.toContain('Osajakso:')
    expect(visible).not.toContain('Aiemmin')
    expect(visible).toContain('Kokonaismenot')
  })
  it('marks an actual partial month with a short visible notice', () => {
    const partialMay = { ...may, period_end: '2026-05-15' }
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analyzePeriods(partialMay, [april, partialMay], [expense('april', 1000), expense('may', 1500)])} />)
    expect(html).toContain('Osajakso: verrataan edelliskuukauden samoja päiviä.')
  })
  it('shows both periods and a readable blocked reason with one import', () => {
    const analysis = analyzePeriods(april, [april], [expense('april', 9_000)])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} />)

    expect(html).toContain('Aiempaa jaksoa ei ole')
    expect(html).not.toContain('Menojen muutos')
  })

  it('calls a zero-to-positive change new spending without an undefined percentage', () => {
    const analysis = analyzePeriods(may, [may, april], [expense('may', 1_500)])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} />)

    expect(html).toContain('1.4.2026–30.4.2026')
    expect(html).toContain('1.5.2026–30.5.2026')
    expect(html).toContain('15,00')
    expect(html).toContain('+15,00')
    expect(html).toContain('uusi meno')
    expect(html).not.toContain('Ei laskettavissa')
    expect(html).toContain('Kokonaismenot kasvoivat.')
    expect(html).toContain('Keskeiset muutokset')
  })

  it('calls an unchanged zero category no change and keeps defined percentages', () => {
    const analysis = analyzePeriods(may, [may, april], [
      expense('april', 1_000),
      expense('may', 1_500),
    ])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} />)

    expect(html).toContain('ei muutosta')
    expect(html).toContain('+50,00 %')
    expect(html).not.toContain('Ei laskettavissa')
  })

  it('shows the actual filtered baseline dates rather than the whole source import', () => {
    const partialMay = { ...may, period_end: '2026-05-15' }
    const analysis = analyzePeriods(partialMay, [april, partialMay], [expense('april', 1_000)])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} />)

    expect(html).toContain('Vertailu edelliskuukauden vastaavaan ajanjaksoon')
    expect(html).toContain('1.4.2026–15.4.2026')
    expect(html).toContain('1.5.2026–15.5.2026')
    expect(html).not.toContain('30.4.2026')
    expect(html).toContain('Maksujen ajoitus voi vaikuttaa muutokseen')
  })

  it('names the requested interval and explains incomplete coverage', () => {
    const partialApril = { ...april, period_start: '2026-04-02' }
    const partialMay = { ...may, period_end: '2026-05-15' }
    const analysis = analyzePeriods(partialMay, [partialMay, partialApril], [])
    const html = renderToStaticMarkup(<AnalysisPanel analysis={analysis} />)

    expect(html).toContain('Tarvittava vertailuväli')
    expect(html).toContain('1.4.2026–15.4.2026')
    expect(html).toContain('Puuttuvia päiviä ei tulkita nollamenoiksi')
    expect(html).not.toContain('Menojen muutos')
  })
})
