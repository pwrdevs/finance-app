function toDateParts(value) {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) {
    throw new Error(`Data invalida: ${value}`)
  }

  return { year, month, day }
}

function getLastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addMonths(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  }
}

function formatDateYmd(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getCardFinancialEffectiveDate(instanceDate, closingDay, dueDay) {
  if (!closingDay) {
    return instanceDate
  }

  const { year, month, day } = toDateParts(instanceDate)
  const monthOffset = day <= closingDay ? 0 : 1

  const target = addMonths(year, month, monthOffset)
  const safeDay = Math.min(day, getLastDayOfMonth(target.year, target.month))
  return formatDateYmd(target.year, target.month, safeDay)
}

function resolveFinancialEffectiveDate(entry) {
  if (!entry.card_id) {
    return entry.instance_date
  }

  return getCardFinancialEffectiveDate(
    entry.instance_date,
    entry.card?.closing_day ?? null,
    entry.card?.due_day ?? null
  )
}

function pickOriginalForLinkedReimbursement(reimbursementRow, originals) {
  if (!originals.length) return null
  if (originals.length === 1) return originals[0]

  const sameDate = originals.find(entry => entry.instance_date === reimbursementRow.instance_date)
  if (sameDate) return sameDate

  const targetDate = Date.parse(reimbursementRow.instance_date)
  if (Number.isNaN(targetDate)) return originals[0]

  let nearest = originals[0]
  let nearestDiff = Number.POSITIVE_INFINITY

  for (const entry of originals) {
    const entryDate = Date.parse(entry.instance_date)
    if (Number.isNaN(entryDate)) continue

    const diff = Math.abs(entryDate - targetDate)
    if (diff < nearestDiff) {
      nearest = entry
      nearestDiff = diff
    }
  }

  return nearest
}

function buildFinancialEffectiveDateMap(records) {
  const effectiveDateById = new Map()
  const originalsByGroup = new Map()

  for (const record of records) {
    effectiveDateById.set(record.id, resolveFinancialEffectiveDate(record))

    if (!record.reimbursement_group_id || record.reimbursement_role !== 'original') {
      continue
    }

    const current = originalsByGroup.get(record.reimbursement_group_id) ?? []
    current.push(record)
    originalsByGroup.set(record.reimbursement_group_id, current)
  }

  for (const record of records) {
    if (!record.reimbursement_group_id || record.reimbursement_role !== 'reimbursement') {
      continue
    }

    const originals = originalsByGroup.get(record.reimbursement_group_id) ?? []
    const linkedOriginal = pickOriginalForLinkedReimbursement(record, originals)

    if (!linkedOriginal?.card_id) {
      continue
    }

    const linkedDate = effectiveDateById.get(linkedOriginal.id)
    if (linkedDate) {
      effectiveDateById.set(record.id, linkedDate)
    }
  }

  return effectiveDateById
}

function monthKey(dateText) {
  return dateText.slice(0, 7)
}

function valueOf(row) {
  return row.real_value == null ? Number(row.expected_value) : Number(row.real_value)
}

function summarizeMonth(records, targetMonthKey) {
  const effectiveDateById = buildFinancialEffectiveDateMap(records)
  const inMonth = records.filter(row => monthKey(effectiveDateById.get(row.id) ?? row.instance_date) === targetMonthKey)
  const active = inMonth.filter(row => row.status !== 'canceled')

  const totalIncome = active
    .filter(row => row.type === 'income')
    .reduce((sum, row) => sum + valueOf(row), 0)

  const totalExpense = active
    .filter(row => row.type === 'expense')
    .reduce((sum, row) => sum + valueOf(row), 0)

  return {
    totalIncome,
    totalExpense,
    monthlyBalance: totalIncome - totalExpense
  }
}

function compareMonthKey(a, b) {
  return a.localeCompare(b)
}

function projection(records, selectedMonthKey, initialBalance = 0) {
  const effectiveDateById = buildFinancialEffectiveDateMap(records)
  const monthBalanceMap = new Map()

  for (const row of records) {
    if (row.status === 'canceled') continue

    const key = monthKey(effectiveDateById.get(row.id) ?? row.instance_date)
    if (compareMonthKey(key, selectedMonthKey) > 0) continue

    const current = monthBalanceMap.get(key) ?? { income: 0, expense: 0 }
    const val = valueOf(row)

    monthBalanceMap.set(key, {
      income: current.income + (row.type === 'income' ? val : 0),
      expense: current.expense + (row.type === 'expense' ? val : 0)
    })
  }

  const keys = Array.from(monthBalanceMap.keys()).sort(compareMonthKey)
  let running = initialBalance
  let min = Number.POSITIVE_INFINITY

  for (const key of keys) {
    const item = monthBalanceMap.get(key)
    running += (item.income - item.expense)
    if (running < min) {
      min = running
    }
  }

  const safeMin = Number.isFinite(min) ? min : initialBalance
  return {
    requiredContribution: safeMin < 0 ? Math.abs(safeMin) : 0,
    selectedMonthBalance: (monthBalanceMap.get(selectedMonthKey)?.income ?? 0) - (monthBalanceMap.get(selectedMonthKey)?.expense ?? 0)
  }
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} falhou: esperado ${expected}, recebido ${actual}`)
  }
}

function run() {
  const card = { closing_day: 25, due_day: 10 }

  const scenario1 = [
    {
      id: 'income-account-jun',
      instance_date: '2026-06-05',
      expected_value: 1000,
      real_value: null,
      status: 'pending',
      type: 'income',
      card_id: null,
      card: null,
      reimbursement_group_id: null,
      reimbursement_role: null
    },
    {
      id: 'expense-account-jun',
      instance_date: '2026-06-08',
      expected_value: 200,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: null,
      card: null,
      reimbursement_group_id: null,
      reimbursement_role: null
    },
    {
      id: 'expense-card-may-comp-jun',
      instance_date: '2026-05-30',
      expected_value: 300,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    }
  ]

  const juneSummary = summarizeMonth(scenario1, '2026-06')
  assertEqual('cenario1 entradas', juneSummary.totalIncome, 1000)
  assertEqual('cenario1 saidas', juneSummary.totalExpense, 500)
  assertEqual('cenario1 saldo', juneSummary.monthlyBalance, 500)

  const scenario2 = [
    {
      id: 'expense-card-may-comp-jun-only',
      instance_date: '2026-05-30',
      expected_value: 300,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    }
  ]

  const juneOnlyCardSummary = summarizeMonth(scenario2, '2026-06')
  assertEqual('cenario2 saidas junho', juneOnlyCardSummary.totalExpense, 300)
  assertEqual('cenario2 saldo junho', juneOnlyCardSummary.monthlyBalance, -300)

  const juneProjection = projection(scenario2, '2026-06', 0)
  assertEqual('cenario2 aporte necessario', juneProjection.requiredContribution, 300)

  const cardBeforeAndAfterClose = [
    {
      id: 'expense-card-jun-20',
      instance_date: '2026-06-20',
      expected_value: 120,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    },
    {
      id: 'expense-card-jun-30',
      instance_date: '2026-06-30',
      expected_value: 180,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    }
  ]

  const juneBeforeCloseSummary = summarizeMonth(cardBeforeAndAfterClose, '2026-06')
  const julyAfterCloseSummary = summarizeMonth(cardBeforeAndAfterClose, '2026-07')
  assertEqual('cartao antes do fechamento fica no mes atual', juneBeforeCloseSummary.totalExpense, 120)
  assertEqual('cartao depois do fechamento vai para o mes seguinte', julyAfterCloseSummary.totalExpense, 180)

  const mayOnlyCardSummary = summarizeMonth(scenario2, '2026-05')
  assertEqual('cartao maio nao entra em maio', mayOnlyCardSummary.totalExpense, 0)

  const installments = [
    {
      id: 'installment-1',
      instance_date: '2026-05-30',
      expected_value: 150,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    },
    {
      id: 'installment-2',
      instance_date: '2026-06-30',
      expected_value: 150,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    }
  ]

  const juneInstallments = summarizeMonth(installments, '2026-06')
  const julyInstallments = summarizeMonth(installments, '2026-07')
  assertEqual('parcela 1 entra junho', juneInstallments.totalExpense, 150)
  assertEqual('parcela 2 entra julho', julyInstallments.totalExpense, 150)

  const recurring = [
    {
      id: 'rec-1',
      instance_date: '2026-05-27',
      expected_value: 100,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    },
    {
      id: 'rec-2',
      instance_date: '2026-06-27',
      expected_value: 100,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: null,
      reimbursement_role: null
    }
  ]

  const juneRecurring = summarizeMonth(recurring, '2026-06')
  const julyRecurring = summarizeMonth(recurring, '2026-07')
  assertEqual('recorrencia 1 entra junho', juneRecurring.totalExpense, 100)
  assertEqual('recorrencia 2 entra julho', julyRecurring.totalExpense, 100)

  const linkedReimbursement = [
    {
      id: 'orig-card',
      instance_date: '2026-05-30',
      expected_value: 300,
      real_value: null,
      status: 'pending',
      type: 'expense',
      card_id: 'card-1',
      card,
      reimbursement_group_id: 'rg-1',
      reimbursement_role: 'original'
    },
    {
      id: 'reimbursement-income',
      instance_date: '2026-05-02',
      expected_value: 300,
      real_value: null,
      status: 'pending',
      type: 'income',
      card_id: null,
      card: null,
      reimbursement_group_id: 'rg-1',
      reimbursement_role: 'reimbursement'
    }
  ]

  const juneLinked = summarizeMonth(linkedReimbursement, '2026-06')
  assertEqual('reembolso vinculado acompanha competencia da fatura', juneLinked.totalIncome, 300)

  console.log('OK: validacao deterministica de competencia financeira da Dashboard passou.')
}

run()
