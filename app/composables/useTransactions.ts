import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_ORIGIN_TYPES = ['single', 'installment', 'recurring'] as const
export type TransactionOriginType = (typeof TRANSACTION_ORIGIN_TYPES)[number]

export const RECURRING_SCOPE = ['single', 'future', 'series'] as const
export type RecurringScope = (typeof RECURRING_SCOPE)[number]

export const TRANSACTION_STATUS = ['pending', 'paid', 'skipped', 'canceled'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number]

interface SourceTransaction {
  id: string
  type: TransactionType
  title: string
  description: string | null
  due_date: string
  origin_type: 'single' | 'recurring' | 'installment'
  recurrence_rule_id: string | null
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
  recurrence_rule_id: string | null
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
  recurring_start_date?: string
  recurring_end_date?: string | null
  recurring_no_end_date?: boolean
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
  recurring_end_date?: string | null
  recurring_no_end_date?: boolean
}

interface RecurrenceRuleRecord {
  id: string
  start_date: string
  end_date: string | null
  is_active: boolean
}

interface RecurringSourceRecord {
  id: string
  recurrence_rule_id: string | null
  user_id: string
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

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10)
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

function shiftDays(dateText: string, dayOffset: number) {
  const date = new Date(`${dateText}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + dayOffset)
  return date.toISOString().slice(0, 10)
}

function maxIsoDate(first: string, second: string) {
  return first >= second ? first : second
}

function buildRecurringDates(startDate: string, endDate: string | null) {
  const dates: string[] = []
  let cursor = startDate

  while (dates.length < 12) {
    if (endDate && cursor > endDate) {
      break
    }

    dates.push(cursor)
    cursor = addMonthsKeepingDay(startDate, dates.length)
  }

  return dates
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
    recurrence_rule_id: source?.recurrence_rule_id ?? null,
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
          recurrence_rule_id,
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

    return mapped
  }

  async function createRecurringTransaction(payload: CreateSingleTransactionPayload) {
    const userId = getUserId()
    const startDate = payload.recurring_start_date

    if (!startDate) {
      throw new Error('Recurring start date is required.')
    }

    const noEndDate = payload.recurring_no_end_date ?? true
    const endDate = noEndDate ? null : (payload.recurring_end_date ?? null)

    if (!noEndDate && !endDate) {
      throw new Error('Recurring end date is required when no end date is disabled.')
    }

    if (endDate && endDate < startDate) {
      throw new Error('Recurring end date must be greater than or equal to start date.')
    }

    const recurringDates = buildRecurringDates(startDate, endDate)
    if (!recurringDates.length) {
      throw new Error('No recurring instances generated with the selected date range.')
    }

    const { data: recurrenceRule, error: recurrenceRuleError } = await supabase
      .from('recurrence_rules')
      .insert({
        user_id: userId,
        frequency: 'monthly',
        interval_count: 1,
        start_date: startDate,
        end_date: endDate,
        edit_scope_default: 'series',
        is_active: true
      })
      .select('id')
      .single()

    if (recurrenceRuleError) {
      throw recurrenceRuleError
    }

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: payload.type,
        origin_type: 'recurring',
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
        recurrence_rule_id: recurrenceRule.id
      })
      .select('id')
      .single()

    if (transactionError) {
      throw transactionError
    }

    const instances = recurringDates.map((instanceDate, index) => ({
      user_id: userId,
      recurrence_rule_id: recurrenceRule.id,
      source_transaction_id: transactionData.id,
      instance_date: instanceDate,
      expected_value: payload.expected_value,
      real_value: index === 0 ? (payload.real_value ?? null) : null,
      is_checked: false,
      checked_at: null,
      status: payload.status ?? 'pending',
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

  async function createSingleTransaction(payload: CreateSingleTransactionPayload) {
    if (payload.origin_type === 'recurring') {
      await createRecurringTransaction(payload)
      return
    }

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

  async function getRecurringContext(sourceTransactionId: string) {
    const { data: sourceTransaction, error: sourceTransactionError } = await supabase
      .from('transactions')
      .select('id, recurrence_rule_id, user_id')
      .eq('id', sourceTransactionId)
      .single<RecurringSourceRecord>()

    if (sourceTransactionError) {
      throw sourceTransactionError
    }

    if (!sourceTransaction.recurrence_rule_id) {
      throw new Error('Recurring source transaction is not linked to a recurrence rule.')
    }

    const { data: recurrenceRule, error: recurrenceRuleError } = await supabase
      .from('recurrence_rules')
      .select('id, start_date, end_date, is_active')
      .eq('id', sourceTransaction.recurrence_rule_id)
      .single<RecurrenceRuleRecord>()

    if (recurrenceRuleError) {
      throw recurrenceRuleError
    }

    return {
      sourceTransaction,
      recurrenceRule
    }
  }

  async function updateRecurringTransaction(
    item: TransactionInstanceItem,
    payload: UpdateTransactionInstancePayload,
    scope: RecurringScope
  ) {
    if (scope === 'single') {
      await updateTransactionInstance(item.id, payload, item.source_transaction_id, item.origin_type)
      return
    }

    if (!item.source_transaction_id) {
      throw new Error('Recurring source transaction is required.')
    }

    const { sourceTransaction, recurrenceRule } = await getRecurringContext(item.source_transaction_id)
    const checkedAt = deriveCheckedAt(payload.is_checked)
    const normalizedDescription = normalizeOptionalText(payload.description)
    const normalizedPersonId = normalizeOptionalId(payload.person_id)
    const normalizedCardId = normalizeOptionalId(payload.card_id)
    const normalizedAccountId = normalizeOptionalId(payload.account_id)
    const normalizedCategoryId = normalizeOptionalId(payload.category_id)
    const today = getTodayIsoDate()

    if (scope === 'future') {
      const splitDate = maxIsoDate(item.instance_date, today)
      const nextEndDate =
        payload.recurring_no_end_date === true
          ? null
          : (payload.recurring_end_date ?? recurrenceRule.end_date)

      if (nextEndDate && nextEndDate < splitDate) {
        throw new Error('Recurring end date must be greater than or equal to split date.')
      }

      const { data: newRule, error: newRuleError } = await supabase
        .from('recurrence_rules')
        .insert({
          user_id: sourceTransaction.user_id,
          frequency: 'monthly',
          interval_count: 1,
          start_date: splitDate,
          end_date: nextEndDate,
          edit_scope_default: 'series',
          is_active: true
        })
        .select('id')
        .single()

      if (newRuleError) {
        throw newRuleError
      }

      const { data: newSourceTransaction, error: newSourceTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: sourceTransaction.user_id,
          type: payload.type,
          origin_type: 'recurring',
          title: payload.title.trim(),
          description: normalizedDescription,
          expected_value: payload.expected_value,
          real_value: null,
          due_date: splitDate,
          is_checked: false,
          checked_at: null,
          person_id: normalizedPersonId,
          card_id: normalizedCardId,
          account_id: normalizedAccountId,
          category_id: normalizedCategoryId,
          recurrence_rule_id: newRule.id
        })
        .select('id')
        .single()

      if (newSourceTransactionError) {
        throw newSourceTransactionError
      }

      const previousEndDate = shiftDays(splitDate, -1)
      const cappedPreviousEndDate = previousEndDate < recurrenceRule.start_date
        ? recurrenceRule.start_date
        : previousEndDate

      const { error: oldRuleUpdateError } = await supabase
        .from('recurrence_rules')
        .update({
          end_date: cappedPreviousEndDate
        })
        .eq('id', recurrenceRule.id)

      if (oldRuleUpdateError) {
        throw oldRuleUpdateError
      }

      const { error: futureInstancesError } = await supabase
        .from('transaction_instances')
        .update({
          recurrence_rule_id: newRule.id,
          source_transaction_id: newSourceTransaction.id,
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
        .eq('recurrence_rule_id', recurrenceRule.id)
        .gte('instance_date', splitDate)

      if (futureInstancesError) {
        throw futureInstancesError
      }

      return
    }

    const applyFromDate = maxIsoDate(item.instance_date, today)
    const nextEndDate =
      payload.recurring_no_end_date === true
        ? null
        : (payload.recurring_end_date ?? recurrenceRule.end_date)

    if (nextEndDate && nextEndDate < recurrenceRule.start_date) {
      throw new Error('Recurring end date must be greater than or equal to rule start date.')
    }

    const { error: recurrenceRuleError } = await supabase
      .from('recurrence_rules')
      .update({
        end_date: nextEndDate,
        is_active: true
      })
      .eq('id', recurrenceRule.id)

    if (recurrenceRuleError) {
      throw recurrenceRuleError
    }

    const { error: sourceTransactionError } = await supabase
      .from('transactions')
      .update({
        type: payload.type,
        title: payload.title.trim(),
        description: normalizedDescription,
        expected_value: payload.expected_value,
        person_id: normalizedPersonId,
        card_id: normalizedCardId,
        account_id: normalizedAccountId,
        category_id: normalizedCategoryId
      })
      .eq('id', sourceTransaction.id)

    if (sourceTransactionError) {
      throw sourceTransactionError
    }

    const { error: seriesInstancesError } = await supabase
      .from('transaction_instances')
      .update({
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
      .eq('recurrence_rule_id', recurrenceRule.id)
      .gte('instance_date', applyFromDate)

    if (seriesInstancesError) {
      throw seriesInstancesError
    }
  }

  async function cancelRecurringTransaction(item: TransactionInstanceItem, scope: RecurringScope) {
    if (scope === 'single') {
      await setStatus(item, 'canceled')
      return
    }

    if (!item.source_transaction_id) {
      throw new Error('Recurring source transaction is required.')
    }

    const { recurrenceRule } = await getRecurringContext(item.source_transaction_id)
    const today = getTodayIsoDate()
    const fromDate = scope === 'future'
      ? maxIsoDate(item.instance_date, today)
      : today

    if (scope === 'series') {
      const { error: disableRuleError } = await supabase
        .from('recurrence_rules')
        .update({
          is_active: false
        })
        .eq('id', recurrenceRule.id)

      if (disableRuleError) {
        throw disableRuleError
      }
    }

    const { error: cancelError } = await supabase
      .from('transaction_instances')
      .update({
        status: 'canceled'
      })
      .eq('recurrence_rule_id', recurrenceRule.id)
      .gte('instance_date', fromDate)

    if (cancelError) {
      throw cancelError
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
    cancelRecurringTransaction,
    createSingleTransaction,
    createTransaction: createSingleTransaction,
    listFilterOptions,
    listManualInstances,
    updateRecurringTransaction,
    setChecked,
    setStatus,
    updateTransactionInstance
  }
}