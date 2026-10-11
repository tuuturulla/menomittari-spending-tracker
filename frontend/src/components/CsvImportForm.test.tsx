import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CsvImportForm } from './CsvImportForm'

function renderForm(error = '', message = '') {
  return renderToStaticMarkup(
    <CsvImportForm
      busy={false}
      storageReady
      selection={{ mode: 'month', month: '2026-07', start: '', end: '' }}
      onSelectionChange={() => {}}
      onSubmit={() => {}}
      error={error}
      message={message}
    />,
  )
}

describe('CSV import feedback', () => {
  it('places an overlap alert immediately after the import button, inside the form', () => {
    const error = 'Valittu 2026-07-01–2026-07-31 menee päällekkäin jakson 2026-07-01–2026-07-15 kanssa.'
    const html = renderForm(error)

    expect(html).toContain('</button><div class="import-feedback import-error" role="alert" tabindex="-1">')
    expect(html).toContain(`<strong>Tuonti estettiin</strong><p>${error}</p></div></form>`)
  })

  it('shows success next to the same action without an error heading', () => {
    const message = 'Tuonti onnistui: 6 tapahtumaa tallennettiin selaimeen.'
    const html = renderForm('', message)

    expect(html).toContain('</button><div class="import-feedback import-success" role="status" tabindex="-1">')
    expect(html).toContain(`<p>${message}</p></div></form>`)
    expect(html).not.toContain('Tuonti estettiin')
  })

  it('does not show stale success together with an error', () => {
    const html = renderForm('Tiedosto on virheellinen.', 'Tuonti onnistui.')

    expect(html).toContain('Tiedosto on virheellinen.')
    expect(html).not.toContain('Tuonti onnistui.')
  })

  it('has no result box before an import has been attempted', () => {
    const html = renderForm()

    expect(html).not.toContain('import-feedback')
    expect(html).not.toContain('role="alert"')
  })
})
