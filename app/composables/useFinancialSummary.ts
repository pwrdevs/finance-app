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

export function useFinancialSummary() {
  const supabase = useSupabaseClient()

  async function getMonthlySummary(filters: FinancialSummaryFilters): Promise<MonthlyFinancialSummary> {
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
      title: row.source_transaction?.title || 'Untitled transaction',
      type: row.source_transaction?.type || 'expense',
      description: row.source_transaction?.description ?? null,
      instance_date: row.instance_date,
      expected_value: toNumber(row.expected_value),
      real_value: row.real_value == null ? null : Number(row.real_value),
      status: row.status,
      is_checked: row.is_checked,
      created_at: row.created_at
    }))

    const totalIncome = launches
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + item.expected_value, 0)

    const totalExpense = launches
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + item.expected_value, 0)

    const checkedTotal = launches
      .filter(item => item.is_checked)
      .reduce((sum, item) => sum + item.expected_value, 0)

    const pendingTotal = launches
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + item.expected_value, 0)

    const canceledTotal = launches
      .filter(item => item.status === 'canceled')
      .reduce((sum, item) => sum + item.expected_value, 0)

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
        totalExpense: current.totalExpense + toNumber(row.expected_value),
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
      numberOfTransactions: launches.length,
      cardStatements,
      recentLaunches: launches.slice(0, 8)
    }
  }

  return {
    getMonthlySummary
  }
}