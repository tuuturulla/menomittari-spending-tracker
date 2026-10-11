/** Resolve calendar-month boundaries without local time-zone or month-overflow surprises. */
export interface DatePeriod {
  period_start: string
  period_end: string
}

/** Turn an HTML month value into inclusive ISO dates; reject incomplete selections. */
export function calendarMonthPeriod(month: string): DatePeriod | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return null
  }
  const lastDay = new Date(`${month}-01T00:00:00.000Z`)
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1)
  lastDay.setUTCDate(0)
  return { period_start: `${month}-01`, period_end: lastDay.toISOString().slice(0, 10) }
}

export function isSingleMonthPeriod(period: DatePeriod): boolean {
  return period.period_start.slice(0, 7) === period.period_end.slice(0, 7)
}

/** Full months map to full months; partial periods require the exact same day numbers. */
export function previousMonthPeriod(period: DatePeriod): DatePeriod | null {
  if (!isSingleMonthPeriod(period)) {
    return null
  }
  const month = period.period_start.slice(0, 7)
  const currentMonth = calendarMonthPeriod(month)
  const year = Number(month.slice(0, 4))
  const monthNumber = Number(month.slice(5))
  const previousYear = monthNumber === 1 ? year - 1 : year
  if (previousYear < 0) {
    return null
  }
  const previousMonth = calendarMonthPeriod(
    `${String(previousYear).padStart(4, '0')}-${String(monthNumber === 1 ? 12 : monthNumber - 1).padStart(2, '0')}`,
  )
  if (!currentMonth || !previousMonth) {
    return null
  }
  if (period.period_start === currentMonth.period_start && period.period_end === currentMonth.period_end) {
    return previousMonth
  }

  // Never let Date silently turn February 30 into a day in March, or trim a partial period.
  if (period.period_end.slice(8) > previousMonth.period_end.slice(8)) {
    return null
  }
  const previousPrefix = previousMonth.period_start.slice(0, 7)
  return {
    period_start: `${previousPrefix}-${period.period_start.slice(8)}`,
    period_end: `${previousPrefix}-${period.period_end.slice(8)}`,
  }
}
