/** Format stored ISO dates and integer cents for the Finnish user interface. */
import type { ImportRecord } from '../storage/types'

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
