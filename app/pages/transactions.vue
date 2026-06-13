<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import {
  type DeleteRecurringScope,
  type RecurringEndMode,
  type RecurringFrequency,
  TRANSACTION_STATUS,
  type RecurringScope,
  type TransactionOriginType,
  type TransactionInstanceItem,
  type TransactionStatus,
  type TransactionType
} from '~/composables/useTransactions'
import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'
import { formatBRLOrDash } from '~/utils/currency'

definePageMeta({ middleware: 'auth' })

const {
  cancelInstallmentTransaction,
  cancelRecurringTransaction,
  createTransaction,
  deleteTransactionInstance: removeTransactionInstance,
  getRecurringConfiguration,
  listFilterOptions,
  listManualInstances,
  setChecked,
  setStatus,
  updateInstallmentTransaction,
  updateRecurringTransaction,
  updateTransactionInstance
} = useTransactions()

const loading = ref(false)
const saving = ref(false)
const exportingPdf = ref(false)
const exportingImage = ref(false)
const scopeModalSaving = ref(false)
const rowActionBusy = ref(false)
const FILTERS_STORAGE_KEY = 'pwrdevs.finance.transactions.filters'
type QuickPaymentFilter = 'all' | 'account' | 'cards' | `card:${string}`
const pageError = ref('')
const modalError = ref('')
const scopeModalError = ref('')
const filtersModalError = ref('')
const hasPersistedFilters = ref(false)
const skipSearchPersistence = ref(false)

const monthYear = ref(new Date().toISOString().slice(0, 7))
const periodFilter = ref<string | 'all'>(monthYear.value)
const cardFilter = ref('all')
const personFilter = ref('all')
const categoryFilter = ref('all')
const accountFilter = ref('all')
const quickPaymentFilter = ref<QuickPaymentFilter>('all')
const quickTypeFilter = ref<'all' | TransactionType>('all')
const statusFilter = ref<'all' | TransactionStatus>('all')
const reimbursementLinkFilter = ref<'all' | 'normal' | 'linked'>('all')
const searchDescription = ref('')
const isFiltersModalOpen = ref(false)
const draftMonthYear = ref(monthYear.value)
const draftCardFilter = ref(cardFilter.value)
const draftPersonFilter = ref(personFilter.value)
const draftCategoryFilter = ref(categoryFilter.value)
const draftAccountFilter = ref(accountFilter.value)
const draftStatusFilter = ref<'all' | TransactionStatus>(statusFilter.value)
const draftReimbursementLinkFilter = ref<'all' | 'normal' | 'linked'>(reimbursementLinkFilter.value)
const { month: initialDraftMonth, year: initialDraftYear } = parseMonthYear(monthYear.value)
const draftFilterMonth = ref(String(initialDraftMonth).padStart(2, '0'))
const draftFilterYear = ref(String(initialDraftYear))
const draftAllPeriods = ref(false)
const route = useRoute()
const router = useRouter()

const rows = ref<TransactionInstanceItem[]>([])
const people = ref<PersonItem[]>([])
const accounts = ref<AccountItem[]>([])
const cards = ref<CardItem[]>([])
const categories = ref<CategoryItem[]>([])

const realValueDrafts = ref<Record<string, string>>({})

const isModalOpen = ref(false)
const isExportPreviewOpen = ref(false)
const isScopeModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const exportPreviewRef = ref<HTMLElement | null>(null)
const editingRow = ref<TransactionInstanceItem | null>(null)
const scopeTargetRow = ref<TransactionInstanceItem | null>(null)
const pendingDeleteRow = ref<TransactionInstanceItem | null>(null)
const scopeModalMode = ref<'edit' | 'cancel' | 'delete' | null>(null)

const formTitle = ref('')
const formOriginType = ref<TransactionOriginType>('single')
const formExpectedValue = ref('')
const formRealValue = ref('')
const formPurchaseDate = ref('')
const formInstallmentTotal = ref('2')
const formRecurringStartDate = ref('')
const formRecurringEndDate = ref('')
const formRecurringFrequency = ref<RecurringFrequency>('monthly')
const formRecurringEndingMode = ref<RecurringEndMode>('count')
const formRecurringOccurrences = ref('12')
const formPersonId = ref('')
const formPaymentMethod = ref('')
const formCategoryId = ref('')
const formDescription = ref('')
const formGenerateReimbursement = ref(false)
const formReimbursementPersonId = ref('')
const formReimbursementAccountId = ref('')
const formReimbursementDescription = ref('')
const formReimbursementValue = ref('')
const formReimbursementDate = ref('')

const columns = [
  { key: 'instance_date', label: 'Data' },
  { key: 'description_text', label: 'Descricao' },
  { key: 'link_badge', label: 'Vinculo' },
  { key: 'person_name', label: 'Responsavel' },
  { key: 'category_name', label: 'Categoria' },
  { key: 'card_name', label: 'Cartao' },
  { key: 'expected_value', label: 'Previsto', align: 'right' as const },
  { key: 'installment_label', label: 'Parcela' },
  { key: 'real_value_input', label: 'Realizado', align: 'right' as const },
  { key: 'status_select', label: 'Status' },
  { key: 'checked_toggle', label: 'Conferido', align: 'center' as const },
  { key: 'actions', label: 'Acoes', align: 'right' as const }
]

const originTypeOptions = [
  { value: 'single', label: 'Compra unica' },
  { value: 'recurring', label: 'Compra recorrente' }
] as const

const filterMonthOptions = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
] as const

const filterYearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, index) => String(currentYear - 3 + index))
})

const selectedPeriodLabel = computed(() => {
  if (periodFilter.value === 'all') {
    return 'Todos os períodos'
  }

  const [year, month] = periodFilter.value.split('-')
  const monthOption = filterMonthOptions.find(entry => entry.value === month)
  return monthOption ? `${monthOption.label}/${year}` : periodFilter.value
})
const selectedPeriodMonthKey = computed(() => {
  if (periodFilter.value === 'all') {
    return null
  }

  return periodFilter.value
})

const transactionStatusLabelMap: Record<TransactionStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  skipped: 'Ignorado',
  canceled: 'Cancelado'
}

const peopleMap = computed(() => new Map(people.value.map(entry => [entry.id, entry.name])))
const accountsMap = computed(() => new Map(accounts.value.map(entry => [entry.id, entry.name])))
const cardsMap = computed(() => new Map(cards.value.map(entry => [entry.id, entry.name])))
const categoriesMap = computed(() => new Map(categories.value.map(entry => [entry.id, entry.name])))
const selectedCategory = computed(() => categories.value.find(entry => entry.id === formCategoryId.value) ?? null)
const selectedCategoryType = computed<TransactionType | null>(() => selectedCategory.value?.type ?? null)
const canGenerateReimbursement = computed(() => selectedCategoryType.value === 'expense')
const selectedCard = computed(() => cards.value.find(entry => entry.id === getCardIdFromPaymentMethod(formPaymentMethod.value)) ?? null)
const showInstallmentSelector = computed(() => !editingRow.value && formOriginType.value === 'single' && Boolean(selectedCard.value))

const paymentMethodOptions = computed(() => {
  const accountOptions = accounts.value.map(entry => ({ value: `account:${entry.id}`, label: `Conta - ${entry.name}` }))
  const cardOptions = cards.value.map(entry => ({ value: `card:${entry.id}`, label: `Cartao - ${entry.name}` }))
  return [...accountOptions, ...cardOptions]
})
const activeCardsForQuickFilter = computed(() => cards.value.filter(entry => entry.is_active))

const shouldAskScopeForEdit = computed(() => {
  const originType = editingRow.value?.origin_type
  return originType === 'recurring' || originType === 'installment'
})
const scopeModalTitle = computed(() => {
  if (scopeModalMode.value === 'cancel') {
    return 'Como deseja cancelar este lancamento?'
  }

  if (scopeModalMode.value === 'delete') {
    return 'Como deseja excluir este lancamento?'
  }

  return 'Como deseja aplicar esta alteracao?'
})
const scopeModalSingleLabel = computed(() => {
  if (scopeModalMode.value === 'cancel') return 'Cancelar apenas este'
  if (scopeModalMode.value === 'delete') return 'Excluir apenas este'
  return 'Apenas este lancamento'
})
const scopeModalFutureLabel = computed(() => {
  if (scopeModalMode.value === 'cancel') return 'Cancelar este e os proximos'
  if (scopeModalMode.value === 'delete') return 'Excluir este e os proximos'
  return 'Este e os proximos'
})
const deleteConfirmDescription = computed(() => {
  if (!pendingDeleteRow.value) {
    return 'Esta acao nao pode ser desfeita.'
  }

  return `Confirma a exclusao do lancamento \"${pendingDeleteRow.value.title}\" em ${formatDateBr(pendingDeleteRow.value.instance_date)}? Esta acao nao pode ser desfeita.`
})
const selectedCardLabel = computed(() => {
  if (cardFilter.value === 'all') return 'Todos'
  return cards.value.find(entry => entry.id === cardFilter.value)?.name ?? 'Todos'
})
const selectedStatusLabel = computed(() => {
  if (statusFilter.value === 'all') return 'Todos'
  return transactionStatusLabelMap[statusFilter.value]
})
const hasActiveCardFilter = computed(() => cardFilter.value !== 'all')
const hasActiveStatusFilter = computed(() => statusFilter.value !== 'all')

