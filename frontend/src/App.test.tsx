import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

// This smoke test verifies the initial account view without making network requests.
describe('App', () => {
  it('näyttää sovelluksen nimen ja käyttäjätilin toiminnot', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Menomittari')
    expect(html).toContain('Kirjaudu Menomittariin')
    expect(html).toContain('Luo käyttäjätili')
    expect(html).toContain('type="password"')
  })
})
