import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BackupPanel } from './BackupPanel'

describe('backup controls', () => {
  it('explains local data loss, unencrypted files and the empty-history restriction', () => {
    const html = renderToStaticMarkup(<BackupPanel storage={null} disabled={false} onBusyChange={() => {}} onRestored={() => {}} />)
    expect(html).toContain('Lataa varmuuskopio')
    expect(html).toContain('Palauta varmuuskopio')
    expect(html).toContain('salaamaton JSON-tiedosto')
    expect(html).toContain('Selaimen sivustotietojen')
    expect(html).toContain('Palauta vain tyhjään historiaan')
    expect(html).toContain('disabled=""')
  })
  it('disables all operations during another local operation', () => {
    const storage = { readAnalysisSnapshot: async () => ({ imports: [], transactions: [] }), restoreEmptyHistory: async () => {} }
    const html = renderToStaticMarkup(<BackupPanel storage={storage} disabled onBusyChange={() => {}} onRestored={() => {}} />)
    expect(html.match(/disabled=""/g)).toHaveLength(3)
  })
})