interface PendingScopedEdit {
  row: TransactionInstanceItem
  payload: {
    title: string
    type: TransactionType
    expected_value: number
    real_value: number | null
    due_date: string
    instance_date: string
    person_id: string | null
    account_id: string | null
    card_id: string | null
    category_id: string | null
    description: string
    status: TransactionStatus
    is_checked: boolean
    recurring_end_mode?: RecurringEndMode
    recurring_end_date?: string | null
    recurring_occurrences_count?: number | null
    recurring_no_end_date?: boolean
  }
}

const pendingScopedEdit = ref<PendingScopedEdit | null>(null)

interface PersistedTransactionFilters {
  period_filter: string | 'all'
  all_periods?: boolean
  card_filter: string
  person_filter: string
  category_filter: string
  account_filter: string
  payment_method_filter?: 'all' | 'account' | 'card'
  quick_payment_filter?: string
  quick_type_filter?: 'all' | TransactionType
  status_filter: 'all' | TransactionStatus
  reimbursement_link_filter: 'all' | 'normal' | 'linked'
  search_description: string
}

function isValidMonthYear(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function isValidStatusFilter(value: string): value is 'all' | TransactionStatus {
  return value === 'all' || TRANSACTION_STATUS.includes(value as TransactionStatus)
}

function isValidReimbursementLinkFilter(value: string): value is 'all' | 'normal' | 'linked' {
  return value === 'all' || value === 'normal' || value === 'linked'
}

function isValidQuickTypeFilter(value: string): value is 'all' | TransactionType {
  return value === 'all' || value === 'income' || value === 'expense'
}

function normalizeQuickPaymentFilter(value: string, allowedCardIds: string[]): QuickPaymentFilter {
  if (value === 'all' || value === 'account' || value === 'cards') {
    return value
  }

  if (value.startsWith('card:')) {
    const cardId = value.slice(5)
    if (allowedCardIds.includes(cardId)) {
      return value as QuickPaymentFilter
    }
  }

  return 'all'
}

function getQuickPaymentFilterLabel(value: QuickPaymentFilter) {
  if (value === 'all') return 'Todos'
  if (value === 'account') return 'Conta'
  if (value === 'cards') return 'Cartoes'

  const cardId = value.slice(5)
  return cards.value.find(entry => entry.id === cardId)?.name ?? 'Cartao'
}

function pickPersistedOption(value: string, allowedIds: string[]) {
  if (value === 'all') {
    return 'all'
  }

  return allowedIds.includes(value) ? value : 'all'
}

function removePersistedFilters() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(FILTERS_STORAGE_KEY)
  hasPersistedFilters.value = false
}

function saveFiltersToStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const payload: PersistedTransactionFilters = {
    period_filter: periodFilter.value,
    all_periods: periodFilter.value === 'all',
    card_filter: cardFilter.value,
    person_filter: personFilter.value,
    category_filter: categoryFilter.value,
    account_filter: accountFilter.value,
    payment_method_filter: quickPaymentFilter.value === 'account' ? 'account' : quickPaymentFilter.value === 'cards' || quickPaymentFilter.value.startsWith('card:') ? 'card' : 'all',
    quick_payment_filter: quickPaymentFilter.value,
    quick_type_filter: quickTypeFilter.value,
    status_filter: statusFilter.value,
    reimbursement_link_filter: reimbursementLinkFilter.value,
    search_description: searchDescription.value.trim()
  }

  window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload))
  hasPersistedFilters.value = true
}

function restoreFiltersFromStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY)

  if (!raw) {
    hasPersistedFilters.value = false
    return
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedTransactionFilters>
    const hasAllPeriodsFlag = parsed.all_periods === true
    const validPeriod = hasAllPeriodsFlag || parsed.period_filter === 'all'
      ? 'all'
      : (typeof parsed.period_filter === 'string' && isValidMonthYear(parsed.period_filter) ? parsed.period_filter : monthYear.value)
    const validStatus = typeof parsed.status_filter === 'string' && isValidStatusFilter(parsed.status_filter)
      ? parsed.status_filter
      : 'all'
    const validReimbursementFilter = typeof parsed.reimbursement_link_filter === 'string' && isValidReimbursementLinkFilter(parsed.reimbursement_link_filter)
      ? parsed.reimbursement_link_filter
      : 'all'
    const validQuickType = typeof parsed.quick_type_filter === 'string' && isValidQuickTypeFilter(parsed.quick_type_filter)
      ? parsed.quick_type_filter
      : 'all'
    const fallbackQuickPayment = parsed.payment_method_filter === 'account'
      ? 'account'
      : parsed.payment_method_filter === 'card'
        ? 'cards'
        : 'all'
    const quickPaymentRaw = typeof parsed.quick_payment_filter === 'string'
      ? parsed.quick_payment_filter
      : fallbackQuickPayment
    const validQuickPayment = normalizeQuickPaymentFilter(quickPaymentRaw, cards.value.map(entry => entry.id))

    periodFilter.value = validPeriod
    cardFilter.value = pickPersistedOption(String(parsed.card_filter ?? 'all'), cards.value.map(entry => entry.id))
    personFilter.value = pickPersistedOption(String(parsed.person_filter ?? 'all'), people.value.map(entry => entry.id))
    categoryFilter.value = pickPersistedOption(String(parsed.category_filter ?? 'all'), categories.value.map(entry => entry.id))
    accountFilter.value = pickPersistedOption(String(parsed.account_filter ?? 'all'), accounts.value.map(entry => entry.id))
    quickPaymentFilter.value = validQuickPayment
    quickTypeFilter.value = validQuickType
    statusFilter.value = validStatus
    reimbursementLinkFilter.value = validReimbursementFilter
    searchDescription.value = typeof parsed.search_description === 'string' ? parsed.search_description : ''

    draftAllPeriods.value = validPeriod === 'all'

    if (validPeriod === 'all') {
      draftMonthYear.value = monthYear.value
      const { month, year } = parseMonthYear(monthYear.value)
      draftFilterMonth.value = String(month).padStart(2, '0')
      draftFilterYear.value = String(year)
    } else {
      draftMonthYear.value = validPeriod
      const { month, year } = parseMonthYear(validPeriod)
      draftFilterMonth.value = String(month).padStart(2, '0')
      draftFilterYear.value = String(year)
    }

    draftCardFilter.value = cardFilter.value
    draftPersonFilter.value = personFilter.value
    draftCategoryFilter.value = categoryFilter.value
    draftAccountFilter.value = accountFilter.value
    draftStatusFilter.value = statusFilter.value
    draftReimbursementLinkFilter.value = reimbursementLinkFilter.value
    hasPersistedFilters.value = true
  } catch {
    removePersistedFilters()
  }
}

function clearPersistedFiltersOnly() {
  removePersistedFilters()
  filtersModalError.value = ''
}

function syncQuickPaymentFilterFromCurrentFilters() {
  if (cardFilter.value !== 'all') {
    quickPaymentFilter.value = `card:${cardFilter.value}`
    return
  }

  if (accountFilter.value !== 'all') {
    quickPaymentFilter.value = 'account'
    return
  }

  if (quickPaymentFilter.value.startsWith('card:')) {
    quickPaymentFilter.value = 'cards'
  }
}

function applyQuickPaymentFilter(filter: QuickPaymentFilter) {
  quickPaymentFilter.value = filter
  reimbursementLinkFilter.value = 'all'

  if (filter === 'all') {
    cardFilter.value = 'all'
    accountFilter.value = 'all'
    return
  }

  if (filter === 'account') {
    cardFilter.value = 'all'
    accountFilter.value = 'all'
    return
  }

  if (filter === 'cards') {
    cardFilter.value = 'all'
    accountFilter.value = 'all'
    return
  }

  const cardId = filter.slice(5)
  cardFilter.value = cardId
  accountFilter.value = 'all'
}

function applyQuickReimbursementFilter() {
  quickPaymentFilter.value = 'all'
  cardFilter.value = 'all'
  accountFilter.value = 'all'
  reimbursementLinkFilter.value = 'linked'
}

function applyQuickAllFilters() {
  quickPaymentFilter.value = 'all'
  cardFilter.value = 'all'
  accountFilter.value = 'all'
  reimbursementLinkFilter.value = 'all'
}

async function consumeNewLaunchQuery() {
  if (route.query.new !== '1') {
    return
  }

  openCreateModal()

  const nextQuery = { ...route.query }
  delete nextQuery.new
  await router.replace({ query: nextQuery })
}

const expectedValueLabel = computed(() => {
  if (formOriginType.value === 'recurring') {
    return 'Valor por ocorrencia'
  }

  if (showInstallmentSelector.value && Number(formInstallmentTotal.value) > 1) {
    return 'Valor da parcela'
  }

  return 'Valor'
})

const expectedValueHelpText = computed(() => {
  if (showInstallmentSelector.value && Number(formInstallmentTotal.value) > 1) {
    return 'Informe o valor de cada parcela. O sistema criara uma ocorrencia por parcela.'
  }

  return ''
})

function openScopeDecisionModal(mode: 'edit' | 'cancel' | 'delete', row?: TransactionInstanceItem) {
  scopeModalMode.value = mode
  scopeTargetRow.value = row ?? editingRow.value
  scopeModalError.value = ''
  isScopeModalOpen.value = true
}

