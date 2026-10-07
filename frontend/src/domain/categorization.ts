/** Maps known demo merchants to categories and leaves other names unknown. */
import type { CategoryCode, TransactionKind } from './transactions'

const MERCHANT_CATEGORIES = new Map<string, CategoryCode>([
  ['demo market', 'groceries'],
  ['demo cafe', 'dining'],
  ['demo bus', 'transport'],
  ['demo stream', 'subscriptions'],
])

function normalizeMerchant(description: string): string {
  return description.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('fi-FI')
}

export function categorizeTransaction(
  description: string,
  kind: TransactionKind,
): CategoryCode {
  // Income and transfers are intentionally excluded from expense categorization.
  if (kind === 'income' || kind === 'transfer') {
    return 'unknown'
  }

  // Full normalized names prevent short fragments from matching unrelated merchants.
  return MERCHANT_CATEGORIES.get(normalizeMerchant(description)) ?? 'unknown'
}
