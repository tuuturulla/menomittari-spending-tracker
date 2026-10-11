import { describe, expect, it } from 'vitest'
import { calendarMonthPeriod, previousMonthPeriod } from './periods'

describe('calendar periods', () => {
  it.each([
    ['2026-05', '2026-05-31'], ['2026-06', '2026-06-30'],
    ['2026-02', '2026-02-28'], ['2024-02', '2024-02-29'],
    ['0099-02', '0099-02-28'], ['9999-12', '9999-12-31'],
  ])('resolves the real last day of %s', (month, end) => {
    expect(calendarMonthPeriod(month)).toEqual({ period_start: `${month}-01`, period_end: end })
  })

  it.each(['', '2026', '2026-00', '2026-13', '2026-5', '2026-05-01'])
    ('rejects incomplete or invalid month selections: %s', (month) => {
      expect(calendarMonthPeriod(month)).toBeNull()
    })

  it('maps complete months to complete months, including leap years and year changes', () => {
    expect(previousMonthPeriod(calendarMonthPeriod('2026-05')!)).toEqual(calendarMonthPeriod('2026-04'))
    expect(previousMonthPeriod(calendarMonthPeriod('2024-03')!)).toEqual(calendarMonthPeriod('2024-02'))
    expect(previousMonthPeriod(calendarMonthPeriod('2026-01')!)).toEqual(calendarMonthPeriod('2025-12'))
  })

  it('preserves both day numbers of a partial period rather than moving to the preceding days', () => {
    expect(previousMonthPeriod({ period_start: '2026-05-05', period_end: '2026-05-15' }))
      .toEqual({ period_start: '2026-04-05', period_end: '2026-04-15' })
  })

  it('does not silently shorten an impossible partial period or map a cross-month period', () => {
    expect(previousMonthPeriod({ period_start: '2026-03-01', period_end: '2026-03-30' })).toBeNull()
    expect(previousMonthPeriod({ period_start: '2026-05-15', period_end: '2026-05-31' })).toBeNull()
    expect(previousMonthPeriod({ period_start: '2026-04-15', period_end: '2026-05-15' })).toBeNull()
    expect(previousMonthPeriod(calendarMonthPeriod('0000-01')!)).toBeNull()
  })
})
