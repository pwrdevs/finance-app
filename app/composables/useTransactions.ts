import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_STATUS = ['pending', 'paid', 'skipped', 'canceled'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number]

interface SourceTransaction {
  id: string
  type: TransactionType
  title: string
  description: string | null
  due_date: string
  origin_type: 'single' | 'recurring' | 'installment'
}

interface TransactionInstanceRecord {
  id: string
  source_transaction_id: string | null
  instance_date: string
  expected_value: number
  real_value: number | null
  is_checked: boolean
  checked_at: string | null
  status: TransactionStatus
  person_id: string | null
  card_id: string | null
  account_id: string | null
  category_id: string | null
  created_at: string
  source_transaction: SourceTransaction | null
}

export interface TransactionInstanceItem {
  id: string
  source_transaction_id: string | null
  transaction_id: string | null
  title: string
  type: TransactionType
  description: string | null
  instance_date: string
  due_date: string
  expected_value: number
  real_value: number | null
  is_checked: boolean
  checked_at: string | null
  status: TransactionStatus
  person_id: string | null
  card_id: string | null
  account_id: string | null
  category_id: string | null
  created_at: string
}

export interface TransactionFilters {
  month: number
  year: number
}

export interface CreateSingleTransactionPayload {
  title: string
  type: TransactionType
  expected_value: number
  real_value?: number | null
  due_date: string
  instance_date: string
  person_id?: string | null
  account_id?: string | null
  card_id?: string | null
  category_id?: string | null
  description?: string | null
  status?: TransactionStatus
  is_checked?: boolean
}

export interface UpdateTransactionInstancePayload {
  title: string
  type: TransactionType
  expected_value: number
  real_value?: number | null
  due_date: string
  instance_date: string
  person_id?: string | null
  account_id?: string | null
  card_id?: string | null
  category_id?: string | null
  description?: string | null
  status: TransactionStatus
  is_checked: boolean
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalId(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getMonthRange(filters: TransactionFilters) {
  const firstDay = new Date(Date.UTC(filters.year, filters.month - 1, 1))
  const nextMonth = new Date(Date.UTC(filters.year, filters.month, 1))

  return {
    from: firstDay.toISOString().slice(0, 10),
    to: nextMonth.toISOString().slice(0, 10)
  }
}

function deriveCheckedAt(isChecked: boolean) {
  return isChecked ? new Date().toISOString() : null
}

function mapInstance(record: TransactionInstanceRecord): TransactionInstanceItem {
  const source = record.source_transaction

  return {
    id: record.id,
    source_transaction_id: record.source_transaction_id,
    transaction_id: source?.id ?? null,
    title: source?.title ?? 'Untitled transaction',
    type: source?.type ?? 'expense',
    description: source?.description ?? null,
    instance_date: record.instance_date,
    due_date: source?.due_date ?? record.instance_date,
    expected_value: Number(record.expected_value),
    real_value: record.real_value == null ? null : Number(record.real_value),
    is_checked: record.is_checked,
    checked_at: record.checked_at,
    status: record.status,
    person_id: record.person_id,
    card_id: record.card_id,
    account_id: record.account_id,
    category_id: record.category_id,
    created_at: record.created_at
  }
}

export function useTransactions() {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  const masterData = useMasterData()

  function getUserId() {
    const userId = session.value?.user?.id

    if (!userId) {
      throw new Error('Authenticated user is required for transaction operations.')
    }

    return userId
  }

  async function listManualInstances(filters: TransactionFilters) {
    const { from, to } = getMonthRange(filters)

    const { data, error } = await supabase
      .from('transaction_instances')
      .select(`
        id,
        source_transaction_id,
        instance_date,
        expected_value,
        real_value,
        is_checked,
        checked_at,
        status,
        person_id,
        card_id,
        account_id,
        category_id,
        created_at,
        source_transaction:source_transaction_id (
          id,
          type,
          title,
          description,
          due_date,
          origin_type
        )
      `)
      .gte('instance_date', from)
      .lt('instance_date', to)
      .eq('source_transaction.origin_type', 'single')
      .order('instance_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as TransactionInstanceRecord[]).map(mapInstance)
  }

  async function createSingleTransaction(payload: CreateSingleTransactionPayload) {
    const userId = getUserId()
    const isChecked = payload.is_checked ?? false
    const checkedAt = deriveCheckedAt(isChecked)

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: payload.type,
        origin_type: 'single',
        title: payload.title.trim(),
        description: normalizeOptionalText(payload.description),
        expected_value: payload.expected_value,
        real_value: payload.real_value ?? null,
        due_date: payload.due_date,
        is_checked: isChecked,
        checked_at: checkedAt,
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id)
      })
      .select('id')
      .single()

    if (transactionError) {
      throw transactionError
    }

    const { error: instanceError } = await supabase
      .from('transaction_instances')
      .insert({
        user_id: userId,
        source_transaction_id: transactionData.id,
        instance_date: payload.instance_date,
        expected_value: payload.expected_value,
        real_value: payload.real_value ?? null,
        is_checked: isChecked,
        checked_at: checkedAt,
        status: payload.status ?? 'pending',
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id)
      })

