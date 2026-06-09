import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_ORIGIN_TYPES = ['single', 'installment', 'recurring'] as const
export type TransactionOriginType = (typeof TRANSACTION_ORIGIN_TYPES)[number]

export const RECURRING_SCOPE = ['single', 'future', 'series'] as const
export type RecurringScope = (typeof RECURRING_SCOPE)[number]

export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]

export const RECURRING_END_MODES = ['no_end', 'count', 'end_date'] as const
export type RecurringEndMode = (typeof RECURRING_END_MODES)[number]

export const DELETE_RECURRING_SCOPE = ['single', 'future'] as const
export type DeleteRecurringScope = (typeof DELETE_RECURRING_SCOPE)[number]

export const TRANSACTION_STATUS = ['pending', 'paid', 'skipped', 'canceled'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number]

export const REIMBURSEMENT_ROLES = ['original', 'reimbursement'] as const
export type ReimbursementRole = (typeof REIMBURSEMENT_ROLES)[number]

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
  reimbursement_group_id: string | null
  reimbursement_role: ReimbursementRole | null
  recurrence_rule: {
    frequency: RecurringFrequency
    interval_count: number
    start_date: string
    end_date: string | null
    occurrences_limit: number | null
  } | null
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
  recurring_frequency: RecurringFrequency | null
  recurring_interval_count: number | null
  recurring_start_date: string | null
  recurring_end_date: string | null
  recurring_occurrences_limit: number | null
  reimbursement_group_id: string | null
  reimbursement_role: ReimbursementRole | null
}

export interface LinkedReimbursementPayload {
  enabled: boolean
  person_id?: string | null
  account_id?: string | null
  category_id?: string | null
  description?: string | null
  expected_value?: number
  received_date?: string | null
}

export interface TransactionFilters {
  month?: number
  year?: number
  from_date?: string
  to_date?: string
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
  recurring_end_mode?: RecurringEndMode
  recurring_occurrences_count?: number | null
  recurring_end_date?: string | null
  recurring_no_end_date?: boolean
  recurring_frequency?: RecurringFrequency
  recurring_occurrences_limit?: number | null
  person_id?: string | null
  account_id?: string | null
  card_id?: string | null
  category_id?: string | null
  description?: string | null
  status?: TransactionStatus
  is_checked?: boolean
  reimbursement?: LinkedReimbursementPayload | null
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
  recurring_end_mode?: RecurringEndMode
  recurring_occurrences_count?: number | null
  recurring_end_date?: string | null
  recurring_no_end_date?: boolean
}

export interface RecurringConfiguration {
  start_date: string
  frequency: RecurringFrequency
  end_mode: RecurringEndMode
  end_date: string | null
  occurrences_count: number | null
}

