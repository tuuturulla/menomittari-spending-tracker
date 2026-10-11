import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ImportPeriodFields, type ImportPeriodSelection } from './ImportPeriodFields'

const EMPTY_IMPORT_PERIOD: ImportPeriodSelection = {
  mode: 'month', month: '', start: '', end: '',
}

describe('import period fields', () => {
  it('shows correct read-only boundaries for a selected calendar month', () => {
    const html = renderToStaticMarkup(<ImportPeriodFields
      selection={{ ...EMPTY_IMPORT_PERIOD, month: '2026-05' }}
      onChange={vi.fn()} disabled={false}
    />)
    expect(html).toContain('Kokonainen kuukausi')
    expect(html).toContain('type="month"')
    expect(html).toContain('value="2026-05-01"')
    expect(html).toContain('value="2026-05-31"')
    expect(html.match(/readOnly=""/g)).toHaveLength(2)
    expect(html).toContain('name="period_start"')
    expect(html).toContain('name="period_end"')
    expect(html).toContain('kaikki tilitapahtumat')
  })

  it('keeps custom dates editable and explains coverage and overlap limitations', () => {
    const html = renderToStaticMarkup(<ImportPeriodFields
      selection={{ ...EMPTY_IMPORT_PERIOD, mode: 'custom', start: '2026-05-01', end: '2026-05-15' }}
      onChange={vi.fn()} disabled={false}
    />)
    expect(html).not.toContain('type="month"')
    expect(html).not.toContain('readOnly')
    expect(html).toContain('value="2026-05-15"')
    expect(html).toContain('edelliskuukauden samoihin päiviin')
    expect(html).toContain('MVP ei yhdistä osajaksoja')
  })
})
