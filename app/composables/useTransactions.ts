import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_ORIGIN_TYPES = ['single', 'installment'] as const
export type TransactionOriginType = (typeof TRANSACTION_ORIGIN_TYPES)[number]

export const TRANSACTION_STATUS = ['pending', 'paid', 'skipped', 'canceled'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number]

interface SourceTransaction {
  id: string
  type: TransactionType
  title: string
  description: string | null
  due_date: string
  origin_type: 'single' | 'recurring' | 'installment'
  installment_group_id: string | null
  installment_total: number | null
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
  origin_type: 'single' | 'recurring' | 'installment'
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
  installment_group_id: string | null
  installment_number: number | null
  installment_total: number | null
}

export interface TransactionFilters {
  month: number
  year: number
}

export interface CreateSingleTransactionPayload {
  origin_type: TransactionOriginType
  title: string
  type: TransactionType
  expected_value: number
  real_value?: number | null
  due_date?: string
  instance_date?: string
  installment_total?: number
  installment_start_date?: string
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

function generateGroupId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function addMonthsKeepingDay(dateText: string, monthOffset: number) {
  const [yearText, monthText, dayText] = dateText.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  const baseMonthIndex = month - 1
  const targetMonthIndex = baseMonthIndex + monthOffset
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12

  const lastDay = new Date(Date.UTC(targetYear, normalizedMonthIndex + 1, 0)).getUTCDate()
  const clampedDay = Math.min(day, lastDay)

  const isoYear = String(targetYear).padStart(4, '0')
  const isoMonth = String(normalizedMonthIndex + 1).padStart(2, '0')
  const isoDay = String(clampedDay).padStart(2, '0')

  return `${isoYear}-${isoMonth}-${isoDay}`
}

function splitInstallmentValues(totalValue: number, installmentTotal: number) {
  const totalCents = Math.round(totalValue * 100)
  const baseCents = Math.floor(totalCents / installmentTotal)
  const remainder = totalCents - (baseCents * installmentTotal)

  const centsValues = new Array(installmentTotal).fill(baseCents)
  centsValues[installmentTotal - 1] = centsValues[installmentTotal - 1] + remainder

  return centsValues.map(value => value / 100)
}

function getInstallmentNumber(startDate: string, instanceDate: string, installmentTotal: number) {
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [instanceYear, instanceMonth] = instanceDate.split('-').map(Number)

  const rawNumber = ((instanceYear - startYear) * 12) + (instanceMonth - startMonth) + 1

  if (!Number.isFinite(rawNumber) || rawNumber < 1) {
    return 1
  }

  if (rawNumber > installmentTotal) {
    return installmentTotal
  }

  return rawNumber
}

function mapInstance(record: TransactionInstanceRecord): TransactionInstanceItem {
  const source = record.source_transaction
  const installmentTotal = source?.installment_total ?? null
  const installmentNumber =
    source?.origin_type === 'installment' && installmentTotal
      ? getInstallmentNumber(source.due_date, record.instance_date, installmentTotal)
      : null

  return {
    id: record.id,
    source_transaction_id: record.source_transaction_id,
    transaction_id: source?.id ?? null,
    title: source?.title ?? 'Untitled transaction',
    type: source?.type ?? 'expense',
    origin_type: source?.origin_type ?? 'single',
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
    created_at: record.created_at,
    installment_group_id: source?.installment_group_id ?? null,
    installment_number: installmentNumber,
    installment_total: installmentTotal
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
          origin_type,
          installment_group_id,
          installment_total
        )
      `)
      .gte('instance_date', from)
      .lt('instance_date', to)
      .order('instance_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const mapped = ((data ?? []) as TransactionInstanceRecord[])
      .map(mapInstance)
      .filter((entry) => entry.origin_type !== 'recurring')

    return mapped
  }

  async function createSingleTransaction(payload: CreateSingleTransactionPayload) {
    if (payload.origin_type === 'installment') {
      await createInstallmentTransaction(payload)
      return
    }

    const userId = getUserId()
    const isChecked = payload.is_checked ?? false
    const checkedAt = deriveCheckedAt(isChecked)

    if (!payload.due_date || !payload.instance_date) {
      throw new Error('Due date and instance date are required for single transactions.')
    }

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: payload.type,
        origin_type: payload.origin_type,
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

  async function createInstallmentTransaction(payload: CreateSingleTransactionPayload) {
    const userId = getUserId()
    const installmentTotal = payload.installment_total ?? 0
    const startDate = payload.installment_start_date

    if (!startDate) {
      throw new Error('Installment start date is required.')
    }

    if (installmentTotal < 2) {
      throw new Error('Installment total must be at least 2.')
    }

    if (!normalizeOptionalId(payload.card_id)) {
      throw new Error('Card is required for installment transactions.')
    }

    const groupId = generateGroupId()
    const parcelValues = splitInstallmentValues(payload.expected_value, installmentTotal)

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: payload.type,
        origin_type: 'installment',
        title: payload.title.trim(),
        description: normalizeOptionalText(payload.description),
        expected_value: payload.expected_value,
        real_value: null,
        due_date: startDate,
        is_checked: false,
        checked_at: null,
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id),
        installment_group_id: groupId,
        installment_number: 1,
        installment_total: installmentTotal
      })
      .select('id')
      .single()

    if (transactionError) {
      throw transactionError
    }

    const instances = parcelValues.map((parcelValue, index) => ({
      user_id: userId,
      source_transaction_id: transactionData.id,
      instance_date: addMonthsKeepingDay(startDate, index),
      expected_value: parcelValue,
      real_value: null,
      is_checked: false,
      checked_at: null,
      status: 'pending' as const,
      person_id: normalizeOptionalId(payload.person_id),
      card_id: normalizeOptionalId(payload.card_id),
      account_id: normalizeOptionalId(payload.account_id),
      category_id: normalizeOptionalId(payload.category_id)
    }))

    const { error: instanceError } = await supabase
      .from('transaction_instances')
      .insert(instances)

    if (instanceError) {
      throw instanceError
    }
  }

  async function updateTransactionInstance(
    id: string,
    payload: UpdateTransactionInstancePayload,
    sourceTransactionId?: string | null,
    sourceOriginType?: 'single' | 'recurring' | 'installment'
  ) {
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

    if (!sourceTransactionId || sourceOriginType !== 'single') {
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
      item.source_transaction_id,
      item.origin_type
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
      item.source_transaction_id,
      item.origin_type
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
    createTransaction: createSingleTransaction,
    listFilterOptions,
    listManualInstances,
    setChecked,
    setStatus,
    updateTransactionInstance
  }
}