interface RecurrenceRuleRecord {
  id: string
  frequency: RecurringFrequency
  interval_count: number
  start_date: string
  end_date: string | null
  occurrences_limit: number | null
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

function normalizeOptionalDate(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

interface NormalizedReimbursementPayload {
  description: string
  expectedValue: number
  personId: string | null
  accountId: string | null
  categoryId: string
  receivedDate: string | null
}

async function assertIncomeCategory(
  supabase: ReturnType<typeof useSupabaseClient>,
  userId: string,
  categoryId: string
) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, type')
    .eq('user_id', userId)
    .eq('id', categoryId)
    .single<{ id: string, type: 'income' | 'expense' }>()

  if (error || !data) {
    throw new Error('Categoria da entrada vinculada invalida.')
  }

  if (data.type !== 'income') {
    throw new Error('A categoria da entrada vinculada deve ser do tipo receita.')
  }
}

async function resolveReimbursementPayload(
  supabase: ReturnType<typeof useSupabaseClient>,
  userId: string,
  payload: CreateSingleTransactionPayload
) {
  if (payload.type !== 'expense') {
    return null
  }

  if (!payload.reimbursement?.enabled) {
    return null
  }

  const categoryId = normalizeOptionalId(payload.reimbursement.category_id)

  if (!categoryId) {
    throw new Error('Categoria da entrada vinculada obrigatoria.')
  }

  await assertIncomeCategory(supabase, userId, categoryId)

  const expectedValue = payload.reimbursement.expected_value ?? payload.expected_value

  if (!Number.isFinite(expectedValue) || expectedValue <= 0) {
    throw new Error('Valor da entrada vinculada deve ser maior que zero.')
  }

  const fallbackDescription = `Reembolso - ${payload.title.trim()}`

  return {
    description: normalizeOptionalText(payload.reimbursement.description) ?? fallbackDescription,
    expectedValue,
    personId: normalizeOptionalId(payload.reimbursement.person_id),
    accountId: normalizeOptionalId(payload.reimbursement.account_id),
    categoryId,
    receivedDate: normalizeOptionalDate(payload.reimbursement.received_date)
  } satisfies NormalizedReimbursementPayload
}

function getMonthRange(filters: TransactionFilters) {
  if (filters.from_date && filters.to_date) {
    return {
      from: filters.from_date,
      to: shiftDays(filters.to_date, 1)
    }
  }

  if (filters.month == null || filters.year == null) {
    return null
  }

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

function addRecurringInterval(dateText: string, frequency: RecurringFrequency, step: number) {
  if (frequency === 'daily') {
    return shiftDays(dateText, step)
  }

  if (frequency === 'weekly') {
    return shiftDays(dateText, step * 7)
  }

  if (frequency === 'yearly') {
    return addMonthsKeepingDay(dateText, step * 12)
  }

  return addMonthsKeepingDay(dateText, step)
}

function deriveRecurringEndMode(endDate: string | null, occurrencesLimit: number | null): RecurringEndMode {
  if (occurrencesLimit != null) {
    return 'count'
  }

  if (endDate) {
    return 'end_date'
  }

  return 'no_end'
}

function parseRecurringOccurrencesCount(value?: number | null) {
  if (value == null) {
    return null
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('A quantidade de recorrências deve ser um número inteiro maior ou igual a 1.')
  }

  return value
}

function buildRecurringDates(startDate: string, frequency: RecurringFrequency, endDate: string | null, occurrencesLimit?: number | null) {
  const dates: string[] = []
  const safeOccurrencesLimit = occurrencesLimit ?? null
  const isOpenEnded = !endDate && !safeOccurrencesLimit

  if (safeOccurrencesLimit && safeOccurrencesLimit < 1) {
    return dates
  }

  while (true) {
    if (isOpenEnded && dates.length >= 12) {
      break
    }

    const cursor = addRecurringInterval(startDate, frequency, dates.length)

    if (endDate && cursor > endDate) {
      break
    }

    if (safeOccurrencesLimit && dates.length >= safeOccurrencesLimit) {
      break
    }

    dates.push(cursor)
  }

  return dates
}

export function buildRecurringSchedule(
  startDate: string,
  frequency: RecurringFrequency,
  endMode: RecurringEndMode,
  endDate?: string | null,
  occurrencesCount?: number | null
) {
  if (!startDate) {
    throw new Error('A data inicial da recorrência é obrigatória.')
  }

  if (endMode === 'end_date') {
    const normalizedEndDate = endDate ?? null

    if (!normalizedEndDate) {
      throw new Error('A data final da recorrência é obrigatória quando o modo Data final estiver selecionado.')
    }

    if (normalizedEndDate < startDate) {
      throw new Error('A data final da recorrência deve ser maior ou igual à data inicial.')
    }

    return {
      endMode,
      dates: buildRecurringDates(startDate, frequency, normalizedEndDate, null),
      ruleEndDate: normalizedEndDate,
      ruleOccurrencesLimit: null
    }
  }

  if (endMode === 'count') {
    const normalizedCount = parseRecurringOccurrencesCount(occurrencesCount)
    const dates = buildRecurringDates(startDate, frequency, null, normalizedCount)

    return {
      endMode,
      dates,
      ruleEndDate: dates[dates.length - 1] ?? startDate,
      ruleOccurrencesLimit: normalizedCount
    }
  }

  return {
    endMode,
    dates: buildRecurringDates(startDate, frequency, null, null),
    ruleEndDate: null,
    ruleOccurrencesLimit: null
  }
}

function buildRecurringInstances(
  userId: string,
  recurrenceRuleId: string,
  sourceTransactionId: string,
  dates: string[],
  payload: {
    expectedValue: number
    status: TransactionStatus
    personId?: string | null
    cardId?: string | null
    accountId?: string | null
    categoryId?: string | null
    reimbursementGroupId?: string | null
    reimbursementRole?: ReimbursementRole | null
  }
) {
  return dates.map(instanceDate => ({
    user_id: userId,
    recurrence_rule_id: recurrenceRuleId,
    source_transaction_id: sourceTransactionId,
    instance_date: instanceDate,
    expected_value: payload.expectedValue,
    real_value: payload.expectedValue,
    is_checked: false,
    checked_at: null,
    status: payload.status,
    person_id: normalizeOptionalId(payload.personId),
    card_id: normalizeOptionalId(payload.cardId),
    account_id: normalizeOptionalId(payload.accountId),
    category_id: normalizeOptionalId(payload.categoryId),
    reimbursement_group_id: payload.reimbursementGroupId ?? null,
    reimbursement_role: payload.reimbursementRole ?? null
  }))
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
    title: source?.title ?? 'Lancamento sem titulo',
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
    installment_total: installmentTotal,
    recurring_frequency: source?.recurrence_rule?.frequency ?? null,
    recurring_interval_count: source?.recurrence_rule?.interval_count ?? null,
    recurring_start_date: source?.recurrence_rule?.start_date ?? null,
    recurring_end_date: source?.recurrence_rule?.end_date ?? null,
    recurring_occurrences_limit: source?.recurrence_rule?.occurrences_limit ?? null,
    reimbursement_group_id: source?.reimbursement_group_id ?? null,
    reimbursement_role: source?.reimbursement_role ?? null
  }
}

export function useTransactions() {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  const masterData = useMasterData()

  async function ensureAuthenticatedUserId() {
    const fromSession = session.value?.user?.id

    if (fromSession) {
      return fromSession
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      throw new Error(sessionError.message || 'Sessao invalida para operacoes de lancamentos. Faca login novamente.')
    }

    if (sessionData.session?.user?.id) {
      return sessionData.session.user.id
    }

    const { data, error } = await supabase.auth.getUser()

    if (error) {
      throw new Error(error.message || 'Sessao invalida para operacoes de lancamentos. Faca login novamente.')
    }

    if (!data.user?.id) {
      throw new Error('Sessao expirada. Faca login novamente.')
    }

    return data.user.id
  }

  async function getUserId() {
    const userId = await ensureAuthenticatedUserId()

    if (!userId) {
      throw new Error('Sessao expirada. Faca login novamente.')
    }

    return userId
  }

  async function listManualInstances(filters: TransactionFilters) {
    await ensureAuthenticatedUserId()
    const monthRange = getMonthRange(filters)

    let query = supabase
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
          recurrence_rule:recurrence_rule_id (
            frequency,
            interval_count,
            start_date,
            end_date,
            occurrences_limit
          ),
          installment_group_id,
          installment_total,
          reimbursement_group_id,
          reimbursement_role
        )
      `)

    if (monthRange) {
      query = query
        .gte('instance_date', monthRange.from)
        .lt('instance_date', monthRange.to)
    }

    const { data, error } = await query
      .order('instance_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const mapped = ((data ?? []) as TransactionInstanceRecord[])
      .map(mapInstance)

    return mapped
  }

  async function createRecurringTransaction(payload: CreateSingleTransactionPayload) {
    const userId = await getUserId()
    const startDate = payload.recurring_start_date
    const frequency = payload.recurring_frequency ?? 'monthly'

    if (!startDate) {
      throw new Error('A data inicial da recorrencia e obrigatoria.')
    }

    const endMode = payload.recurring_end_mode
      ?? (payload.recurring_no_end_date === true ? 'no_end' : payload.recurring_occurrences_count != null || payload.recurring_occurrences_limit != null ? 'count' : 'end_date')
    const recurringSchedule = buildRecurringSchedule(
      startDate,
      frequency,
      endMode,
      payload.recurring_end_date ?? null,
      payload.recurring_occurrences_count ?? payload.recurring_occurrences_limit ?? null
    )

    if (!recurringSchedule.dates.length) {
      throw new Error('Nenhuma instancia recorrente foi gerada para o periodo informado.')
    }

    const reimbursementPayload = await resolveReimbursementPayload(supabase, userId, payload)
    const reimbursementGroupId = reimbursementPayload ? generateGroupId() : null

    const { data: recurrenceRule, error: recurrenceRuleError } = await supabase
      .from('recurrence_rules')
      .insert({
        user_id: userId,
        frequency,
        interval_count: 1,
        start_date: startDate,
        end_date: recurringSchedule.ruleEndDate,
        occurrences_limit: recurringSchedule.ruleOccurrencesLimit,
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
        real_value: payload.expected_value,
        due_date: startDate,
        is_checked: false,
        checked_at: null,
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id),
        recurrence_rule_id: recurrenceRule.id,
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: reimbursementGroupId ? 'original' : null
      })
      .select('id')
      .single()

    if (transactionError) {
      throw transactionError
    }

    const instances = buildRecurringInstances(
      userId,
      recurrenceRule.id,
      transactionData.id,
      recurringSchedule.dates,
      {
        expectedValue: payload.expected_value,
        status: payload.status ?? 'pending',
        personId: payload.person_id,
        cardId: payload.card_id,
        accountId: payload.account_id,
        categoryId: payload.category_id,
        reimbursementGroupId,
        reimbursementRole: reimbursementGroupId ? 'original' : null
      }
    )

    const { error: instanceError } = await supabase
      .from('transaction_instances')
      .insert(instances)

    if (instanceError) {
      throw instanceError
    }

    if (!reimbursementPayload || !reimbursementGroupId) {
      return
    }

    const reimbursementStartDate = reimbursementPayload.receivedDate ?? startDate
    const reimbursementSchedule = buildRecurringSchedule(
      reimbursementStartDate,
      frequency,
      endMode,
      payload.recurring_end_date ?? null,
      payload.recurring_occurrences_count ?? payload.recurring_occurrences_limit ?? null
    )

    if (!reimbursementSchedule.dates.length) {
      throw new Error('Nenhuma instancia de entrada vinculada foi gerada para o periodo informado.')
    }

    const { data: reimbursementRule, error: reimbursementRuleError } = await supabase
      .from('recurrence_rules')
      .insert({
        user_id: userId,
        frequency,
        interval_count: 1,
        start_date: reimbursementStartDate,
        end_date: reimbursementSchedule.ruleEndDate,
        occurrences_limit: reimbursementSchedule.ruleOccurrencesLimit,
        edit_scope_default: 'series',
        is_active: true
      })
      .select('id')
      .single()

    if (reimbursementRuleError) {
      throw reimbursementRuleError
    }

    const { data: reimbursementTransaction, error: reimbursementTransactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'income',
        origin_type: 'recurring',
        title: reimbursementPayload.description,
        description: null,
        expected_value: reimbursementPayload.expectedValue,
        real_value: reimbursementPayload.expectedValue,
        due_date: reimbursementStartDate,
        is_checked: false,
        checked_at: null,
        person_id: reimbursementPayload.personId,
        card_id: null,
        account_id: reimbursementPayload.accountId,
        category_id: reimbursementPayload.categoryId,
        recurrence_rule_id: reimbursementRule.id,
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: 'reimbursement'
      })
      .select('id')
      .single()

    if (reimbursementTransactionError) {
      throw reimbursementTransactionError
    }

    const reimbursementInstances = buildRecurringInstances(
      userId,
      reimbursementRule.id,
      reimbursementTransaction.id,
      reimbursementSchedule.dates,
      {
        expectedValue: reimbursementPayload.expectedValue,
        status: 'pending',
        personId: reimbursementPayload.personId,
        cardId: null,
        accountId: reimbursementPayload.accountId,
        categoryId: reimbursementPayload.categoryId,
        reimbursementGroupId,
        reimbursementRole: 'reimbursement'
      }
    )

    const { error: reimbursementInstancesError } = await supabase
      .from('transaction_instances')
      .insert(reimbursementInstances)

    if (reimbursementInstancesError) {
      throw reimbursementInstancesError
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

    const userId = await getUserId()
  const reimbursementPayload = await resolveReimbursementPayload(supabase, userId, payload)
  const reimbursementGroupId = reimbursementPayload ? generateGroupId() : null
    const isChecked = false
    const checkedAt = null

    if (!payload.due_date || !payload.instance_date) {
      throw new Error('Vencimento e data do lancamento sao obrigatorios para lancamentos unicos.')
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
        real_value: payload.expected_value,
        due_date: payload.due_date,
        is_checked: isChecked,
        checked_at: checkedAt,
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id),
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: reimbursementGroupId ? 'original' : null
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
        real_value: payload.expected_value,
        is_checked: isChecked,
        checked_at: checkedAt,
        status: payload.status ?? 'pending',
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id),
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: reimbursementGroupId ? 'original' : null
      })

    if (instanceError) {
      throw instanceError
    }

    if (!reimbursementPayload || !reimbursementGroupId) {
      return
    }

    const reimbursementDueDate = reimbursementPayload.receivedDate ?? payload.due_date
    const reimbursementInstanceDate = reimbursementPayload.receivedDate ?? payload.instance_date

    const { data: reimbursementTransaction, error: reimbursementTransactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'income',
        origin_type: 'single',
        title: reimbursementPayload.description,
        description: null,
        expected_value: reimbursementPayload.expectedValue,
        real_value: reimbursementPayload.expectedValue,
        due_date: reimbursementDueDate,
        is_checked: false,
        checked_at: null,
        person_id: reimbursementPayload.personId,
        card_id: null,
        account_id: reimbursementPayload.accountId,
        category_id: reimbursementPayload.categoryId,
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: 'reimbursement'
      })
      .select('id')
      .single()

    if (reimbursementTransactionError) {
      throw reimbursementTransactionError
    }

    const { error: reimbursementInstanceError } = await supabase
      .from('transaction_instances')
      .insert({
        user_id: userId,
        source_transaction_id: reimbursementTransaction.id,
        instance_date: reimbursementInstanceDate,
        expected_value: reimbursementPayload.expectedValue,
        real_value: reimbursementPayload.expectedValue,
        is_checked: false,
        checked_at: null,
        status: 'pending',
        person_id: reimbursementPayload.personId,
        card_id: null,
        account_id: reimbursementPayload.accountId,
        category_id: reimbursementPayload.categoryId,
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: 'reimbursement'
      })

    if (reimbursementInstanceError) {
      throw reimbursementInstanceError
    }
  }

  async function createInstallmentTransaction(payload: CreateSingleTransactionPayload) {
    const userId = await getUserId()
    const reimbursementPayload = await resolveReimbursementPayload(supabase, userId, payload)
    const reimbursementGroupId = reimbursementPayload ? generateGroupId() : null
    const installmentTotal = payload.installment_total ?? 0
    const startDate = payload.installment_start_date

    if (!startDate) {
      throw new Error('A data inicial do parcelamento e obrigatoria.')
    }

    if (installmentTotal < 2) {
      throw new Error('A quantidade de parcelas deve ser no minimo 2.')
    }

    if (!normalizeOptionalId(payload.card_id)) {
      throw new Error('Cartao e obrigatorio para lancamentos parcelados.')
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
        real_value: payload.expected_value,
        due_date: startDate,
        is_checked: false,
        checked_at: null,
        person_id: normalizeOptionalId(payload.person_id),
        card_id: normalizeOptionalId(payload.card_id),
        account_id: normalizeOptionalId(payload.account_id),
        category_id: normalizeOptionalId(payload.category_id),
        installment_group_id: groupId,
        installment_number: 1,
        installment_total: installmentTotal,
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: reimbursementGroupId ? 'original' : null
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
      real_value: parcelValue,
      is_checked: false,
      checked_at: null,
      status: 'pending' as const,
      person_id: normalizeOptionalId(payload.person_id),
      card_id: normalizeOptionalId(payload.card_id),
      account_id: normalizeOptionalId(payload.account_id),
      category_id: normalizeOptionalId(payload.category_id),
      reimbursement_group_id: reimbursementGroupId,
      reimbursement_role: reimbursementGroupId ? 'original' : null
    }))

    const { error: instanceError } = await supabase
      .from('transaction_instances')
      .insert(instances)

    if (instanceError) {
      throw instanceError
    }

    if (!reimbursementPayload || !reimbursementGroupId) {
      return
    }

    const reimbursementStartDate = reimbursementPayload.receivedDate ?? startDate
    const reimbursementGroupSeed = generateGroupId()
    const reimbursementValues = splitInstallmentValues(reimbursementPayload.expectedValue, installmentTotal)

    const { data: reimbursementTransaction, error: reimbursementTransactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'income',
        origin_type: 'installment',
        title: reimbursementPayload.description,
        description: null,
        expected_value: reimbursementPayload.expectedValue,
        real_value: reimbursementPayload.expectedValue,
        due_date: reimbursementStartDate,
        is_checked: false,
        checked_at: null,
        person_id: reimbursementPayload.personId,
        card_id: null,
        account_id: reimbursementPayload.accountId,
        category_id: reimbursementPayload.categoryId,
        installment_group_id: reimbursementGroupSeed,
        installment_number: 1,
        installment_total: installmentTotal,
        reimbursement_group_id: reimbursementGroupId,
        reimbursement_role: 'reimbursement'
      })
      .select('id')
      .single()

    if (reimbursementTransactionError) {
      throw reimbursementTransactionError
    }

    const reimbursementInstances = reimbursementValues.map((parcelValue, index) => ({
      user_id: userId,
      source_transaction_id: reimbursementTransaction.id,
      instance_date: addMonthsKeepingDay(reimbursementStartDate, index),
      expected_value: parcelValue,
      real_value: parcelValue,
      is_checked: false,
      checked_at: null,
      status: 'pending' as const,
      person_id: reimbursementPayload.personId,
      card_id: null,
      account_id: reimbursementPayload.accountId,
      category_id: reimbursementPayload.categoryId,
      reimbursement_group_id: reimbursementGroupId,
      reimbursement_role: 'reimbursement'
    }))

    const { error: reimbursementInstancesError } = await supabase
      .from('transaction_instances')
      .insert(reimbursementInstances)

    if (reimbursementInstancesError) {
      throw reimbursementInstancesError
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
      throw new Error('O lancamento recorrente nao possui regra de recorrencia vinculada.')
    }

    const { data: recurrenceRule, error: recurrenceRuleError } = await supabase
      .from('recurrence_rules')
      .select('id, frequency, interval_count, start_date, end_date, occurrences_limit, is_active')
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

  async function getRecurringConfiguration(sourceTransactionId: string) {
    const { recurrenceRule } = await getRecurringContext(sourceTransactionId)

    return {
      start_date: recurrenceRule.start_date,
      frequency: recurrenceRule.frequency,
      end_mode: deriveRecurringEndMode(recurrenceRule.end_date, recurrenceRule.occurrences_limit),
      end_date: recurrenceRule.end_date,
      occurrences_count: recurrenceRule.occurrences_limit
    } satisfies RecurringConfiguration
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
      throw new Error('Lancamento de origem recorrente obrigatorio.')
    }

    const { sourceTransaction, recurrenceRule } = await getRecurringContext(item.source_transaction_id)
    const checkedAt = deriveCheckedAt(payload.is_checked)
    const normalizedDescription = normalizeOptionalText(payload.description)
    const normalizedPersonId = normalizeOptionalId(payload.person_id)
    const normalizedCardId = normalizeOptionalId(payload.card_id)
    const normalizedAccountId = normalizeOptionalId(payload.account_id)
    const normalizedCategoryId = normalizeOptionalId(payload.category_id)

    const applyFromDate = item.instance_date

    const { data: futureInstanceRows, error: futureInstancesQueryError } = await supabase
      .from('transaction_instances')
      .select('instance_date')
      .eq('recurrence_rule_id', recurrenceRule.id)
      .gte('instance_date', applyFromDate)
      .order('instance_date', { ascending: true })

    if (futureInstancesQueryError) {
      throw futureInstancesQueryError
    }

    const futureDates = (futureInstanceRows ?? []).map(row => row.instance_date)

    const { error: sourceTransactionError } = await supabase
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
      .eq('id', sourceTransaction.id)

    if (sourceTransactionError) {
      throw sourceTransactionError
    }

    const { error: deleteSeriesInstancesError } = await supabase
      .from('transaction_instances')
      .delete()
      .eq('recurrence_rule_id', recurrenceRule.id)
      .gte('instance_date', applyFromDate)

    if (deleteSeriesInstancesError) {
      throw deleteSeriesInstancesError
    }

    const futureInstances = buildRecurringInstances(
      sourceTransaction.user_id,
      recurrenceRule.id,
      sourceTransaction.id,
      futureDates,
      {
        expectedValue: payload.expected_value,
        status: payload.status,
        personId: normalizedPersonId,
        cardId: normalizedCardId,
        accountId: normalizedAccountId,
        categoryId: normalizedCategoryId,
        reimbursementGroupId: item.reimbursement_group_id,
        reimbursementRole: item.reimbursement_role
      }
    )

    const { error: futureInstancesError } = await supabase
      .from('transaction_instances')
      .insert(futureInstances)

    if (futureInstancesError) {
      throw futureInstancesError
    }
  }

  async function updateInstallmentTransaction(
    item: TransactionInstanceItem,
    payload: UpdateTransactionInstancePayload,
    scope: DeleteRecurringScope = 'single'
  ) {
    if (!item.source_transaction_id) {
      throw new Error('Lancamento de origem parcelada obrigatorio.')
    }

    const checkedAt = deriveCheckedAt(payload.is_checked)
    const normalizedDescription = normalizeOptionalText(payload.description)
    const normalizedPersonId = normalizeOptionalId(payload.person_id)
    const normalizedCardId = normalizeOptionalId(payload.card_id)
    const normalizedAccountId = normalizeOptionalId(payload.account_id)
    const normalizedCategoryId = normalizeOptionalId(payload.category_id)

    const targetInstances = supabase
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
      .eq('source_transaction_id', item.source_transaction_id)

    const { error: instanceError } = scope === 'future'
      ? await targetInstances.gte('instance_date', item.instance_date)
      : await targetInstances.eq('id', item.id)

    if (instanceError) {
      throw instanceError
    }

    const { error: sourceTransactionError } = await supabase
      .from('transactions')
      .update({
        type: payload.type,
        title: payload.title.trim(),
        description: normalizedDescription,
        person_id: normalizedPersonId,
        card_id: normalizedCardId,
        account_id: normalizedAccountId,
        category_id: normalizedCategoryId
      })
      .eq('id', item.source_transaction_id)

    if (sourceTransactionError) {
      throw sourceTransactionError
    }
  }

  async function cancelRecurringTransaction(item: TransactionInstanceItem, scope: RecurringScope) {
    if (scope === 'single') {
      await setStatus(item, 'canceled')
      return
    }

    if (!item.source_transaction_id) {
      throw new Error('Lancamento de origem recorrente obrigatorio.')
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

  async function cleanupSourceTransactionIfNoInstances(sourceTransactionId: string | null | undefined) {
    if (!sourceTransactionId) {
      return
    }

    const { count, error: remainingCountError } = await supabase
      .from('transaction_instances')
      .select('id', { head: true, count: 'exact' })
      .eq('source_transaction_id', sourceTransactionId)

    if (remainingCountError) {
      throw remainingCountError
    }

    if ((count ?? 0) > 0) {
      return
    }

    const { data: sourceTransaction, error: sourceTransactionError } = await supabase
      .from('transactions')
      .select('id, recurrence_rule_id')
      .eq('id', sourceTransactionId)
      .maybeSingle<{ id: string, recurrence_rule_id: string | null }>()

    if (sourceTransactionError) {
      throw sourceTransactionError
    }

    if (!sourceTransaction) {
      return
    }

    const { error: deleteSourceError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', sourceTransaction.id)

    if (deleteSourceError) {
      throw deleteSourceError
    }

    if (!sourceTransaction.recurrence_rule_id) {
      return
    }

    const { count: remainingRecurringSources, error: remainingRecurringSourcesError } = await supabase
      .from('transactions')
      .select('id', { head: true, count: 'exact' })
      .eq('recurrence_rule_id', sourceTransaction.recurrence_rule_id)

    if (remainingRecurringSourcesError) {
      throw remainingRecurringSourcesError
    }

    if ((remainingRecurringSources ?? 0) > 0) {
      return
    }

    const { count: remainingRecurringInstances, error: remainingRecurringInstancesError } = await supabase
      .from('transaction_instances')
      .select('id', { head: true, count: 'exact' })
      .eq('recurrence_rule_id', sourceTransaction.recurrence_rule_id)

    if (remainingRecurringInstancesError) {
      throw remainingRecurringInstancesError
    }

    if ((remainingRecurringInstances ?? 0) > 0) {
      return
    }

    const { error: deleteRuleError } = await supabase
      .from('recurrence_rules')
      .delete()
      .eq('id', sourceTransaction.recurrence_rule_id)

    if (deleteRuleError) {
      throw deleteRuleError
    }
  }

  async function deleteTransactionInstance(item: TransactionInstanceItem, scope: DeleteRecurringScope = 'single') {
    if (item.origin_type === 'recurring' && scope === 'future') {
      if (!item.source_transaction_id) {
        throw new Error('Lancamento de origem recorrente obrigatorio para deletar futuras instancias.')
      }

      const { recurrenceRule } = await getRecurringContext(item.source_transaction_id)
      const fromDate = item.instance_date

      const { error: deleteFutureError } = await supabase
        .from('transaction_instances')
        .delete()
        .eq('recurrence_rule_id', recurrenceRule.id)
        .gte('instance_date', fromDate)

      if (deleteFutureError) {
        throw deleteFutureError
      }

      await cleanupSourceTransactionIfNoInstances(item.source_transaction_id)
      return
    }

    if (item.origin_type === 'installment' && scope === 'future') {
      if (!item.source_transaction_id) {
        throw new Error('Lancamento de origem parcelada obrigatorio para deletar futuras instancias.')
      }

      const { error: deleteFutureError } = await supabase
        .from('transaction_instances')
        .delete()
        .eq('source_transaction_id', item.source_transaction_id)
        .gte('instance_date', item.instance_date)

      if (deleteFutureError) {
        throw deleteFutureError
      }

      await cleanupSourceTransactionIfNoInstances(item.source_transaction_id)
      return
    }

    const { error: deleteInstanceError } = await supabase
      .from('transaction_instances')
      .delete()
      .eq('id', item.id)

    if (deleteInstanceError) {
      throw deleteInstanceError
    }

    await cleanupSourceTransactionIfNoInstances(item.source_transaction_id)
  }

  return {
    cancelRecurringTransaction,
    createSingleTransaction,
    createTransaction: createSingleTransaction,
    deleteTransactionInstance,
    getRecurringConfiguration,
    listFilterOptions,
    listManualInstances,
    updateInstallmentTransaction,
    updateRecurringTransaction,
    setChecked,
    setStatus,
    updateTransactionInstance
  }
}