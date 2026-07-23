function toDateParts(value: string) {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) {
    throw new Error(`Data invalida: ${value}`)
  }

  return { year, month, day }
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addMonths(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  }
}

function formatDateYmd(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function shiftDateByMonthsKeepingDay(dateText: string, monthOffset: number) {
  const { year, month, day } = toDateParts(dateText)
  const target = addMonths(year, month, monthOffset)
  const safeDay = Math.min(day, getLastDayOfMonth(target.year, target.month))

  return formatDateYmd(target.year, target.month, safeDay)
}

export function getCardFinancialEffectiveDate(instanceDate: string, closingDay: number | null, dueDay: number | null) {
  if (!closingDay) {
    return instanceDate
  }

  const { year, month, day } = toDateParts(instanceDate)
  const monthOffset = day <= closingDay ? 0 : 1

  const target = addMonths(year, month, monthOffset)
  const safeDay = Math.min(day, getLastDayOfMonth(target.year, target.month))
  return formatDateYmd(target.year, target.month, safeDay)
}

export function resolveFinancialEffectiveDate(entry: {
  instance_date: string
  card_id: string | null
  financial_effective_date_override?: string | null
  closing_day?: number | null
  due_day?: number | null
}) {
  if (entry.financial_effective_date_override) {
    return entry.financial_effective_date_override
  }

  if (!entry.card_id) {
    return entry.instance_date
  }

  return getCardFinancialEffectiveDate(
    entry.instance_date,
    entry.closing_day ?? null,
    entry.due_day ?? null
  )
}