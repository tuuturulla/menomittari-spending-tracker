/** Compare consecutive spending periods and form a small set of factual insights. */
import {
  calculateSummary,
  type SpendingSummary,
  type SummaryPeriod,
  type SummaryTransaction,
} from './summary'
import { CATEGORY_CODES, CATEGORY_NAMES, type CategoryCode } from './transactions'

export interface AnalysisTransaction extends SummaryTransaction {
  import_id: string
}

export interface ChangeValues {
  previous_cents: number
  current_cents: number
  delta_cents: number
  delta_percent: number | null
}

export interface CategoryChange extends ChangeValues {
  category_code: CategoryCode
  name: string
}

export type ComparisonStatus =
  | 'comparable'
  | 'no_baseline'
  | 'different_duration'
  | 'gap'

export interface Comparison {
  status: ComparisonStatus
  current_import_id: string
  baseline_import_id: string | null
  totals: ChangeValues | null
  categories: CategoryChange[]
}

export type InsightCode =
  | 'total_change'
  | 'largest_category_increase'
  | 'new_category_spend'

export interface Insight extends ChangeValues {
  code: InsightCode
  current_import_id: string
  baseline_import_id: string
  category_code: CategoryCode | null
  message: string
}

export interface Analysis {
  summary: SpendingSummary
  comparison: Comparison
  insights: Insight[]
}

const DAY_MS = 24 * 60 * 60 * 1_000

function utcDay(isoDate: string): number {
  // UTC calendar days avoid local daylight-saving changes in period lengths.
  return Date.parse(`${isoDate}T00:00:00.000Z`) / DAY_MS
}

function periodDays(period: SummaryPeriod): number {
  return utcDay(period.period_end) - utcDay(period.period_start) + 1
}

function change(previousCents: number, currentCents: number): ChangeValues {
  const deltaCents = currentCents - previousCents
  // Zero has no percentage denominator. Round magnitudes before restoring the sign.
  const deltaPercent = previousCents === 0
    ? null
    : Math.sign(deltaCents) *
      Math.round((Math.abs(deltaCents) * 10_000) / previousCents) / 100
  return {
    previous_cents: previousCents,
    current_cents: currentCents,
    delta_cents: deltaCents,
    delta_percent: deltaPercent,
  }
}

function blockedComparison(
  status: Exclude<ComparisonStatus, 'comparable'>,
  currentId: string,
  baselineId: string | null,
): Comparison {
  return {
    status,
    current_import_id: currentId,
    baseline_import_id: baselineId,
    totals: null,
    categories: [],
  }
}

function categoryName(code: CategoryCode): string {
  return code === 'unknown' ? 'Tunnistamattomat menot' : CATEGORY_NAMES[code]
}

function insight(
  code: InsightCode,
  currentId: string,
  baselineId: string,
  values: ChangeValues,
  categoryCode: CategoryCode | null,
  message: string,
): Insight {
  return {
    code,
    current_import_id: currentId,
    baseline_import_id: baselineId,
    category_code: categoryCode,
    message,
    ...values,
  }
}

/** Find the nearest earlier period by its end date, regardless of import order. */
export function findBaseline(
  current: SummaryPeriod,
  periods: readonly SummaryPeriod[],
): SummaryPeriod | null {
  return periods
    .filter((period) => period.period_end < current.period_start)
    .sort(
      (left, right) =>
        right.period_end.localeCompare(left.period_end) ||
        left.id.localeCompare(right.id),
    )[0] ?? null
}

/** Keep the selected summary available even when period comparison is blocked. */
export function analyzePeriods(
  current: SummaryPeriod,
  periods: readonly SummaryPeriod[],
  transactions: readonly AnalysisTransaction[],
): Analysis {
  const currentSummary = calculateSummary(
    current,
    transactions.filter((transaction) => transaction.import_id === current.id),
  )
  const baseline = findBaseline(current, periods)
  if (!baseline) {
    return {
      summary: currentSummary,
      comparison: blockedComparison('no_baseline', current.id, null),
      insights: [],
    }
  }

  // The contract checks unequal lengths before checking for a gap.
  if (periodDays(current) !== periodDays(baseline)) {
    return {
      summary: currentSummary,
      comparison: blockedComparison('different_duration', current.id, baseline.id),
      insights: [],
    }
  }
  if (utcDay(current.period_start) - utcDay(baseline.period_end) !== 1) {
    return {
      summary: currentSummary,
      comparison: blockedComparison('gap', current.id, baseline.id),
      insights: [],
    }
  }

  const baselineSummary = calculateSummary(
    baseline,
    transactions.filter((transaction) => transaction.import_id === baseline.id),
  )
  const previousByCategory = new Map(
    baselineSummary.categories.map((category) => [category.category_code, category.expense_cents]),
  )
  const currentByCategory = new Map(
    currentSummary.categories.map((category) => [category.category_code, category.expense_cents]),
  )
  const categories: CategoryChange[] = CATEGORY_CODES.map((categoryCode) => ({
    category_code: categoryCode,
    name: CATEGORY_NAMES[categoryCode],
    ...change(previousByCategory.get(categoryCode) ?? 0, currentByCategory.get(categoryCode) ?? 0),
  })).sort((left, right) => left.category_code.localeCompare(right.category_code))
  const totals = change(baselineSummary.expense_cents, currentSummary.expense_cents)
  const comparison: Comparison = {
    status: 'comparable',
    current_import_id: current.id,
    baseline_import_id: baseline.id,
    totals,
    categories,
  }

  const insights: Insight[] = []
  if (totals.delta_cents !== 0) {
    insights.push(insight(
      'total_change', current.id, baseline.id, totals, null,
      totals.delta_cents > 0 ? 'Kokonaismenot kasvoivat.' : 'Kokonaismenot pienenivät.',
    ))
  }

  // Each rule contributes at most one item; code breaks equal-amount ties.
  const largestIncrease = categories
    .filter((category) => category.previous_cents > 0 && category.delta_cents > 0)
    .sort((left, right) =>
      right.delta_cents - left.delta_cents ||
      left.category_code.localeCompare(right.category_code),
    )[0]
  if (largestIncrease) {
    insights.push(insight(
      'largest_category_increase', current.id, baseline.id, largestIncrease,
      largestIncrease.category_code,
      `Suurin kasvu aiemmin käytetyssä menoryhmässä: ${categoryName(largestIncrease.category_code)}.`,
    ))
  }

  const newSpend = categories
    .filter((category) => category.previous_cents === 0 && category.current_cents > 0)
    .sort((left, right) =>
      right.current_cents - left.current_cents ||
      left.category_code.localeCompare(right.category_code),
    )[0]
  if (newSpend) {
    insights.push(insight(
      'new_category_spend', current.id, baseline.id, newSpend,
      newSpend.category_code,
      `Uusi meno menoryhmässä: ${categoryName(newSpend.category_code)}.`,
    ))
  }

  return { summary: currentSummary, comparison, insights }
}
