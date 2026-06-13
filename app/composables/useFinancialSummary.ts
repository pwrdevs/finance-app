import type { TransactionStatus, TransactionType } from '~/composables/useTransactions'
import { resolveFinancialEffectiveDate as resolveFinancialEffectiveDateShared } from '~/utils/financialCompetence'

interface SourceTransactionSummary {
  id: string
  title: string
  type: TransactionType
  description: string | null
}

interface TransactionInstanceSummaryRecord {
  id: string
  instance_date: string
  expected_value: number
  real_value: number | null
  status: TransactionStatus
  is_checked: boolean
  created_at: string
  card_id: string | null
  card: {
    closing_day: number | null
    due_day: number | null
  } | null
  source_transaction: SourceTransactionSummary | null
}

export interface CardStatementSummary {
  card_id: string
  totalExpense: number
  transactionCount: number
}

export interface FinancialSummaryFilters {
  month: number
  year: number
}

interface AccountBalanceRecord {
  initial_balance: number
}

export interface MonthlyLaunchItem {
  id: string
  title: string
  type: TransactionType
  description: string | null
  instance_date: string
  expected_value: number
  real_value: number | null
  status: TransactionStatus
  is_checked: boolean
  created_at: string
}

export interface MonthlyFinancialSummary {
  totalIncome: number
  totalExpense: number
  monthlyBalance: number
  checkedTotal: number
  pendingTotal: number
  canceledTotal: number
  numberOfTransactions: number
  cardStatements: CardStatementSummary[]
  recentLaunches: MonthlyLaunchItem[]
}

export interface AccumulatedBalanceMonth {
  month: number
  year: number
  monthKey: string
  monthLabel: string
  income: number
  expense: number
  monthBalance: number
  accumulatedBalance: number
}

export interface AccumulatedBalanceProjection {
  initialBalance: number
  firstMonthBalance: number
  firstMonthAccumulatedBalance: number
  selectedMonthBalance: number
  selectedMonthAccumulatedBalance: number
  minimumAccumulatedBalance: number
  requiredContribution: number
  firstNegativeMonthLabel: string | null
  analysisStartLabel: string
  analysisEndLabel: string
  months: AccumulatedBalanceMonth[]
}

function getMonthRange(filters: FinancialSummaryFilters) {
  const firstDay = new Date(Date.UTC(filters.year, filters.month - 1, 1))
  const nextMonth = new Date(Date.UTC(filters.year, filters.month, 1))

  return {
    from: firstDay.toISOString().slice(0, 10),
    to: nextMonth.toISOString().slice(0, 10)
  }
}

function toNumber(value: number | null | undefined) {
  if (value == null) {
    return 0
  }

  return Number(value)
}

function toMonthKeyFromDate(dateText: string) {
  return dateText.slice(0, 7)
}

function toMonthKey(year: number, month: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

function addMonths(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  }
}

function toMonthLabel(year: number, month: number) {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const monthLabel = monthNames[month - 1] || String(month)
  const yearSuffix = String(year).slice(-2)
  return `${monthLabel}/${yearSuffix}`
}

function resolveInstanceValue(expectedValue: number, realValue: number | null) {
  return realValue == null ? expectedValue : realValue
}

function resolveFinancialEffectiveDate(record: { instance_date: string; card_id: string | null; card: { closing_day: number | null; due_day: number | null } | null }) {
  return resolveFinancialEffectiveDateShared({
    instance_date: record.instance_date,
    card_id: record.card_id,
    closing_day: record.card?.closing_day ?? null,
    due_day: record.card?.due_day ?? null
  })
}

