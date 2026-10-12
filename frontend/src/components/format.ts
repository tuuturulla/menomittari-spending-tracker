/** Format stored ISO dates and integer cents for the Finnish user interface. */
import type { ImportRecord } from '../storage/types'
import type { ChangeValues } from '../domain/analysis'

const euroFormatter = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
})
const signedEuroFormatter = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'always',
})
const signedPercentFormatter = new Intl.NumberFormat('fi-FI', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
})

export function formatCurrency(cents: number): string {
  return euroFormatter.format(cents / 100)
}

export function formatSignedCurrency(cents: number): string {
  return signedEuroFormatter.format(cents / 100)
}

export function formatPercent(value: number | null): string {
  return value === null ? 'Ei laskettavissa' : `${signedPercentFormatter.format(value)} %`
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${Number(day)}.${Number(month)}.${year}`
}

export function formatPeriod(period: Pick<ImportRecord, 'period_start' | 'period_end'>): string {
  return `${formatDate(period.period_start)}–${formatDate(period.period_end)}`
}

/** Label changes without treating lower spending as a guaranteed saving. */
export function changeLabel(values: Pick<ChangeValues, 'previous_cents' | 'current_cents' | 'delta_cents'>): string {
  if (values.delta_cents === 0) return 'ei muutosta'
  if (values.previous_cents === 0) return `uusi meno · ${formatCurrency(values.current_cents)}`
  return `${formatCurrency(Math.abs(values.delta_cents))} ${values.delta_cents > 0 ? 'enemmän' : 'vähemmän'}`
}
