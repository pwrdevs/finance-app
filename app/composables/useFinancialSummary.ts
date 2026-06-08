import type { TransactionStatus, TransactionType } from '~/composables/useTransactions'

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
  monthBalance: number
  accumulatedBalance: number
}

export interface AccumulatedBalanceProjection {
  initialBalance: number
  firstMonthBalance: number
  firstMonthAccumulatedBalance: number
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
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric'
  })
}

function resolveInstanceValue(expectedValue: number, realValue: number | null) {
  return realValue == null ? expectedValue : realValue
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

    const { from, to } = getMonthRange(filters)

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
        source_transaction:source_transaction_id (
          id,
          title,
          type,
          description
        )
      `)
      .gte('instance_date', from)
      .lt('instance_date', to)
      .order('instance_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const rows = (data ?? []) as TransactionInstanceSummaryRecord[]
    const launches: MonthlyLaunchItem[] = rows.map((row) => ({
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

    for (const row of rows) {
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
    const { year: startYear, month: startMonth } = { year: filters.year, month: filters.month }
    const endMonthPosition = addMonths(startYear, startMonth, projectionMonths)
    const from = `${String(startYear).padStart(4, '0')}-${String(startMonth).padStart(2, '0')}-01`
    const to = `${String(endMonthPosition.year).padStart(4, '0')}-${String(endMonthPosition.month).padStart(2, '0')}-01`

    const [{ data: accountRows, error: accountError }, { data: instanceRows, error: instanceError }] = await Promise.all([
      supabase
        .from('accounts')
        .select('initial_balance'),
      supabase
        .from('transaction_instances')
        .select(`
          instance_date,
          expected_value,
          real_value,
          status,
          source_transaction:source_transaction_id (
            type
          )
        `)
        .gte('instance_date', from)
        .lt('instance_date', to)
        .order('instance_date', { ascending: true })
    ])

    if (accountError) {
      throw accountError
    }

    if (instanceError) {
      throw instanceError
    }

    const initialBalance = ((accountRows ?? []) as AccountBalanceRecord[])
      .reduce((sum, account) => sum + toNumber(account.initial_balance), 0)

    const monthBalanceMap = new Map<string, number>()
    const records = (instanceRows ?? []) as Array<{
      instance_date: string
      expected_value: number
      real_value: number | null
      status: TransactionStatus
      source_transaction: { type: TransactionType } | null
    }>

    for (const record of records) {
      if (record.status === 'canceled') {
        continue
      }

      const type = record.source_transaction?.type || 'expense'
      const value = resolveInstanceValue(toNumber(record.expected_value), record.real_value == null ? null : Number(record.real_value))
      const signedValue = type === 'income' ? value : -value
      const key = toMonthKeyFromDate(record.instance_date)

      monthBalanceMap.set(key, (monthBalanceMap.get(key) ?? 0) + signedValue)
    }

    let runningBalance = initialBalance
    const months: AccumulatedBalanceMonth[] = []

    for (let index = 0; index < projectionMonths; index += 1) {
      const position = addMonths(startYear, startMonth, index)
      const monthKey = toMonthKey(position.year, position.month)
      const monthBalance = monthBalanceMap.get(monthKey) ?? 0
      runningBalance += monthBalance

      months.push({
        month: position.month,
        year: position.year,
        monthKey,
        monthLabel: toMonthLabel(position.year, position.month),
        monthBalance,
        accumulatedBalance: runningBalance
      })
    }

    return {
      initialBalance,
      firstMonthBalance: months[0]?.monthBalance ?? 0,
      firstMonthAccumulatedBalance: months[0]?.accumulatedBalance ?? initialBalance,
      months
    }
  }

  return {
    getAccumulatedBalanceProjection,
    getMonthlySummary
  }
}