    if (instanceError) {
      throw instanceError
    }
  }

  async function updateTransactionInstance(id: string, payload: UpdateTransactionInstancePayload, sourceTransactionId?: string | null) {
    const checkedAt = deriveCheckedAt(payload.is_checked)
    const normalizedDescription = normalizeOptionalText(payload.description)
    const normalizedPersonId = normalizeOptionalId(payload.person_id)
    const normalizedCardId = normalizeOptionalId(payload.card_id)
    const normalizedAccountId = normalizeOptionalId(payload.account_id)
    const normalizedCategoryId = normalizeOptionalId(payload.category_id)

    const { error: instanceError } = await supabase
      .from('transaction_instances')
      .update({
        instance_date: payload.instance_date,
        expected_value: payload.expected_value,
        real_value: payload.real_value ?? null,
        is_checked: payload.is_checked,
        checked_at: checkedAt,
        status: payload.status,
        person_id: normalizedPersonId,
        card_id: normalizedCardId,
        account_id: normalizedAccountId,
        category_id: normalizedCategoryId
      })
      .eq('id', id)

    if (instanceError) {
      throw instanceError
    }

    if (!sourceTransactionId) {
      return
    }

    const { error: transactionError } = await supabase
      .from('transactions')
      .update({
        type: payload.type,
        title: payload.title.trim(),
        description: normalizedDescription,
        expected_value: payload.expected_value,
        real_value: payload.real_value ?? null,
        due_date: payload.due_date,
        is_checked: payload.is_checked,
        checked_at: checkedAt,
        person_id: normalizedPersonId,
        card_id: normalizedCardId,
        account_id: normalizedAccountId,
        category_id: normalizedCategoryId
      })
      .eq('id', sourceTransactionId)

    if (transactionError) {
      throw transactionError
    }
  }

  async function setChecked(item: TransactionInstanceItem, checked: boolean) {
    await updateTransactionInstance(
      item.id,
      {
        title: item.title,
        type: item.type,
        expected_value: item.expected_value,
        real_value: item.real_value,
        due_date: item.due_date,
        instance_date: item.instance_date,
        person_id: item.person_id,
        account_id: item.account_id,
        card_id: item.card_id,
        category_id: item.category_id,
        description: item.description,
        status: item.status,
        is_checked: checked
      },
      item.source_transaction_id
    )
  }

  async function setStatus(item: TransactionInstanceItem, status: TransactionStatus) {
    await updateTransactionInstance(
      item.id,
      {
        title: item.title,
        type: item.type,
        expected_value: item.expected_value,
        real_value: item.real_value,
        due_date: item.due_date,
        instance_date: item.instance_date,
        person_id: item.person_id,
        account_id: item.account_id,
        card_id: item.card_id,
        category_id: item.category_id,
        description: item.description,
        status,
        is_checked: item.is_checked
      },
      item.source_transaction_id
    )
  }

  async function listFilterOptions() {
    const [people, accounts, cards, categories] = await Promise.all([
      masterData.listPeople(),
      masterData.listAccounts(),
      masterData.listCards(),
      masterData.listCategories()
    ])

    return {
      people: people.filter((entry) => entry.is_active) as PersonItem[],
      accounts: accounts.filter((entry) => entry.is_active) as AccountItem[],
      cards: cards.filter((entry) => entry.is_active) as CardItem[],
      categories: categories.filter((entry) => entry.is_active) as CategoryItem[]
    }
  }

  return {
    createSingleTransaction,
    listFilterOptions,
    listManualInstances,
    setChecked,
    setStatus,
    updateTransactionInstance
  }
}