export function useFinancialSummary() {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()

  async function ensureAuthenticatedContext() {
    if (session.value?.user?.id) {
      return
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      throw sessionError
    }

    if (sessionData.session?.user?.id) {
      return
    }

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user?.id) {
      throw error || new Error('Sessao invalida para carregar o resumo financeiro. Faca login novamente.')
    }
  }

  async function getMonthlySummary(filters: FinancialSummaryFilters): Promise<MonthlyFinancialSummary> {
    await ensureAuthenticatedContext()

    const { to } = getMonthRange(filters)
    const previousMonthPosition = addMonths(filters.year, filters.month, -1)
    const previousMonthStart = `${String(previousMonthPosition.year).padStart(4, '0')}-${String(previousMonthPosition.month).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('transaction_instances')
      .select(`
        id,
        instance_date,
        expected_value,
        real_value,
        status,
        is_checked,
        created_at,
        card_id,
        card:card_id (
          closing_day,
          due_day
        ),
        source_transaction:source_transaction_id (
          id,
          title,
          type,
          description
        )
      `)
      .gte('instance_date', previousMonthStart)
      .lt('instance_date', to)
      .order('instance_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const rows = (data ?? []) as TransactionInstanceSummaryRecord[]
    const selectedMonthKey = toMonthKey(filters.year, filters.month)
    const rowsInFinancialMonth = rows.filter((row) => toMonthKeyFromDate(resolveFinancialEffectiveDate(row)) === selectedMonthKey)

    const launches: MonthlyLaunchItem[] = rowsInFinancialMonth.map((row) => ({
      id: row.id,
      title: row.source_transaction?.title || 'Lancamento sem titulo',
      type: row.source_transaction?.type || 'expense',
      description: row.source_transaction?.description ?? null,
      instance_date: row.instance_date,
      expected_value: toNumber(row.expected_value),
      real_value: row.real_value == null ? null : Number(row.real_value),
      status: row.status,
      is_checked: row.is_checked,
      created_at: row.created_at
    }))

    const activeLaunches = launches.filter(item => item.status !== 'canceled')

    const totalIncome = activeLaunches
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + resolveInstanceValue(item.expected_value, item.real_value), 0)

    const totalExpense = activeLaunches
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + resolveInstanceValue(item.expected_value, item.real_value), 0)

    const checkedTotal = activeLaunches
      .filter(item => item.is_checked)
      .reduce((sum, item) => sum + resolveInstanceValue(item.expected_value, item.real_value), 0)

    const pendingTotal = activeLaunches
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + resolveInstanceValue(item.expected_value, item.real_value), 0)

    const canceledTotal = launches
      .filter(item => item.status === 'canceled')
      .reduce((sum, item) => sum + resolveInstanceValue(item.expected_value, item.real_value), 0)

    const cardStatementsMap = new Map<string, { totalExpense: number; transactionCount: number }>()

    for (const row of rowsInFinancialMonth) {
      if (row.status === 'canceled') {
        continue
      }

      if (row.source_transaction?.type !== 'expense' || !row.card_id) {
        continue
      }

      const current = cardStatementsMap.get(row.card_id) || { totalExpense: 0, transactionCount: 0 }
      cardStatementsMap.set(row.card_id, {
        totalExpense: current.totalExpense + resolveInstanceValue(toNumber(row.expected_value), row.real_value == null ? null : Number(row.real_value)),
        transactionCount: current.transactionCount + 1
      })
    }

    const cardStatements = Array.from(cardStatementsMap.entries())
      .map(([card_id, value]) => ({
        card_id,
        totalExpense: value.totalExpense,
        transactionCount: value.transactionCount
      }))
      .sort((left, right) => right.totalExpense - left.totalExpense)

    return {
      totalIncome,
      totalExpense,
      monthlyBalance: totalIncome - totalExpense,
      checkedTotal,
      pendingTotal,
      canceledTotal,
      numberOfTransactions: activeLaunches.length,
      cardStatements,
      recentLaunches: launches.slice(0, 8)
    }
  }

  async function getAccumulatedBalanceProjection(filters: FinancialSummaryFilters): Promise<AccumulatedBalanceProjection> {
    await ensureAuthenticatedContext()

    const projectionMonths = 12
    const selectedYear = filters.year
    const selectedMonth = filters.month
    const selectedFrom = `${String(selectedYear).padStart(4, '0')}-${String(selectedMonth).padStart(2, '0')}-01`
    const selectedToPosition = addMonths(selectedYear, selectedMonth, 1)
    const selectedTo = `${String(selectedToPosition.year).padStart(4, '0')}-${String(selectedToPosition.month).padStart(2, '0')}-01`

    const [{ data: accountRows, error: accountError }, { data: oldestRows, error: oldestError }] = await Promise.all([
      supabase
        .from('accounts')
        .select('initial_balance'),
      supabase
        .from('transaction_instances')
        .select('instance_date')
        .lt('instance_date', selectedTo)
        .order('instance_date', { ascending: true })
        .limit(1)
    ])

    if (accountError) {
      throw accountError
    }

    if (oldestError) {
      throw oldestError
    }

    const oldestDate = (oldestRows?.[0]?.instance_date as string | undefined) ?? null
    const analysisStartMonthKey = oldestDate ? oldestDate.slice(0, 7) : selectedFrom.slice(0, 7)
    const analysisFrom = `${analysisStartMonthKey}-01`

    const { data: instanceRows, error: instanceError } = await supabase
      .from('transaction_instances')
      .select(`
          instance_date,
          expected_value,
          real_value,
          status,
          card_id,
          card:card_id (
            closing_day,
            due_day
          ),
          source_transaction:source_transaction_id (
            type
          )
        `)
        .gte('instance_date', analysisFrom)
        .lt('instance_date', selectedTo)
        .order('instance_date', { ascending: true })

    if (instanceError) {
      throw instanceError
    }

    const initialBalance = ((accountRows ?? []) as AccountBalanceRecord[])
      .reduce((sum, account) => sum + toNumber(account.initial_balance), 0)

    const monthBalanceMap = new Map<string, { income: number; expense: number }>()
    const records = (instanceRows ?? []) as Array<{
      instance_date: string
      expected_value: number
      real_value: number | null
      status: TransactionStatus
      source_transaction: { type: TransactionType } | null
      card_id: string | null
      card: { closing_day: number | null; due_day: number | null } | null
    }>

    for (const record of records) {
      if (record.status === 'canceled') {
        continue
      }

      const type = record.source_transaction?.type || 'expense'
      const value = resolveInstanceValue(toNumber(record.expected_value), record.real_value == null ? null : Number(record.real_value))
      const financialEffectiveDate = resolveFinancialEffectiveDate(record)
      const financialMonthKey = toMonthKeyFromDate(financialEffectiveDate)

      if (financialMonthKey > toMonthKey(selectedYear, selectedMonth)) {
        continue
      }

      const key = financialMonthKey
      const current = monthBalanceMap.get(key) || { income: 0, expense: 0 }

      monthBalanceMap.set(key, {
        income: current.income + (type === 'income' ? value : 0),
        expense: current.expense + (type === 'expense' ? value : 0)
      })
    }

    const [startYearText, startMonthText] = analysisStartMonthKey.split('-')
    const startYear = Number(startYearText)
    const startMonth = Number(startMonthText)
    const totalMonths = Math.max(0, ((selectedYear - startYear) * 12) + (selectedMonth - startMonth))

    const fullTimeline: AccumulatedBalanceMonth[] = []
    let runningBalance = initialBalance
    let minimumAccumulatedBalance = Number.POSITIVE_INFINITY
    let firstNegativeMonthLabel: string | null = null

    for (let index = 0; index <= totalMonths; index += 1) {
      const position = addMonths(startYear, startMonth, index)
      const monthKey = toMonthKey(position.year, position.month)
      const monthEntry = monthBalanceMap.get(monthKey) ?? { income: 0, expense: 0 }
      const monthBalance = monthEntry.income - monthEntry.expense
      runningBalance += monthBalance

      if (runningBalance < minimumAccumulatedBalance) {
        minimumAccumulatedBalance = runningBalance
      }

      if (runningBalance < 0 && !firstNegativeMonthLabel) {
        firstNegativeMonthLabel = toMonthLabel(position.year, position.month)
      }

      fullTimeline.push({
        month: position.month,
        year: position.year,
        monthKey,
        monthLabel: toMonthLabel(position.year, position.month),
        income: monthEntry.income,
        expense: monthEntry.expense,
        monthBalance,
        accumulatedBalance: runningBalance
      })
    }

    const months = fullTimeline.slice(-projectionMonths)
    const selectedMonthEntry = fullTimeline.at(-1)
    const selectedMonthBalance = selectedMonthEntry?.monthBalance ?? 0
    const selectedMonthAccumulatedBalance = selectedMonthEntry?.accumulatedBalance ?? initialBalance
    const safeMinimum = Number.isFinite(minimumAccumulatedBalance) ? minimumAccumulatedBalance : selectedMonthAccumulatedBalance
    const requiredContribution = safeMinimum < 0 ? Math.abs(safeMinimum) : 0

    return {
      initialBalance,
      firstMonthBalance: selectedMonthBalance,
      firstMonthAccumulatedBalance: selectedMonthAccumulatedBalance,
      selectedMonthBalance,
      selectedMonthAccumulatedBalance,
      minimumAccumulatedBalance: safeMinimum,
      requiredContribution,
      firstNegativeMonthLabel,
      analysisStartLabel: toMonthLabel(startYear, startMonth),
      analysisEndLabel: toMonthLabel(selectedYear, selectedMonth),
      months
    }
  }

  return {
    getAccumulatedBalanceProjection,
    getMonthlySummary
  }
}