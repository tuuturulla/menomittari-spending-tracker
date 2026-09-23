import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

// This smoke test proves that the React test pipeline can render the application shell.
describe('App', () => {
  it('näyttää sovelluksen nimen ja rungon tilan', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Menomittari')
    expect(html).toContain('Sovelluksen runko toimii')
  })
})