function closeScopeDecisionModal() {
  isScopeModalOpen.value = false
  scopeModalMode.value = null
  scopeTargetRow.value = null
  pendingScopedEdit.value = null
  scopeModalError.value = ''
  scopeModalSaving.value = false
}

function openDeleteConfirmModal(row: TransactionInstanceItem) {
  pendingDeleteRow.value = row
  pageError.value = ''
  isDeleteConfirmModalOpen.value = true
}

function closeDeleteConfirmModal() {
  isDeleteConfirmModalOpen.value = false
  pendingDeleteRow.value = null
}

function getDaysDiff(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00Z`)
  const to = new Date(`${toDate}T00:00:00Z`)
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function getMonthDiff(fromDate: string, toDate: string) {
  const [fromYear, fromMonth] = fromDate.split('-').map(Number)
  const [toYear, toMonth] = toDate.split('-').map(Number)
  return ((toYear - fromYear) * 12) + (toMonth - fromMonth)
}

function getYearDiff(fromDate: string, toDate: string) {
  const [fromYear] = fromDate.split('-').map(Number)
  const [toYear] = toDate.split('-').map(Number)
  return toYear - fromYear
}

function getRecurringOccurrenceIndex(row: TransactionInstanceItem) {
  const startDate = row.recurring_start_date ?? row.due_date
  const step = Math.max(row.recurring_interval_count ?? 1, 1)
  const frequency = row.recurring_frequency ?? 'monthly'

  if (!startDate) {
    return 1
  }

  if (frequency === 'daily') {
    const diff = Math.max(0, getDaysDiff(startDate, row.instance_date))
    return Math.floor(diff / step) + 1
  }

  if (frequency === 'weekly') {
    const diff = Math.max(0, getDaysDiff(startDate, row.instance_date))
    return Math.floor(diff / (7 * step)) + 1
  }

  if (frequency === 'yearly') {
    const diff = Math.max(0, getYearDiff(startDate, row.instance_date))
    return Math.floor(diff / step) + 1
  }

  const diff = Math.max(0, getMonthDiff(startDate, row.instance_date))
  return Math.floor(diff / step) + 1
}

function getRecurringTotalOccurrences(row: TransactionInstanceItem, currentIndex: number) {
  if (row.recurring_occurrences_limit && row.recurring_occurrences_limit > 0) {
    return row.recurring_occurrences_limit
  }

  const startDate = row.recurring_start_date ?? row.due_date
  const endDate = row.recurring_end_date
  const step = Math.max(row.recurring_interval_count ?? 1, 1)
  const frequency = row.recurring_frequency ?? 'monthly'

  if (!startDate || !endDate) {
    return Math.max(currentIndex, 12)
  }

  if (frequency === 'daily') {
    const diff = Math.max(0, getDaysDiff(startDate, endDate))
    return Math.floor(diff / step) + 1
  }

  if (frequency === 'weekly') {
    const diff = Math.max(0, getDaysDiff(startDate, endDate))
    return Math.floor(diff / (7 * step)) + 1
  }

  if (frequency === 'yearly') {
    const diff = Math.max(0, getYearDiff(startDate, endDate))
    return Math.floor(diff / step) + 1
  }

  const diff = Math.max(0, getMonthDiff(startDate, endDate))
  return Math.floor(diff / step) + 1
}

function getInstallmentLabel(row: TransactionInstanceItem) {
  if (row.origin_type === 'installment') {
    return `${row.installment_number ?? 1}/${row.installment_total ?? 1}`
  }

  if (row.origin_type === 'recurring') {
    const currentIndex = getRecurringOccurrenceIndex(row)
    const total = getRecurringTotalOccurrences(row, currentIndex)
    return `${currentIndex}/${total}`
  }

  return '1/1'
}

const filteredRows = computed(() => {
  const normalizedSearch = searchDescription.value.trim().toLowerCase()

  return rows.value
    .filter((row) => {
      if (!selectedPeriodMonthKey.value) {
        return true
      }

      return row.financial_effective_date.slice(0, 7) === selectedPeriodMonthKey.value
    })
    .filter((row) => {
      if (quickPaymentFilter.value === 'account') {
        return Boolean(row.account_id)
      }

      if (quickPaymentFilter.value === 'cards') {
        return Boolean(row.card_id)
      }

      if (quickPaymentFilter.value.startsWith('card:')) {
        return row.card_id === quickPaymentFilter.value.slice(5)
      }

      return true
    })
    .filter((row) => quickTypeFilter.value === 'all' || row.type === quickTypeFilter.value)
    .filter((row) => personFilter.value === 'all' || row.person_id === personFilter.value)
    .filter((row) => cardFilter.value === 'all' || row.card_id === cardFilter.value)
    .filter((row) => accountFilter.value === 'all' || row.account_id === accountFilter.value)
    .filter((row) => categoryFilter.value === 'all' || row.category_id === categoryFilter.value)
    .filter((row) => statusFilter.value === 'all' || row.status === statusFilter.value)
    .filter((row) => {
      if (reimbursementLinkFilter.value === 'normal') {
        return !row.reimbursement_group_id
      }

      if (reimbursementLinkFilter.value === 'linked') {
        return Boolean(row.reimbursement_group_id)
      }

      return true
    })
    .filter((row) => {
      if (!normalizedSearch) return true
      const text = `${row.title} ${row.description ?? ''}`.toLowerCase()
      return text.includes(normalizedSearch)
    })
    .map((row) => ({
      ...row,
      installment_label: getInstallmentLabel(row),
      description_text: row.description?.trim() ? `${row.title} - ${row.description}` : row.title,
      person_name: row.person_id ? (peopleMap.value.get(row.person_id) || '-') : '-',
      category_name: row.category_id ? (categoriesMap.value.get(row.category_id) || '-') : '-',
      card_name: row.card_id ? (cardsMap.value.get(row.card_id) || '-') : '-',
      account_name: row.account_id ? (accountsMap.value.get(row.account_id) || '-') : '-',
      link_badge: row.reimbursement_role === 'original'
        ? 'Original'
        : row.reimbursement_role === 'reimbursement'
          ? 'Reembolso'
          : 'Normal',
      checked_toggle: row.is_checked
    }))
})

  const filteredTotalValue = computed(() => filteredRows.value.reduce((sum, row) => sum + getEffectiveValue(row as TransactionInstanceItem), 0))

function applyReimbursementDefaults() {
  if (!formReimbursementDescription.value.trim()) {
    formReimbursementDescription.value = formTitle.value.trim()
      ? `Reembolso - ${formTitle.value.trim()}`
      : 'Reembolso'
  }

  if (!formReimbursementValue.value.trim() && formExpectedValue.value.trim()) {
    formReimbursementValue.value = formExpectedValue.value
  }

  if (!formReimbursementPersonId.value) {
    formReimbursementPersonId.value = formPersonId.value
  }
}

function getPaymentMethodParts(value: string) {
  const [kind, id] = value.split(':')

  if (!kind || !id) {
    return { kind: null, id: null }
  }

  if (kind !== 'account' && kind !== 'card') {
    return { kind: null, id: null }
  }

  return { kind, id }
}

function getAccountIdFromPaymentMethod(value: string) {
  const parsed = getPaymentMethodParts(value)
  return parsed.kind === 'account' ? parsed.id : null
}

function getCardIdFromPaymentMethod(value: string) {
  const parsed = getPaymentMethodParts(value)
  return parsed.kind === 'card' ? parsed.id : null
}

function getNextBillingLabel(referenceDate: string, closingDay: number | null) {
  const [yearText, monthText, dayText] = referenceDate.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) {
    return '-'
  }

  let targetYear = year
  let targetMonth = month

  if (closingDay && day > closingDay) {
    targetMonth += 1
    if (targetMonth > 12) {
      targetMonth = 1
      targetYear += 1
    }
  }

  const monthLabel = new Date(Date.UTC(targetYear, targetMonth - 1, 1)).toLocaleString('pt-BR', { month: 'long' })
  return `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}/${targetYear}`
}

const cardInfoReferenceDate = computed(() => {
  if (formOriginType.value === 'recurring') {
    return formRecurringStartDate.value
  }

  return formPurchaseDate.value
})

const nextCardBillingLabel = computed(() => {
  if (!selectedCard.value || !cardInfoReferenceDate.value) {
    return '-'
  }

  return getNextBillingLabel(cardInfoReferenceDate.value, selectedCard.value.closing_day)
})

function formatCurrency(value: number | null) {
  return formatBRLOrDash(value)
}

function formatDateBr(value: string) {
  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function getRowAlertLevel(row: TransactionInstanceItem) {
  if (row.status === 'paid') {
    return 'paid'
  }

  if (row.status === 'canceled') {
    return 'none'
  }

  const dueDate = row.due_date || row.instance_date
  const daysUntilDue = getDaysDiff(getTodayIsoDate(), dueDate)

  if (daysUntilDue < 0) {
    return 'overdue'
  }

  if (daysUntilDue <= 3) {
    return 'due-soon'
  }

  return 'none'
}

function getRowAlertClass(row: TransactionInstanceItem) {
  const level = getRowAlertLevel(row)

  if (level === 'paid') {
    return 'bg-emerald-500'
  }

  if (level === 'overdue') {
    return 'bg-rose-500'
  }

  if (level === 'due-soon') {
    return 'bg-amber-400'
  }

  return 'bg-slate-300/80'
}

function getRowAlertLabel(row: TransactionInstanceItem) {
  const level = getRowAlertLevel(row)

  if (level === 'paid') {
    return 'Pago'
  }

  if (level === 'overdue') {
    return 'Vencido'
  }

  if (level === 'due-soon') {
    return 'Proximo do vencimento'
  }

  return 'Sem alerta'
}

function getEffectiveValue(row: TransactionInstanceItem) {
  return row.real_value ?? row.expected_value
}

const exportTotalEffective = computed(() => filteredTotalValue.value)

function openExportPreview() {
  if (!filteredRows.value.length) {
    pageError.value = 'Nao ha lancamentos filtrados para exportar.'
    return
  }

  pageError.value = ''
  isExportPreviewOpen.value = true
}

async function exportPreviewPdf() {
  if (exportingPdf.value) return

  if (!filteredRows.value.length) {
    pageError.value = 'Nao ha lancamentos filtrados para exportar.'
    return
  }

  exportingPdf.value = true
  pageError.value = ''

  try {
    const [canvas, { jsPDF }] = await Promise.all([
      renderPreviewCanvas(),
      import('jspdf')
    ])

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth() - (margin * 2)
    const pageHeight = doc.internal.pageSize.getHeight() - (margin * 2)
    const imageHeight = (canvas.height * pageWidth) / canvas.width
    const imageData = canvas.toDataURL('image/png')

    let remainingHeight = imageHeight
    let positionY = margin

    doc.addImage(imageData, 'PNG', margin, positionY, pageWidth, imageHeight)
    remainingHeight -= pageHeight

    while (remainingHeight > 0) {
      doc.addPage()
      positionY = margin - (imageHeight - remainingHeight)
      doc.addImage(imageData, 'PNG', margin, positionY, pageWidth, imageHeight)
      remainingHeight -= pageHeight
    }

    const fileDate = new Date().toISOString().slice(0, 10)
    doc.save(`lancamentos-filtrados-${fileDate}.pdf`)
  } catch (err) {
    pageError.value = err instanceof Error
      ? `Nao foi possivel exportar o PDF. ${err.message}`
      : 'Nao foi possivel exportar o PDF.'
  } finally {
    exportingPdf.value = false
  }
}

async function savePreviewAsImage() {
  if (exportingImage.value) return

  exportingImage.value = true
  pageError.value = ''

  try {
    const canvas = await renderPreviewCanvas()

    const imageDate = new Date().toISOString().slice(0, 10)
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `lancamentos-filtrados-${imageDate}.png`
    link.click()
  } catch (err) {
    pageError.value = err instanceof Error
      ? `Nao foi possivel salvar a imagem. ${err.message}`
      : 'Nao foi possivel salvar a imagem.'
  } finally {
    exportingImage.value = false
  }
}

async function renderPreviewCanvas() {
  if (!exportPreviewRef.value) {
    throw new Error('Nao foi possivel renderizar o preview para exportacao.')
  }

  await nextTick()

  const { default: html2canvas } = await import('html2canvas')
  return html2canvas(exportPreviewRef.value, {
    scale: 3,
    backgroundColor: '#f6f7f2',
    useCORS: true,
    windowWidth: exportPreviewRef.value.scrollWidth
  })
}

function resetForm() {
  editingRow.value = null
  formTitle.value = ''
  formOriginType.value = 'single'
  formExpectedValue.value = ''
  formRealValue.value = ''
  formPurchaseDate.value = `${monthYear.value}-01`
  formInstallmentTotal.value = '1'
  formRecurringStartDate.value = `${monthYear.value}-01`
  formRecurringEndDate.value = ''
  formRecurringFrequency.value = 'monthly'
  formRecurringEndingMode.value = 'count'
  formRecurringOccurrences.value = '12'
  formPersonId.value = ''
  formPaymentMethod.value = ''
  formCategoryId.value = ''
  formDescription.value = ''
  formGenerateReimbursement.value = false
  formReimbursementPersonId.value = ''
  formReimbursementAccountId.value = ''
  formReimbursementDescription.value = ''
  formReimbursementValue.value = ''
  formReimbursementDate.value = ''
  modalError.value = ''
}

function fillFormFromRow(row: TransactionInstanceItem) {
  editingRow.value = row
  formTitle.value = row.title
  formOriginType.value = row.origin_type === 'recurring' ? 'recurring' : 'single'
  formExpectedValue.value = String(row.expected_value)
  formRealValue.value = row.real_value == null ? '' : String(row.real_value)
  formPurchaseDate.value = row.instance_date
  formInstallmentTotal.value = String(row.installment_total ?? 2)
  formRecurringStartDate.value = row.due_date
  formRecurringEndDate.value = ''
  formRecurringFrequency.value = 'monthly'
  formRecurringEndingMode.value = 'count'
  formRecurringOccurrences.value = '12'
  formPersonId.value = row.person_id ?? ''
  formPaymentMethod.value = row.card_id ? `card:${row.card_id}` : row.account_id ? `account:${row.account_id}` : ''
  formCategoryId.value = row.category_id ?? ''
  formDescription.value = row.description ?? ''
  formGenerateReimbursement.value = false
  formReimbursementPersonId.value = ''
  formReimbursementAccountId.value = ''
  formReimbursementDescription.value = ''
  formReimbursementValue.value = ''
  formReimbursementDate.value = ''
  modalError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

async function openEditModal(row: TransactionInstanceItem) {
  fillFormFromRow(row)

  if (row.origin_type === 'recurring' && row.source_transaction_id) {
    const recurringConfig = await getRecurringConfiguration(row.source_transaction_id)
    formRecurringStartDate.value = recurringConfig.start_date
    formRecurringFrequency.value = recurringConfig.frequency
    formRecurringEndingMode.value = recurringConfig.end_mode === 'no_end' ? 'count' : recurringConfig.end_mode
    formRecurringEndDate.value = recurringConfig.end_date || ''
    formRecurringOccurrences.value = recurringConfig.occurrences_count == null ? '12' : String(recurringConfig.occurrences_count)
  }

  isModalOpen.value = true
}

async function deleteSingleTransaction(row: TransactionInstanceItem) {
  pageError.value = ''
  rowActionBusy.value = true

  try {
    await removeTransactionInstance(row, 'single')
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel excluir o lancamento.'
  } finally {
    rowActionBusy.value = false
  }
}

async function handleDeleteClick(row: TransactionInstanceItem) {
  if (rowActionBusy.value || scopeModalSaving.value) {
    return
  }

  if (row.origin_type === 'recurring' || row.origin_type === 'installment') {
    openScopeDecisionModal('delete', row)
    return
  }

  openDeleteConfirmModal(row)
}

async function confirmDeleteSingleTransaction() {
  if (!pendingDeleteRow.value) {
    return
  }

  await deleteSingleTransaction(pendingDeleteRow.value)
  closeDeleteConfirmModal()
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

function parseMonthYear(value: string) {
  const [yearText, monthText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    throw new Error('Filtro de periodo invalido.')
  }

  return { month, year }
}

async function clearFilters() {
  skipSearchPersistence.value = true
  cardFilter.value = 'all'
  personFilter.value = 'all'
  categoryFilter.value = 'all'
  accountFilter.value = 'all'
  quickPaymentFilter.value = 'all'
  quickTypeFilter.value = 'all'
  statusFilter.value = 'all'
  reimbursementLinkFilter.value = 'all'
  searchDescription.value = ''
  periodFilter.value = monthYear.value
  draftMonthYear.value = monthYear.value
  const { month, year } = parseMonthYear(monthYear.value)
  draftFilterMonth.value = String(month).padStart(2, '0')
  draftFilterYear.value = String(year)
  draftAllPeriods.value = false
  draftCardFilter.value = 'all'
  draftPersonFilter.value = 'all'
  draftCategoryFilter.value = 'all'
  draftAccountFilter.value = 'all'
  draftStatusFilter.value = 'all'
  draftReimbursementLinkFilter.value = 'all'
  removePersistedFilters()
  await fetchRows()
  isFiltersModalOpen.value = false
  await nextTick()
  skipSearchPersistence.value = false
}

function openFiltersModal() {
  draftAllPeriods.value = periodFilter.value === 'all'

  if (periodFilter.value !== 'all') {
    draftMonthYear.value = periodFilter.value
    const { month, year } = parseMonthYear(periodFilter.value)
    draftFilterMonth.value = String(month).padStart(2, '0')
    draftFilterYear.value = String(year)
  }

  draftCardFilter.value = cardFilter.value
  draftPersonFilter.value = personFilter.value
  draftCategoryFilter.value = categoryFilter.value
  draftAccountFilter.value = accountFilter.value
  draftStatusFilter.value = statusFilter.value
  draftReimbursementLinkFilter.value = reimbursementLinkFilter.value
  filtersModalError.value = ''
  isFiltersModalOpen.value = true
}

async function applyFilters() {
  filtersModalError.value = ''
  if (draftAllPeriods.value) {
    periodFilter.value = 'all'
  } else {
    draftMonthYear.value = `${draftFilterYear.value}-${draftFilterMonth.value}`

    try {
      parseMonthYear(draftMonthYear.value)
    } catch (err) {
      filtersModalError.value = err instanceof Error ? err.message : 'Período inválido.'
      return
    }

    periodFilter.value = draftMonthYear.value
  }
  cardFilter.value = draftCardFilter.value
  personFilter.value = draftPersonFilter.value
  categoryFilter.value = draftCategoryFilter.value
  accountFilter.value = draftAccountFilter.value
  syncQuickPaymentFilterFromCurrentFilters()
  statusFilter.value = draftStatusFilter.value
  reimbursementLinkFilter.value = draftReimbursementLinkFilter.value
  saveFiltersToStorage()

  await fetchRows()
  isFiltersModalOpen.value = false
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    rows.value = await listManualInstances({})
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel carregar os lancamentos.'
  } finally {
    loading.value = false
  }
}

function patchRowInState(rowId: string, patch: Partial<TransactionInstanceItem>) {
  rows.value = rows.value.map((entry) => {
    if (entry.id !== rowId) {
      return entry
    }

    return {
      ...entry,
      ...patch
    }
  })
}

async function fetchOptions() {
  try {
    const options = await listFilterOptions()
    people.value = options.people
    accounts.value = options.accounts
    cards.value = options.cards
    categories.value = options.categories
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel carregar os filtros.'
  }
}

function getRealDraftValue(row: TransactionInstanceItem) {
  if (realValueDrafts.value[row.id] != null) return realValueDrafts.value[row.id]
  if (row.real_value != null) return String(row.real_value)
  return String(row.expected_value)
}

function onRealDraftInput(rowId: string, value: string) {
  realValueDrafts.value = { ...realValueDrafts.value, [rowId]: value }
}

async function saveInlineRealValue(row: TransactionInstanceItem) {
  if (rowActionBusy.value) {
    return
  }

  const rawValue = getRealDraftValue(row).trim()
  const parsedReal = rawValue === '' ? null : Number(rawValue)

  if (parsedReal != null && Number.isNaN(parsedReal)) {
    pageError.value = 'Valor realizado invalido.'
    return
  }

  if (row.real_value === parsedReal) return

  pageError.value = ''
  rowActionBusy.value = true

  try {
    await updateTransactionInstance(
      row.id,
      {
        title: row.title,
        type: row.type,
        expected_value: row.expected_value,
        real_value: parsedReal,
        due_date: row.due_date,
        instance_date: row.instance_date,
        person_id: row.person_id,
        account_id: row.account_id,
        card_id: row.card_id,
        category_id: row.category_id,
        description: row.description,
        status: row.status,
        is_checked: row.is_checked
      },
      row.source_transaction_id,
      row.origin_type
    )

    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel salvar o valor realizado.'
  } finally {
    rowActionBusy.value = false
  }
}

async function submitForm() {
  modalError.value = ''

  if (!formTitle.value.trim()) {
    modalError.value = 'Descricao obrigatoria para salvar o lancamento.'
    return
  }

  const parsedExpected = Number(formExpectedValue.value)
  if (Number.isNaN(parsedExpected) || parsedExpected <= 0) {
    modalError.value = 'Valor previsto deve ser maior que zero.'
    return
  }

  const parsedReal = parseOptionalNumber(formRealValue.value)
  if (Number.isNaN(parsedReal)) {
    modalError.value = 'Valor realizado invalido.'
    return
  }

  if (!formCategoryId.value) {
    modalError.value = 'Categoria obrigatoria.'
    return
  }

  if (!selectedCategoryType.value) {
    modalError.value = 'Categoria invalida.'
    return
  }

  if (!formPaymentMethod.value) {
    modalError.value = 'Forma de pagamento obrigatoria.'
    return
  }

  const accountId = getAccountIdFromPaymentMethod(formPaymentMethod.value)
  const cardId = getCardIdFromPaymentMethod(formPaymentMethod.value)

  if (!accountId && !cardId) {
    modalError.value = 'Forma de pagamento invalida.'
    return
  }

  let parsedReimbursementValue: number | null = null

  if (!editingRow.value && canGenerateReimbursement.value && formGenerateReimbursement.value) {
    const reimbursementRaw = formReimbursementValue.value.trim()
    parsedReimbursementValue = reimbursementRaw ? Number(reimbursementRaw) : parsedExpected

    if (Number.isNaN(parsedReimbursementValue) || parsedReimbursementValue <= 0) {
      modalError.value = 'Valor da entrada vinculada deve ser maior que zero.'
      return
    }

  }

  if (formOriginType.value === 'single' && !formPurchaseDate.value) {
    modalError.value = 'Data da compra obrigatoria.'
    return
  }

  const parsedInstallmentTotal = Number(formInstallmentTotal.value)
  const parsedRecurringOccurrences = Number(formRecurringOccurrences.value)

  if (showInstallmentSelector.value) {
    if (!Number.isInteger(parsedInstallmentTotal) || parsedInstallmentTotal < 1 || parsedInstallmentTotal > 24) {
      modalError.value = 'Parcelas devem estar entre 1 e 24.'
      return
    }
  }

  if (formOriginType.value === 'recurring') {
    if (!formRecurringStartDate.value) {
      modalError.value = 'Data inicial da recorrência obrigatória.'
      return
    }

    if (formRecurringEndingMode.value === 'end_date' && !formRecurringEndDate.value) {
      modalError.value = 'Data final da recorrência obrigatória quando o modo Data final estiver selecionado.'
      return
    }

    if (formRecurringEndingMode.value === 'end_date' && formRecurringEndDate.value && formRecurringEndDate.value < formRecurringStartDate.value) {
      modalError.value = 'Data final da recorrência deve ser maior ou igual à data inicial.'
      return
    }

    if (formRecurringEndingMode.value === 'count' && (!Number.isInteger(parsedRecurringOccurrences) || parsedRecurringOccurrences < 1)) {
      modalError.value = 'Quantidade de recorrências deve ser um número inteiro maior ou igual a 1.'
      return
    }

    if (formRecurringEndingMode.value !== 'count' && formRecurringEndingMode.value !== 'end_date') {
      modalError.value = 'Escolha Quantidade ou Data final para encerrar a recorrencia.'
      return
    }
  }

  const resolvedType = selectedCategoryType.value
  const resolvedOriginType = formOriginType.value === 'single' && cardId && parsedInstallmentTotal > 1
    ? 'installment'
    : formOriginType.value
  const purchaseDate = formPurchaseDate.value

  saving.value = true

  try {
    if (editingRow.value) {
      const editPayload = {
        title: formTitle.value,
        type: resolvedType,
        expected_value: parsedExpected,
        real_value: parsedReal,
        due_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : purchaseDate,
        instance_date: purchaseDate,
        person_id: formPersonId.value || null,
        account_id: accountId,
        card_id: cardId,
        category_id: formCategoryId.value || null,
        description: formDescription.value,
        status: editingRow.value.status,
        is_checked: editingRow.value.is_checked,
        recurring_end_mode: formRecurringEndingMode.value,
        recurring_end_date: formRecurringEndingMode.value === 'end_date' ? (formRecurringEndDate.value || null) : null,
        recurring_occurrences_count: formRecurringEndingMode.value === 'count' ? parsedRecurringOccurrences : null,
        recurring_no_end_date: false
      }

      if (shouldAskScopeForEdit.value) {
        pendingScopedEdit.value = {
          row: editingRow.value,
          payload: editPayload
        }
        openScopeDecisionModal('edit', editingRow.value)
        return
      }

      await updateTransactionInstance(
        editingRow.value.id,
        {
          title: editPayload.title,
          type: editPayload.type,
          expected_value: editPayload.expected_value,
          real_value: editPayload.real_value,
          due_date: editPayload.due_date,
          instance_date: editPayload.instance_date,
          person_id: editPayload.person_id,
          account_id: editPayload.account_id,
          card_id: editPayload.card_id,
          category_id: editPayload.category_id,
          description: editPayload.description,
          status: editPayload.status,
          is_checked: editPayload.is_checked
        },
        editingRow.value.source_transaction_id,
        editingRow.value.origin_type
      )
    } else {
      await createTransaction({
        origin_type: resolvedOriginType,
        title: formTitle.value,
        type: resolvedType,
        expected_value: parsedExpected,
        real_value: parsedExpected,
        due_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : purchaseDate,
        instance_date: purchaseDate,
        installment_total: resolvedOriginType === 'installment' ? parsedInstallmentTotal : undefined,
        installment_start_date: resolvedOriginType === 'installment' ? purchaseDate : undefined,
        recurring_start_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : undefined,
        recurring_end_mode: formOriginType.value === 'recurring' ? formRecurringEndingMode.value : undefined,
        recurring_end_date: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'end_date'
          ? (formRecurringEndDate.value || null)
          : null,
        recurring_no_end_date: false,
        recurring_frequency: formOriginType.value === 'recurring' ? formRecurringFrequency.value : undefined,
        recurring_occurrences_count: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'count'
          ? parsedRecurringOccurrences
          : null,
        recurring_occurrences_limit: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'count'
          ? parsedRecurringOccurrences
          : null,
        person_id: formPersonId.value || null,
        account_id: accountId,
        card_id: cardId,
        category_id: formCategoryId.value || null,
        description: formDescription.value,
        status: 'pending',
        is_checked: false,
        reimbursement: !editingRow.value && canGenerateReimbursement.value && formGenerateReimbursement.value
          ? {
              enabled: true,
              person_id: formReimbursementPersonId.value || null,
              account_id: formReimbursementAccountId.value || null,
              description: formReimbursementDescription.value.trim() || `Reembolso - ${formTitle.value.trim()}`,
              expected_value: parsedReimbursementValue ?? parsedExpected,
              received_date: formReimbursementDate.value || null
            }
          : null
      })
    }

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Nao foi possivel salvar o lancamento.'
  } finally {
    saving.value = false
  }
}

async function toggleChecked(row: TransactionInstanceItem) {
  if (rowActionBusy.value) {
    return
  }

  pageError.value = ''
  rowActionBusy.value = true
  const nextChecked = !row.is_checked

  patchRowInState(row.id, {
    is_checked: nextChecked,
    checked_at: nextChecked ? new Date().toISOString() : null
  })

  try {
    await setChecked(row, nextChecked)
  } catch (err) {
    patchRowInState(row.id, {
      is_checked: row.is_checked,
      checked_at: row.checked_at
    })
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar a conferencia.'
  } finally {
    rowActionBusy.value = false
  }
}

async function changeStatus(row: TransactionInstanceItem, nextStatus: TransactionStatus) {
  if (rowActionBusy.value) {
    return
  }

  pageError.value = ''

  if ((row.origin_type === 'recurring' || row.origin_type === 'installment') && nextStatus === 'canceled') {
    openScopeDecisionModal('cancel', row)
    return
  }

  rowActionBusy.value = true
  patchRowInState(row.id, {
    status: nextStatus
  })

  try {
    await setStatus(row, nextStatus)
  } catch (err) {
    patchRowInState(row.id, {
      status: row.status
    })
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar o status.'
  } finally {
    rowActionBusy.value = false
  }
}

async function applyScopedEdit(scope: DeleteRecurringScope) {
  if (!pendingScopedEdit.value) {
    throw new Error('Nenhuma alteracao pendente para aplicar.')
  }

  const { row, payload } = pendingScopedEdit.value

  if (row.origin_type === 'recurring') {
    await updateRecurringTransaction(row, payload, scope as RecurringScope)
    return
  }

  if (row.origin_type === 'installment') {
    await updateInstallmentTransaction(row, payload, scope)
    return
  }

  await updateTransactionInstance(
    row.id,
    payload,
    row.source_transaction_id,
    row.origin_type
  )
}

async function applyScopedCancel(row: TransactionInstanceItem, scope: DeleteRecurringScope) {
  if (row.origin_type === 'recurring') {
    await cancelRecurringTransaction(row, scope as RecurringScope)
    return
  }

  if (row.origin_type === 'installment') {
    await cancelInstallmentTransaction(row, scope)
    return
  }

  await setStatus(row, 'canceled')
}

async function confirmScopeDecision(scope: DeleteRecurringScope) {
  scopeModalError.value = ''
  scopeModalSaving.value = true
  rowActionBusy.value = true

  try {
    if (scopeModalMode.value === 'edit') {
      await applyScopedEdit(scope)
      isModalOpen.value = false
      closeScopeDecisionModal()
      await fetchRows()
      return
    }

    if (!scopeTargetRow.value) {
      throw new Error('Nenhum lancamento selecionado.')
    }

    if (scopeModalMode.value === 'cancel') {
      await applyScopedCancel(scopeTargetRow.value, scope)
      closeScopeDecisionModal()
      await fetchRows()
      return
    }

    if (scopeModalMode.value === 'delete') {
      await removeTransactionInstance(scopeTargetRow.value, scope)
      closeScopeDecisionModal()
      await fetchRows()
      return
    }
  } catch (err) {
    scopeModalError.value = err instanceof Error ? err.message : 'Nao foi possivel aplicar a acao no escopo selecionado.'
  } finally {
    scopeModalSaving.value = false
    rowActionBusy.value = false
  }
}

watch(canGenerateReimbursement, (enabled) => {
  if (!enabled) {
    formGenerateReimbursement.value = false
  }
})

watch(formPaymentMethod, () => {
  if (!showInstallmentSelector.value) {
    formInstallmentTotal.value = '1'
  }
})

watch(formGenerateReimbursement, (enabled) => {
  if (enabled) {
    applyReimbursementDefaults()
  }
})

watch(formPersonId, (nextPersonId) => {
  if (formGenerateReimbursement.value && !formReimbursementPersonId.value) {
    formReimbursementPersonId.value = nextPersonId
  }
})

watch(formExpectedValue, () => {
  if (formGenerateReimbursement.value && !formReimbursementValue.value.trim()) {
    formReimbursementValue.value = formExpectedValue.value
  }
})

watch(formTitle, () => {
  if (formGenerateReimbursement.value && !formReimbursementDescription.value.trim()) {
    applyReimbursementDefaults()
  }
})

watch(searchDescription, () => {
  if (skipSearchPersistence.value) {
    return
  }

  saveFiltersToStorage()
})

watch(
  [periodFilter, cardFilter, personFilter, categoryFilter, accountFilter, quickPaymentFilter, quickTypeFilter, statusFilter, reimbursementLinkFilter],
  () => {
    if (skipSearchPersistence.value) {
      return
    }

    saveFiltersToStorage()
  }
)

watch(
  () => route.query.new,
  async () => {
    await consumeNewLaunchQuery()
  }
)

onMounted(async () => {
  await fetchOptions()
  restoreFiltersFromStorage()
  syncQuickPaymentFilterFromCurrentFilters()
  await fetchRows()
  await consumeNewLaunchQuery()
})
</script>

<template>
  <section class="space-y-5 overflow-x-hidden">
    <AppCard>
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-start gap-2">
          <AppButton label="Filtros" size="sm" variant="ghost" @click="openFiltersModal" />
          <AppButton label="Limpar" size="sm" variant="ghost" @click="clearFilters" />
          <AppButton label="Exportar" size="sm" variant="ghost" :disabled="!filteredRows.length" @click="openExportPreview" />
          <AppButton label="Novo" size="sm" @click="openCreateModal" />
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span class="rounded-full bg-primary-light/20 px-2.5 py-1 font-semibold text-foreground">{{ selectedPeriodLabel }}</span>
          <span v-if="hasPersistedFilters" class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-[11px]">Filtros salvos neste dispositivo</span>
          <button
            v-if="hasPersistedFilters"
            type="button"
            class="rounded-full border border-border/80 px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-foreground/30 hover:text-foreground"
            @click="clearPersistedFiltersOnly"
          >
            Limpar filtros salvos
          </button>
        </div>

        <div class="w-full max-w-xl">
          <AppInput v-model="searchDescription" label="Pesquisar descrição" placeholder="Digite parte da descrição" />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Pagamento rápido</span>
          <div class="w-full overflow-x-auto pb-1">
            <div class="flex min-w-max items-center gap-2 pr-2">
              <button
                type="button"
                class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                :class="quickPaymentFilter === 'all' && reimbursementLinkFilter === 'all' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                @click="applyQuickAllFilters"
              >
                Todos
              </button>
              <button
                type="button"
                class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                :class="quickPaymentFilter === 'account' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                @click="applyQuickPaymentFilter('account')"
              >
                Conta
              </button>
              <button
                type="button"
                class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                :class="quickPaymentFilter === 'cards' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                @click="applyQuickPaymentFilter('cards')"
              >
                Cartões
              </button>
              <button
                v-for="entry in activeCardsForQuickFilter"
                :key="`quick-card-${entry.id}`"
                type="button"
                class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                :class="quickPaymentFilter === `card:${entry.id}` ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                @click="applyQuickPaymentFilter(`card:${entry.id}`)"
              >
                {{ entry.name }}
              </button>
              <button
                type="button"
                class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                :class="reimbursementLinkFilter === 'linked' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                @click="applyQuickReimbursementFilter"
              >
                Reembolso
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Tipo rápido</span>
          <AppButton
            label="Todos"
            size="sm"
            :variant="quickTypeFilter === 'all' ? 'secondary' : 'ghost'"
            @click="quickTypeFilter = 'all'"
          />
          <AppButton
            label="Entrada"
            size="sm"
            :variant="quickTypeFilter === 'income' ? 'secondary' : 'ghost'"
            @click="quickTypeFilter = 'income'"
          />
          <AppButton
            label="Saída"
            size="sm"
            :variant="quickTypeFilter === 'expense' ? 'secondary' : 'ghost'"
            @click="quickTypeFilter = 'expense'"
          />
          <span
            v-if="quickPaymentFilter !== 'all' || reimbursementLinkFilter === 'linked'"
            class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-xs font-medium text-muted"
          >
            {{ reimbursementLinkFilter === 'linked' ? 'Pagamento rápido: Reembolso' : `Pagamento rápido: ${getQuickPaymentFilterLabel(quickPaymentFilter)}` }}
          </span>
          <span class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground">
            Total filtrado: {{ formatCurrency(filteredTotalValue) }}
          </span>
        </div>
      </div>
    </AppCard>

    <AppModal
      v-model="isFiltersModalOpen"
      title="Filtros"
      description="Aplique os filtros para atualizar os resultados da tabela."
      max-width-class="max-w-3xl"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-medium text-foreground">
            <input v-model="draftAllPeriods" type="checkbox" class="h-4 w-4 rounded border-border" />
            Todos os períodos
          </label>
          <p class="text-xs text-muted">Marque para visualizar todos os lançamentos sem filtro de mês e ano.</p>
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Ano</label>
            <select v-model="draftFilterYear" :disabled="draftAllPeriods" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60">
              <option v-for="year in filterYearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Mês</label>
            <select v-model="draftFilterMonth" :disabled="draftAllPeriods" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60">
              <option v-for="option in filterMonthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Cartão</label>
            <select v-model="draftCardFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="all">Todos</option>
              <option v-for="entry in cards" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Responsável</label>
            <select v-model="draftPersonFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="all">Todos</option>
              <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Categoria</label>
            <select v-model="draftCategoryFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="all">Todas</option>
              <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Conta</label>
            <select v-model="draftAccountFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="all">Todas</option>
              <option v-for="entry in accounts" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Status</label>
            <select v-model="draftStatusFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="all">Todos</option>
              <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ transactionStatusLabelMap[entry] }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Vinculo</label>
            <select v-model="draftReimbursementLinkFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="all">Todos</option>
              <option value="normal">Normais</option>
              <option value="linked">Vinculados / reembolsos</option>
            </select>
          </div>
        </div>

        <p v-if="filtersModalError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ filtersModalError }}</p>
      </div>

      <template #footer>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Limpar filtros" variant="ghost" @click="clearFilters" />
          <AppButton label="Aplicar filtros" variant="secondary" @click="applyFilters" />
        </div>
      </template>
    </AppModal>

    <AppModal
      v-model="isExportPreviewOpen"
      title="Preview de exportacao"
      description="Revise os lancamentos filtrados antes de salvar imagem ou exportar PDF."
      max-width-class="max-w-6xl"
    >
      <div class="space-y-4">
        <div class="rounded-xl border border-border/80 bg-primary-light/10 px-4 py-2 text-[11px] text-muted">
          O preview abaixo e exatamente o mesmo layout exportado em PNG e PDF.
        </div>

        <div class="flex justify-center">
          <div ref="exportPreviewRef" class="w-full max-w-5xl rounded-xl border border-border bg-[#f6f7f2] p-6 text-[#2f3526] shadow-soft">
            <div class="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-4">
              <div class="flex min-w-[240px] items-center gap-3">
                <img src="/pwrdevs-logo.png" alt="PWRDEVS Finance" class="h-12 w-12 rounded-md border border-border/60 bg-[#eef1df] p-1" />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6642]">PWRDEVS Finance</p>
                  <h3 class="text-lg font-semibold text-[#2f3526]">Resumo de lancamentos filtrados</h3>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="inline-flex items-center rounded-full border border-[#8d9c68]/45 bg-[#e8edd5] px-3 py-1 text-xs font-semibold text-[#425030]">
                  {{ filteredRows.length }} itens
                </span>
              </div>
            </div>

            <div class="mt-4 space-y-4">
              <div class="grid gap-3 md:hidden">
                <article
                  v-for="row in filteredRows"
                  :key="`mobile-${row.id}`"
                  class="rounded-lg border border-border/80 bg-[#fdfdf9] p-3 shadow-sm"
                >
                  <div class="flex items-start justify-between gap-3 border-b border-border/70 pb-2">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-wide text-[#66704f]">{{ formatDateBr(row.instance_date) }}</p>
                      <p class="mt-1 text-sm font-semibold leading-5 text-[#2f3526]">{{ row.description_text }}</p>
                    </div>
                    <span class="shrink-0 rounded-full bg-[#e8edd5] px-2.5 py-1 text-[11px] font-semibold text-[#425030]">
                      {{ row.installment_label }}
                    </span>
                  </div>

                  <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-[#4b543f]">
                    <div>
                      <dt class="uppercase tracking-wide text-[#7a8466]">Responsável</dt>
                      <dd class="mt-0.5 whitespace-nowrap text-sm font-medium text-[#2f3526]">{{ row.person_name }}</dd>
                    </div>
                    <div>
                      <dt class="uppercase tracking-wide text-[#7a8466]">Categoria</dt>
                      <dd class="mt-0.5 text-sm font-medium text-[#2f3526]">{{ row.category_name }}</dd>
                    </div>
                    <div>
                      <dt class="uppercase tracking-wide text-[#7a8466]">Cartão</dt>
                      <dd class="mt-0.5 text-sm font-medium text-[#2f3526]">{{ row.card_name }}</dd>
                    </div>
                    <div>
                      <dt class="uppercase tracking-wide text-[#7a8466]">Vínculo</dt>
                      <dd class="mt-0.5 text-sm font-medium text-[#2f3526]">{{ row.link_badge }}</dd>
                    </div>
                    <div class="col-span-2 flex items-center justify-between rounded-md bg-[#eef2de] px-3 py-2">
                      <span class="text-[11px] font-semibold uppercase tracking-wide text-[#66704f]">Valor</span>
                      <span class="text-sm font-semibold tabular-nums text-[#2f3526] whitespace-nowrap">{{ formatCurrency(getEffectiveValue(row as TransactionInstanceItem)) }}</span>
                    </div>
                  </dl>
                </article>

                <div class="rounded-lg border border-border/80 bg-[#c0cf8f] px-4 py-3 text-[#2f3526] shadow-sm">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-semibold uppercase tracking-wide">Total</span>
                    <span class="text-base font-semibold tabular-nums whitespace-nowrap">{{ formatCurrency(exportTotalEffective) }}</span>
                  </div>
                </div>
              </div>

              <div class="hidden overflow-hidden rounded-lg border border-border/80 bg-[#fdfdf9] md:block">
                <div class="overflow-x-auto">
                  <table class="w-full table-fixed text-xs text-[#2f3526]">
                  <colgroup>
                    <col class="w-[12%]" />
                    <col class="w-[27%]" />
                    <col class="w-[15%]" />
                    <col class="w-[14%]" />
                    <col class="w-[11%]" />
                    <col class="w-[7%]" />
                    <col class="w-[14%]" />
                  </colgroup>
                  <thead>
                    <tr class="bg-[#d7e0b5] text-[11px] font-semibold uppercase tracking-wide text-[#334127]">
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Data</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Descricao</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle whitespace-nowrap">Responsavel</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Categoria</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Cartao</th>
                      <th class="border-b border-border/80 px-3 py-2 text-center align-middle">Parcela</th>
                      <th class="border-b border-border/80 px-3 py-2 text-right align-middle whitespace-nowrap">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in filteredRows"
                      :key="row.id"
                      class="border-b border-border/70 text-[#2f3526] odd:bg-[#fdfdf9] even:bg-[#f3f6e7]"
                    >
                      <td class="px-3 py-2.5 text-left align-middle">{{ formatDateBr(row.instance_date) }}</td>
                      <td class="px-3 py-2.5 text-left align-middle">{{ row.description_text }}</td>
                      <td class="px-3 py-2.5 text-left align-middle whitespace-nowrap">{{ row.person_name }}</td>
                      <td class="px-3 py-2.5 text-left align-middle">{{ row.category_name }}</td>
                      <td class="px-3 py-2.5 text-left align-middle">{{ row.card_name }}</td>
                      <td class="px-3 py-2.5 text-center align-middle">{{ row.installment_label }}</td>
                      <td class="px-3 py-2.5 text-right align-middle tabular-nums whitespace-nowrap">{{ formatCurrency(getEffectiveValue(row as TransactionInstanceItem)) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="bg-[#c0cf8f] font-semibold text-[#2f3526]">
                      <td colspan="6" class="px-3 py-3 text-right align-middle">Total</td>
                      <td class="px-3 py-3 text-right align-middle text-xs tabular-nums whitespace-nowrap">{{ formatCurrency(exportTotalEffective) }}</td>
                    </tr>
                  </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Fechar" variant="ghost" block @click="isExportPreviewOpen = false" />
          <AppButton :label="exportingImage ? 'Exportando PNG...' : 'Exportar PNG'" variant="secondary" :disabled="exportingImage" block @click="savePreviewAsImage" />
          <AppButton :label="exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'" :disabled="exportingPdf" block @click="exportPreviewPdf" />
        </div>
      </template>
    </AppModal>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Tabela de lançamentos" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <div class="overflow-x-auto">
        <AppTable :columns="columns" :rows="filteredRows" empty-message="Nenhum lançamento encontrado.">
          <template #cell-instance_date="{ row, value }">
            <div class="flex items-center gap-2">
              <span
                class="h-2.5 w-2.5 rounded-full"
                :class="getRowAlertClass(row as TransactionInstanceItem)"
                :title="getRowAlertLabel(row as TransactionInstanceItem)"
                aria-hidden="true"
              />
              <span>{{ formatDateBr(String(value)) }}</span>
            </div>
          </template>

          <template #cell-card_name="{ row }">
            <div class="space-y-1">
              <p>{{ (row as { card_name: string }).card_name }}</p>
              <span
                v-if="(row as TransactionInstanceItem).card_id"
                class="inline-flex rounded-full border border-border/80 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                FATURA: {{ (row as { financial_competence_label?: string }).financial_competence_label }}
              </span>
              <span
                v-else-if="Boolean((row as TransactionInstanceItem).linked_financial_competence_label)"
                class="inline-flex rounded-full border border-border/80 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                FATURA: {{ (row as { linked_financial_competence_label?: string | null }).linked_financial_competence_label }}
              </span>
            </div>
          </template>

          <template #cell-checked_toggle="{ row }">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border"
              :checked="Boolean((row as TransactionInstanceItem).is_checked)"
              :disabled="rowActionBusy"
              @change="toggleChecked(row as TransactionInstanceItem)"
            />
          </template>

          <template #cell-expected_value="{ value }">
            {{ formatCurrency(Number(value)) }}
          </template>

          <template #cell-real_value_input="{ row }">
            <input
              class="h-9 w-28 rounded-lg border border-border bg-surface px-2 text-right text-xs text-foreground"
              :value="getRealDraftValue(row as TransactionInstanceItem)"
              type="number"
              :disabled="rowActionBusy"
              @input="onRealDraftInput((row as TransactionInstanceItem).id, ($event.target as HTMLInputElement).value)"
              @blur="saveInlineRealValue(row as TransactionInstanceItem)"
              @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            />
          </template>

          <template #cell-status_select="{ row }">
            <select
              class="h-9 w-36 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
              :value="(row as TransactionInstanceItem).status"
              :disabled="rowActionBusy"
              @change="changeStatus((row as TransactionInstanceItem), ($event.target as HTMLSelectElement).value as TransactionStatus)"
            >
              <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ transactionStatusLabelMap[entry] }}</option>
            </select>
          </template>

          <template #cell-link_badge="{ row }">
            <span
              class="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold"
              :class="
                (row as TransactionInstanceItem).reimbursement_role === 'original'
                  ? 'bg-amber-100 text-amber-800'
                  : (row as TransactionInstanceItem).reimbursement_role === 'reimbursement'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
              "
            >
              {{ (row as TransactionInstanceItem).reimbursement_role === 'original'
                ? 'Original'
                : (row as TransactionInstanceItem).reimbursement_role === 'reimbursement'
                  ? 'Reembolso'
                  : 'Normal' }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-2">
              <AppButton
                size="sm"
                variant="ghost"
                aria-label="Editar lancamento"
                title="Editar"
                :disabled="rowActionBusy"
                @click="openEditModal(row as TransactionInstanceItem)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="m16.5 3.5 4 4L7 21H3v-4z" />
                </svg>
              </AppButton>
              <AppButton
                size="sm"
                variant="danger"
                aria-label="Deletar lancamento"
                title="Deletar"
                :disabled="rowActionBusy"
                @click="handleDeleteClick(row as TransactionInstanceItem)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </AppButton>
            </div>
          </template>
        </AppTable>
      </div>
    </AppCard>

    <AppModal
      v-model="isModalOpen"
      :title="editingRow ? 'Editar lancamento' : 'Novo lancamento'"
      description="Preencha os dados por secoes para manter consistencia financeira."
      max-width-class="max-w-3xl"
    >
      <div class="space-y-5">
        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">1) Dados principais</p>
          <AppInput v-model="formTitle" label="Descricao" placeholder="Ex.: Mercado" required />

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Tipo do lancamento</label>
            <select v-model="formOriginType" :disabled="Boolean(editingRow)" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60">
              <option v-for="entry in originTypeOptions" :key="entry.value" :value="entry.value">{{ entry.label }}</option>
            </select>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">2) Valores</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formExpectedValue" :label="expectedValueLabel" type="number" placeholder="0.00" required />
            <AppInput v-model="formRealValue" label="Valor realizado (edicao)" type="number" placeholder="Sera igual ao previsto na criacao" />
          </div>
          <p v-if="expectedValueHelpText" class="text-xs text-muted">
            {{ expectedValueHelpText }}
          </p>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">3) Classificacao</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Responsavel</label>
              <select v-model="formPersonId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="">Nenhum</option>
                <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Categoria</label>
              <select v-model="formCategoryId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" required>
                <option value="">Selecione</option>
                <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Forma de pagamento</label>
              <select v-model="formPaymentMethod" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" required>
                <option value="">Selecione</option>
                <option v-for="entry in paymentMethodOptions" :key="entry.value" :value="entry.value">{{ entry.label }}</option>
              </select>
            </div>
          </div>

          <p v-if="selectedCategoryType" class="text-xs text-muted">
            Tipo financeiro definido automaticamente pela categoria: <strong>{{ selectedCategoryType === 'income' ? 'Receita' : 'Despesa' }}</strong>
          </p>

          <div v-if="selectedCard" class="rounded-xl border border-border bg-surface px-3 py-3 text-sm text-foreground">
            <p class="font-semibold">{{ selectedCard.name }}</p>
            <p class="mt-1 text-xs text-muted">Fechamento: dia {{ selectedCard.closing_day ?? '-' }} · Vencimento: dia {{ selectedCard.due_day ?? '-' }}</p>
            <p class="mt-1 text-xs text-muted">Proxima cobranca: {{ nextCardBillingLabel }}</p>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">4) Datas e repeticao</p>

          <div v-if="formOriginType === 'single'" class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formPurchaseDate" label="Data da compra" type="date" required />
          </div>

          <div v-if="showInstallmentSelector" class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formInstallmentTotal" label="Parcelas" type="number" placeholder="1 a 24" required />
          </div>

          <div v-if="formOriginType === 'recurring'" class="space-y-3 rounded-xl border border-border p-3">
            <div class="grid gap-4 sm:grid-cols-2">
              <AppInput v-model="formRecurringStartDate" label="Data inicial" type="date" required />

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Frequencia</label>
                <select v-model="formRecurringFrequency" :disabled="Boolean(editingRow)" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60">
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Encerrar recorrência por</label>
              <select v-model="formRecurringEndingMode" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="count">Quantidade</option>
                <option value="end_date">Data final</option>
              </select>
            </div>

            <AppInput
              v-if="formRecurringEndingMode === 'end_date'"
              v-model="formRecurringEndDate"
              label="Data final"
              type="date"
            />

            <AppInput
              v-if="formRecurringEndingMode === 'count'"
              v-model="formRecurringOccurrences"
              label="Quantidade de recorrências"
              type="number"
              placeholder="Ex.: 4"
            />

            <p v-if="editingRow" class="text-xs text-muted">
              A frequência permanece travada na edição para evitar distorcer instâncias recorrentes já geradas.
            </p>
          </div>

        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">5) Reembolso / Repasse</p>

          <label v-if="!editingRow && canGenerateReimbursement" class="flex items-center gap-2 text-sm text-foreground">
            <input v-model="formGenerateReimbursement" type="checkbox" class="h-4 w-4 rounded border-border" />
            Gerar entrada de reembolso/repasse
          </label>

          <div v-if="!editingRow && canGenerateReimbursement && formGenerateReimbursement" class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Responsavel pela entrada</label>
              <select v-model="formReimbursementPersonId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="">Nenhum</option>
                <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Conta de recebimento</label>
              <select v-model="formReimbursementAccountId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="">Nenhuma</option>
                <option v-for="entry in accounts" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <AppInput v-model="formReimbursementValue" label="Valor da entrada" type="number" placeholder="0.00" />
            <AppInput v-model="formReimbursementDescription" label="Descricao da entrada" placeholder="Reembolso - Despesa" />
            <AppInput v-model="formReimbursementDate" label="Data de recebimento (opcional)" type="date" />
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">6) Observacoes</p>
          <AppInput v-model="formDescription" label="Observacoes" placeholder="Detalhes opcionais" />
        </section>

        <p v-if="modalError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ modalError }}</p>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Cancelar" variant="ghost" block @click="isModalOpen = false" />
          <AppButton :label="saving ? 'Salvando...' : 'Salvar'" :disabled="saving" block @click="submitForm" />
        </div>
      </template>
    </AppModal>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isScopeModalOpen" class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" @click="closeScopeDecisionModal" />
      </Transition>

      <Transition name="slide-up">
        <div v-if="isScopeModalOpen" class="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-3xl bg-[#16181a] p-5 shadow-2xl ring-1 ring-white/10">
            <h3 class="text-lg font-semibold text-white">{{ scopeModalTitle }}</h3>

            <div class="mt-4 grid gap-3">
              <button
                type="button"
                class="h-12 rounded-2xl bg-white text-sm font-semibold text-[#111315] transition hover:bg-white/90 disabled:opacity-60"
                :disabled="scopeModalSaving"
                @click="confirmScopeDecision('single')"
              >
                {{ scopeModalSingleLabel }}
              </button>

              <button
                type="button"
                class="h-12 rounded-2xl bg-[#2a2f34] text-sm font-semibold text-white transition hover:bg-[#353b41] disabled:opacity-60"
                :disabled="scopeModalSaving"
                @click="confirmScopeDecision('future')"
              >
                {{ scopeModalFutureLabel }}
              </button>

              <button
                type="button"
                class="mt-1 h-11 rounded-2xl border border-white/20 bg-transparent text-sm font-semibold text-white/90 transition hover:bg-white/10"
                :disabled="scopeModalSaving"
                @click="closeScopeDecisionModal"
              >
                Voltar
              </button>
            </div>

            <p v-if="scopeModalError" class="mt-3 rounded-xl bg-rose-200/15 px-3 py-2 text-xs text-rose-200">{{ scopeModalError }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AppModal
      v-model="isDeleteConfirmModalOpen"
      title="Confirmar exclusao"
      :description="deleteConfirmDescription"
      max-width-class="max-w-md"
    >
      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Voltar" variant="ghost" :disabled="rowActionBusy" block @click="closeDeleteConfirmModal" />
          <AppButton label="Excluir" variant="danger" :disabled="rowActionBusy" block @click="confirmDeleteSingleTransaction" />
        </div>
      </template>
    </AppModal>
  </section>
</template>
