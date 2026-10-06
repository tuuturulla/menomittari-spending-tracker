import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TransactionPage } from '../application/transaction-history'
import { TransactionList } from './TransactionHistory'

describe('transaction list', () => {
  it('renders a transaction description as escaped text', () => {
    const page: TransactionPage = {
      items: [
        {
          id: 'transaction-1',
          import_id: 'import-1',
          date: '2026-04-05',
          description: '<script>alert("demo")</script>',
          amount_cents: -1_000,
          kind: 'expense',
          category_code: 'unknown',
        },
      ],
      total: 1,
      offset: 0,
      limit: 50,
    }

    const html = renderToStaticMarkup(<TransactionList page={page} />)

    expect(html).toContain('&lt;script&gt;alert(&quot;demo&quot;)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })
})
