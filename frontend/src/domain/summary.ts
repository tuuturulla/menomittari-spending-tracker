/** Calculates expense totals, category totals, and refunds from one saved period. */
import {
  CATEGORY_CODES,
  CATEGORY_NAMES,
  type CategoryCode,
  type TransactionKind,
} from './transactions'

export interface SummaryPeriod {
  id: string
  period_start: string
  period_end: string
}

export interface SummaryTransaction {
  amount_cents: number
  kind: TransactionKind
  category_code: CategoryCode
}

export interface CategorySummary {
  category_code: CategoryCode
  name: string
  expense_cents: number
}

export interface SpendingSummary {
  import_id: string
  period_start: string
  period_end: string
  expense_cents: number
  refund_cents: number
  categories: CategorySummary[]
}

export function calculateSummary(
  period: SummaryPeriod,
  transactions: readonly SummaryTransaction[],
): SpendingSummary {
  const categoryExpenses = new Map<CategoryCode, number>(
    CATEGORY_CODES.map((categoryCode) => [categoryCode, 0]),
  )
  let expenseCents = 0
  let refundCents = 0

  for (const transaction of transactions) {
    if (transaction.kind === 'expense') {
      // Stored expenses are negative; summaries present their magnitude as positive money.
      const expense = -transaction.amount_cents
      expenseCents += expense
      categoryExpenses.set(
        transaction.category_code,
        (categoryExpenses.get(transaction.category_code) ?? 0) + expense,
      )
    } else if (transaction.kind === 'refund') {
      refundCents += transaction.amount_cents
    }
  }

  const categories = CATEGORY_CODES.map((categoryCode) => ({
    category_code: categoryCode,
    name: CATEGORY_NAMES[categoryCode],
    expense_cents: categoryExpenses.get(categoryCode) ?? 0,
  })).sort(
    (left, right) =>
      right.expense_cents - left.expense_cents ||
      left.category_code.localeCompare(right.category_code),
  )

  return {
    import_id: period.id,
    period_start: period.period_start,
    period_end: period.period_end,
    expense_cents: expenseCents,
    refund_cents: refundCents,
    categories,
  }
}
