export const TRANSACTION_KINDS = [
  'expense',
  'income',
  'refund',
  'transfer',
] as const

export const CATEGORY_CODES = [
  'groceries',
  'dining',
  'transport',
  'subscriptions',
  'unknown',
] as const

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]
export type CategoryCode = (typeof CATEGORY_CODES)[number]

export const CATEGORY_NAMES: Record<CategoryCode, string> = {
  groceries: 'Ruokakauppa',
  dining: 'Ravintolat',
  transport: 'Liikenne',
  subscriptions: 'Tilaukset',
  unknown: 'Tunnistamattomat',
}
