<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import FilterToolbar from '~/components/common/FilterToolbar.vue'
import {
  type RecurringEndMode,
  type RecurringFrequency,
  TRANSACTION_STATUS,
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
  moveTransactionInstanceToNextFinancialCompetence,
  setStatus,
  updateTransactionStatuses,
  updateInstallmentTransaction,
  updateRecurringTransaction,
  updateTransactionInstance
} = useTransactions()

const loading = ref(false)
const saving = ref(false)
const exportingCsv = ref(false)
const exportingPng = ref(false)
const rowActionBusy = ref(false)
const bulkActionBusy = ref(false)
const ACTIVE_TAB_STORAGE_KEY = 'transactions.activeTab'
const CARDS_FILTERS_STORAGE_KEY = 'transactions.cards.filters'
const ACCOUNTS_FILTERS_STORAGE_KEY = 'transactions.accounts.filters'
const LEGACY_CARDS_FILTERS_STORAGE_KEY = 'transactions.filters.cards'
const LEGACY_ACCOUNTS_FILTERS_STORAGE_KEY = 'transactions.filters.accounts'
const pageError = ref('')
const pageNotice = ref('')
const toastMessage = ref('')
const toastTone = ref<'success' | 'warning' | 'error'>('success')
const toastVisible = ref(false)
const modalError = ref('')
const isExportPreviewOpen = ref(false)
const exportPreviewRef = ref<HTMLElement | null>(null)
const isAdvancedFiltersOpen = ref(false)
const filtersPopoverRef = ref<HTMLElement | null>(null)
const filtersButtonRef = ref<HTMLElement | null>(null)
const selectedRowIds = ref<string[]>([])
let toastTimeoutHandle: ReturnType<typeof setTimeout> | null = null

const route = useRoute()
const router = useRouter()

function normalizeTabQuery(rawTab: unknown): 'cards' | 'accounts' | null {
  const tabQuery = typeof rawTab === 'string' ? rawTab.toLowerCase() : ''

  if (tabQuery === 'cards' || tabQuery === 'card' || tabQuery === 'cartao' || tabQuery === 'cartão') {
    return 'cards'
  }

  if (tabQuery === 'accounts' || tabQuery === 'account' || tabQuery === 'conta') {
    return 'accounts'
  }

  return null
}

const routeLockedTab = computed(() => normalizeTabQuery(route.query.tab))
const isTabLocked = computed(() => routeLockedTab.value !== null)
const lockedTabLabel = computed(() => routeLockedTab.value === 'accounts' ? 'Conta' : 'Cartão')

const monthYear = ref(new Date().toISOString().slice(0, 7))
const activeTab = ref<'cards' | 'accounts'>(normalizeTabQuery(route.query.tab) ?? 'cards')
const { month: initialPeriodMonth, year: initialPeriodYear } = parseMonthYear(monthYear.value)
const cardsPeriodMonth = ref(String(initialPeriodMonth).padStart(2, '0'))
const cardsPeriodYear = ref(String(initialPeriodYear))
const accountsPeriodMonth = ref(String(initialPeriodMonth).padStart(2, '0'))
const accountsPeriodYear = ref(String(initialPeriodYear))

const cardsPeriodFilter = ref<string | 'all'>(monthYear.value)
const cardsCardFilter = ref('all')
const cardsPersonFilter = ref('all')
const cardsInstallmentFilter = ref<'all' | 'installment' | 'single'>('all')
const cardsStatusFilter = ref<'all' | TransactionStatus>('all')
const cardsReimbursementLinkFilter = ref<'all' | 'normal' | 'reimbursement' | 'linked'>('all')
const cardsSearchDescription = ref('')
const cardsValueMin = ref('')
const cardsValueMax = ref('')
const cardsDayStart = ref('')
const cardsDayEnd = ref('')

const accountsPeriodFilter = ref<string | 'all'>(monthYear.value)
const accountsAccountFilter = ref('all')
const accountsPersonFilter = ref('all')
const accountsTypeFilter = ref<'all' | TransactionType>('all')
const accountsCategoryFilter = ref('all')
const accountsStatusFilter = ref<'all' | TransactionStatus>('all')
const accountsReimbursementLinkFilter = ref<'all' | 'normal' | 'reimbursement' | 'linked'>('all')
const accountsSearchDescription = ref('')
const accountsValueMin = ref('')
const accountsValueMax = ref('')
const accountsDayStart = ref('')
const accountsDayEnd = ref('')

const rows = ref<TransactionInstanceItem[]>([])
const people = ref<PersonItem[]>([])
const accounts = ref<AccountItem[]>([])
const cards = ref<CardItem[]>([])
const categories = ref<CategoryItem[]>([])

const realValueDrafts = ref<Record<string, string>>({})

const isModalOpen = ref(false)
const isMoveModalOpen = ref(false)
const isScopeModalOpen = ref(false)
const pendingMoveRow = ref<TransactionInstanceItem | null>(null)
const editingRow = ref<TransactionInstanceItem | null>(null)
const scopeModalTitle = ref('Confirmar ação')
const scopeModalDescription = ref('Escolha como deseja aplicar esta ação.')
const scopeModalSingleLabel = ref('Aplicar apenas este')
const scopeModalFutureLabel = ref('Aplicar este e os próximos')
const scopeModalAllowFuture = ref(true)
let scopeModalResolver: ((value: 'single' | 'future' | null) => void) | null = null

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
  { key: 'selection', label: '', align: 'center' as const },
  { key: 'instance_date', label: 'Data', widthClass: 'w-[108px]' },
  { key: 'description_text', label: 'Descricao', widthClass: 'w-[240px]' },
  { key: 'link_badge', label: 'Vinculo', widthClass: 'w-[96px]' },
  { key: 'person_name', label: 'Responsavel', widthClass: 'w-[132px]' },
  { key: 'category_name', label: 'Categoria', widthClass: 'w-[132px]' },
  { key: 'card_name', label: 'Cartao', widthClass: 'w-[128px]' },
  { key: 'expected_value', label: 'Previsto', align: 'right' as const, widthClass: 'w-[110px]' },
  { key: 'installment_label', label: 'Parcela', widthClass: 'w-[92px]' },
  { key: 'real_value_input', label: 'Realizado', align: 'right' as const, widthClass: 'w-[114px]' },
  { key: 'status_select', label: 'Status', widthClass: 'w-[120px]' },
  { key: 'actions', label: 'Acoes', align: 'right' as const, widthClass: 'w-[132px]' }
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

const activePeriodFilter = computed(() => activeTab.value === 'cards' ? cardsPeriodFilter.value : accountsPeriodFilter.value)
const activeSearchDescription = computed(() => activeTab.value === 'cards' ? cardsSearchDescription.value : accountsSearchDescription.value)
const activeSearchDescriptionModel = computed({
  get: () => activeSearchDescription.value,
  set: (value: string) => {
    if (activeTab.value === 'cards') {
      cardsSearchDescription.value = value
      return
    }

    accountsSearchDescription.value = value
  }
})

const activePaymentFilterModel = computed({
  get: () => activeTab.value === 'cards' ? cardsCardFilter.value : accountsAccountFilter.value,
  set: (value: string) => {
    if (activeTab.value === 'cards') {
      cardsCardFilter.value = value
      return
    }

    accountsAccountFilter.value = value
  }
})

const activePersonFilterModel = computed({
  get: () => activeTab.value === 'cards' ? cardsPersonFilter.value : accountsPersonFilter.value,
  set: (value: string) => {
    if (activeTab.value === 'cards') {
      cardsPersonFilter.value = value
      return
    }

    accountsPersonFilter.value = value
  }
})

const activeStatusFilterModel = computed({
  get: () => activeTab.value === 'cards' ? cardsStatusFilter.value : accountsStatusFilter.value,
  set: (value: 'all' | TransactionStatus) => {
    if (activeTab.value === 'cards') {
      cardsStatusFilter.value = value
      return
    }

    accountsStatusFilter.value = value
  }
})

const activeLinkFilterModel = computed({
  get: () => activeTab.value === 'cards' ? cardsReimbursementLinkFilter.value : accountsReimbursementLinkFilter.value,
  set: (value: 'all' | 'normal' | 'reimbursement' | 'linked') => {
    if (activeTab.value === 'cards') {
      cardsReimbursementLinkFilter.value = value
      return
    }

    accountsReimbursementLinkFilter.value = value
  }
})

const recordsCountLabel = computed(() => `${filteredIndicators.value.launches} registro(s)`)

const toastClass = computed(() => {
  if (toastTone.value === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  if (toastTone.value === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
})

const selectedPeriodLabel = computed(() => {
  if (activePeriodFilter.value === 'all') {
    return 'Todos os períodos'
  }

  const [year, month] = activePeriodFilter.value.split('-')
  const monthOption = filterMonthOptions.find(entry => entry.value === month)
  return monthOption ? `${monthOption.label} ${year}` : activePeriodFilter.value
})
const selectedPeriodMonthKey = computed(() => {
  if (activePeriodFilter.value === 'all') {
    return null
  }

  return activePeriodFilter.value
})
const isDayRangeAvailable = computed(() => activePeriodFilter.value !== 'all')

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
const activeAccountsForQuickFilter = computed(() => accounts.value.filter(entry => entry.is_active))
const activePeopleForQuickFilter = computed(() => people.value.filter(entry => entry.is_active))

const reimbursementOriginalCardMap = computed(() => {
  const map = new Map<string, string>()

  for (const row of rows.value) {
    if (row.reimbursement_group_id && row.reimbursement_role === 'original' && row.card_id) {
      map.set(row.reimbursement_group_id, row.card_id)
    }
  }

  return map
})

const shouldAskScopeForEdit = computed(() => {
  const originType = editingRow.value?.origin_type
  return originType === 'recurring' || originType === 'installment'
})

interface PersistedCardsFilters {
  period_filter: string | 'all'
  card_filter: string
  person_filter: string
  installment_filter: 'all' | 'installment' | 'single'
  status_filter: 'all' | TransactionStatus
  reimbursement_link_filter: 'all' | 'normal' | 'reimbursement' | 'linked'
  search_description: string
  value_min: string
  value_max: string
  day_start: string
  day_end: string
}

interface PersistedAccountsFilters {
  period_filter: string | 'all'
  account_filter: string
  person_filter: string
  type_filter: 'all' | TransactionType
  category_filter: string
  status_filter: 'all' | TransactionStatus
  reimbursement_link_filter: 'all' | 'normal' | 'reimbursement' | 'linked'
  search_description: string
  value_min: string
  value_max: string
  day_start: string
  day_end: string
}

function isValidMonthYear(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function isValidStatusFilter(value: string): value is 'all' | TransactionStatus {
  return value === 'all' || TRANSACTION_STATUS.includes(value as TransactionStatus)
}

function isValidReimbursementLinkFilter(value: string): value is 'all' | 'normal' | 'reimbursement' | 'linked' {
  return value === 'all' || value === 'normal' || value === 'reimbursement' || value === 'linked'
}

function isValidTypeFilter(value: string): value is 'all' | TransactionType {
  return value === 'all' || value === 'income' || value === 'expense'
}

function pickPersistedOption(value: string, allowedIds: string[]) {
  if (value === 'all') {
    return 'all'
  }

  return allowedIds.includes(value) ? value : 'all'
}

function normalizeFilterText(value: unknown) {
  if (value == null) {
    return ''
  }

  return String(value).trim()
}

function saveActiveTabToStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab.value)
}

function saveCardsFiltersToStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const payload: PersistedCardsFilters = {
    period_filter: cardsPeriodFilter.value,
    card_filter: cardsCardFilter.value,
    person_filter: cardsPersonFilter.value,
    installment_filter: cardsInstallmentFilter.value,
    status_filter: cardsStatusFilter.value,
    reimbursement_link_filter: cardsReimbursementLinkFilter.value,
    search_description: cardsSearchDescription.value.trim(),
    value_min: normalizeFilterText(cardsValueMin.value),
    value_max: normalizeFilterText(cardsValueMax.value),
    day_start: normalizeFilterText(cardsDayStart.value),
    day_end: normalizeFilterText(cardsDayEnd.value)
  }

  window.localStorage.setItem(CARDS_FILTERS_STORAGE_KEY, JSON.stringify(payload))
}

function saveAccountsFiltersToStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const payload: PersistedAccountsFilters = {
    period_filter: accountsPeriodFilter.value,
    account_filter: accountsAccountFilter.value,
    person_filter: accountsPersonFilter.value,
    type_filter: accountsTypeFilter.value,
    category_filter: accountsCategoryFilter.value,
    status_filter: accountsStatusFilter.value,
    reimbursement_link_filter: accountsReimbursementLinkFilter.value,
    search_description: accountsSearchDescription.value.trim(),
    value_min: normalizeFilterText(accountsValueMin.value),
    value_max: normalizeFilterText(accountsValueMax.value),
    day_start: normalizeFilterText(accountsDayStart.value),
    day_end: normalizeFilterText(accountsDayEnd.value)
  }

  window.localStorage.setItem(ACCOUNTS_FILTERS_STORAGE_KEY, JSON.stringify(payload))
}

function clearCardsFiltersStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(CARDS_FILTERS_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_CARDS_FILTERS_STORAGE_KEY)
}

function clearAccountsFiltersStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ACCOUNTS_FILTERS_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_ACCOUNTS_FILTERS_STORAGE_KEY)
}

function restoreActiveTabFromStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const savedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)

  if (savedTab === 'cards' || savedTab === 'accounts') {
    activeTab.value = savedTab
  }
}

function restoreCardsFiltersFromStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const raw = window.localStorage.getItem(CARDS_FILTERS_STORAGE_KEY)
    ?? window.localStorage.getItem(LEGACY_CARDS_FILTERS_STORAGE_KEY)

  if (!raw) {
    return
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedCardsFilters>
    cardsPeriodFilter.value = typeof parsed.period_filter === 'string' && (parsed.period_filter === 'all' || isValidMonthYear(parsed.period_filter))
      ? parsed.period_filter
      : monthYear.value
    if (cardsPeriodFilter.value !== 'all') {
      const { month, year } = parseMonthYear(cardsPeriodFilter.value)
      cardsPeriodMonth.value = String(month).padStart(2, '0')
      cardsPeriodYear.value = String(year)
    }
    cardsCardFilter.value = pickPersistedOption(String(parsed.card_filter ?? 'all'), cards.value.map(entry => entry.id))
    cardsPersonFilter.value = pickPersistedOption(String(parsed.person_filter ?? 'all'), people.value.map(entry => entry.id))
    cardsInstallmentFilter.value = parsed.installment_filter === 'installment' || parsed.installment_filter === 'single'
      ? parsed.installment_filter
      : 'all'
    cardsStatusFilter.value = typeof parsed.status_filter === 'string' && isValidStatusFilter(parsed.status_filter)
      ? parsed.status_filter
      : 'all'
    cardsReimbursementLinkFilter.value = typeof parsed.reimbursement_link_filter === 'string' && isValidReimbursementLinkFilter(parsed.reimbursement_link_filter)
      ? parsed.reimbursement_link_filter
      : 'all'
    cardsSearchDescription.value = typeof parsed.search_description === 'string' ? parsed.search_description : ''
    cardsValueMin.value = normalizeFilterText(parsed.value_min)
    cardsValueMax.value = normalizeFilterText(parsed.value_max)
    cardsDayStart.value = normalizeFilterText(parsed.day_start)
    cardsDayEnd.value = normalizeFilterText(parsed.day_end)
  } catch {
    clearCardsFiltersStorage()
  }
}

function restoreAccountsFiltersFromStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const raw = window.localStorage.getItem(ACCOUNTS_FILTERS_STORAGE_KEY)
    ?? window.localStorage.getItem(LEGACY_ACCOUNTS_FILTERS_STORAGE_KEY)

  if (!raw) {
    return
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAccountsFilters>
    accountsPeriodFilter.value = typeof parsed.period_filter === 'string' && (parsed.period_filter === 'all' || isValidMonthYear(parsed.period_filter))
      ? parsed.period_filter
      : monthYear.value
    if (accountsPeriodFilter.value !== 'all') {
      const { month, year } = parseMonthYear(accountsPeriodFilter.value)
      accountsPeriodMonth.value = String(month).padStart(2, '0')
      accountsPeriodYear.value = String(year)
    }
    accountsAccountFilter.value = pickPersistedOption(String(parsed.account_filter ?? 'all'), accounts.value.map(entry => entry.id))
    accountsPersonFilter.value = pickPersistedOption(String(parsed.person_filter ?? 'all'), people.value.map(entry => entry.id))
    accountsTypeFilter.value = typeof parsed.type_filter === 'string' && isValidTypeFilter(parsed.type_filter)
      ? parsed.type_filter
      : 'all'
    accountsCategoryFilter.value = pickPersistedOption(String(parsed.category_filter ?? 'all'), categories.value.map(entry => entry.id))
    accountsStatusFilter.value = typeof parsed.status_filter === 'string' && isValidStatusFilter(parsed.status_filter)
      ? parsed.status_filter
      : 'all'
    accountsReimbursementLinkFilter.value = typeof parsed.reimbursement_link_filter === 'string' && isValidReimbursementLinkFilter(parsed.reimbursement_link_filter)
      ? parsed.reimbursement_link_filter
      : 'all'
    accountsSearchDescription.value = typeof parsed.search_description === 'string' ? parsed.search_description : ''
    accountsValueMin.value = normalizeFilterText(parsed.value_min)
    accountsValueMax.value = normalizeFilterText(parsed.value_max)
    accountsDayStart.value = normalizeFilterText(parsed.day_start)
    accountsDayEnd.value = normalizeFilterText(parsed.day_end)
  } catch {
    clearAccountsFiltersStorage()
  }
}

function switchTab(tab: 'cards' | 'accounts') {
  activeTab.value = tab

  if (tab === 'accounts') {
    accountsTypeFilter.value = 'all'
  }

  saveActiveTabToStorage()
  isAdvancedFiltersOpen.value = false
}

function resolveTabFromRouteQuery() {
  return normalizeTabQuery(route.query.tab)
}

function applyTabFromRouteQuery() {
  const routeTab = resolveTabFromRouteQuery()

  if (!routeTab) {
    return
  }

  activeTab.value = routeTab

  if (routeTab === 'accounts') {
    accountsTypeFilter.value = 'all'
  }

  saveActiveTabToStorage()
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

async function clearNewLaunchQueryIfNeeded() {
  if (route.query.new !== '1') {
    return
  }

  const nextQuery = { ...route.query }
  delete nextQuery.new
  await router.replace({ query: nextQuery })
}

async function refreshRowsAfterMutation(options: {
  successMessage?: string
  checkFilteredVisibility?: boolean
  previousFilteredCount?: number
  previousTotalCount?: number
} = {}) {
  await fetchRows()

  const previousFilteredCount = options.previousFilteredCount ?? filteredRows.value.length
  const previousTotalCount = options.previousTotalCount ?? rows.value.length
  const nextFilteredCount = filteredRows.value.length
  const nextTotalCount = rows.value.length
  const createdOutsideCurrentFilter = options.checkFilteredVisibility
    && nextTotalCount > previousTotalCount
    && nextFilteredCount <= previousFilteredCount
  const updatedOutsideCurrentFilter = options.checkFilteredVisibility
    && nextTotalCount === previousTotalCount
    && nextFilteredCount < previousFilteredCount
  const isOutsideCurrentFilter = createdOutsideCurrentFilter || updatedOutsideCurrentFilter

  if (isOutsideCurrentFilter) {
    pageNotice.value = 'Lançamento salvo, mas fora do filtro atual.'
    showToast('Lançamento salvo, mas fora do filtro atual.', 'warning')
    return
  }

  pageNotice.value = ''

  if (options.successMessage) {
    showToast(options.successMessage, 'success')
  }
}

function showToast(message: string, tone: 'success' | 'warning' | 'error' = 'success') {
  toastMessage.value = message
  toastTone.value = tone
  toastVisible.value = true

  if (toastTimeoutHandle) {
    clearTimeout(toastTimeoutHandle)
  }

  toastTimeoutHandle = setTimeout(() => {
    toastVisible.value = false
    toastTimeoutHandle = null
  }, 2600)
}

function toggleAdvancedFilters() {
  isAdvancedFiltersOpen.value = !isAdvancedFiltersOpen.value
}

function closeAdvancedFilters() {
  isAdvancedFiltersOpen.value = false
}

function handleAdvancedFiltersAllPeriodsChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked

  if (activeTab.value === 'cards') {
    cardsPeriodFilter.value = checked ? 'all' : buildPeriodKey(cardsPeriodYear.value, cardsPeriodMonth.value)
    return
  }

  accountsPeriodFilter.value = checked ? 'all' : buildPeriodKey(accountsPeriodYear.value, accountsPeriodMonth.value)
}

function handleDocumentClick(event: MouseEvent) {
  if (!isAdvancedFiltersOpen.value) {
    return
  }

  const target = event.target as Node | null

  if (!target) {
    return
  }

  if (filtersPopoverRef.value?.contains(target) || filtersButtonRef.value?.contains(target)) {
    return
  }

  closeAdvancedFilters()
}

function handleDocumentEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeAdvancedFilters()
  }
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

function openMoveModal(row: TransactionInstanceItem) {
  if (rowActionBusy.value) return
  pendingMoveRow.value = row
  isMoveModalOpen.value = true
}

function closeMoveModal() {
  isMoveModalOpen.value = false
  pendingMoveRow.value = null
}

function resolveScopeModal(selection: 'single' | 'future' | null) {
  isScopeModalOpen.value = false

  if (scopeModalResolver) {
    scopeModalResolver(selection)
    scopeModalResolver = null
  }
}

function openScopeModal(options: {
  title: string
  description?: string
  singleLabel: string
  futureLabel?: string
  allowFuture?: boolean
}) {
  if (scopeModalResolver) {
    scopeModalResolver(null)
    scopeModalResolver = null
  }

  scopeModalTitle.value = options.title
  scopeModalDescription.value = options.description ?? 'Escolha como deseja aplicar esta ação.'
  scopeModalSingleLabel.value = options.singleLabel
  scopeModalFutureLabel.value = options.futureLabel ?? 'Aplicar este e os próximos'
  scopeModalAllowFuture.value = options.allowFuture !== false
  isScopeModalOpen.value = true

  return new Promise<'single' | 'future' | null>((resolve) => {
    scopeModalResolver = resolve
  })
}

async function executeMoveTransaction(scope: 'single' | 'future') {
  const row = pendingMoveRow.value
  if (!row) return
  closeMoveModal()
  rowActionBusy.value = true
  try {
    await moveTransactionInstanceToNextFinancialCompetence(row, scope)
    const successMessage = row.card_id
      ? 'Lançamento movido para a próxima fatura.'
      : 'Lançamento movido para o próximo mês.'
    await refreshRowsAfterMutation({ successMessage })
  } catch (err) {
    pageError.value = resolveUnknownErrorMessage(err, 'Nao foi possivel mover o lancamento.')
  } finally {
    rowActionBusy.value = false
  }
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

function parseOptionalMoney(value: unknown) {
  const normalized = normalizeFilterText(value).replace(',', '.')

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOptionalDay(value: unknown) {
  const normalized = normalizeFilterText(value)

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    return null
  }

  return parsed
}

function clearActiveSearch() {
  if (activeTab.value === 'cards') {
    cardsSearchDescription.value = ''
    return
  }

  accountsSearchDescription.value = ''
}

function resolveUnknownErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim()
    if (message) {
      return message
    }
  }

  return fallbackMessage
}

const filteredRows = computed(() => {
  const normalizedSearch = activeSearchDescription.value.trim().toLowerCase()
  const activeValueMin = parseOptionalMoney(activeTab.value === 'cards' ? cardsValueMin.value : accountsValueMin.value)
  const activeValueMax = parseOptionalMoney(activeTab.value === 'cards' ? cardsValueMax.value : accountsValueMax.value)
  const activeDayStart = parseOptionalDay(activeTab.value === 'cards' ? cardsDayStart.value : accountsDayStart.value)
  const activeDayEnd = parseOptionalDay(activeTab.value === 'cards' ? cardsDayEnd.value : accountsDayEnd.value)
  const normalizedDayStart = activeDayStart != null && activeDayEnd != null ? Math.min(activeDayStart, activeDayEnd) : activeDayStart
  const normalizedDayEnd = activeDayStart != null && activeDayEnd != null ? Math.max(activeDayStart, activeDayEnd) : activeDayEnd

  return rows.value
    .filter((row) => {
      if (activeTab.value === 'cards') {
        // Cards tab must represent only card launches/invoice charges.
        return Boolean(row.card_id) && row.reimbursement_role !== 'reimbursement'
      }

      // Accounts tab must include non-card launches and all reimbursements.
      return !row.card_id || row.reimbursement_role === 'reimbursement'
    })
    .filter((row) => {
      if (!selectedPeriodMonthKey.value) {
        return true
      }

      if (activeTab.value === 'cards') {
        return row.financial_effective_date.slice(0, 7) === selectedPeriodMonthKey.value
      }

      return row.instance_date.slice(0, 7) === selectedPeriodMonthKey.value
    })
    .filter((row) => {
      if (activeTab.value === 'cards') {
        if (cardsCardFilter.value === 'all') {
          return true
        }

        const referencedCardId = row.card_id
          ?? (row.reimbursement_group_id ? reimbursementOriginalCardMap.value.get(row.reimbursement_group_id) ?? null : null)

        return referencedCardId === cardsCardFilter.value
      }

      if (accountsAccountFilter.value === 'all') {
        return true
      }

      return row.account_id === accountsAccountFilter.value
    })
    .filter((row) => {
      const activePersonFilter = activeTab.value === 'cards' ? cardsPersonFilter.value : accountsPersonFilter.value
      return activePersonFilter === 'all' || row.person_id === activePersonFilter
    })
    .filter((row) => activeTab.value === 'cards' || accountsTypeFilter.value === 'all' || row.type === accountsTypeFilter.value)
    .filter((row) => activeTab.value === 'cards' || accountsCategoryFilter.value === 'all' || row.category_id === accountsCategoryFilter.value)
    .filter((row) => {
      if (activeTab.value !== 'cards') {
        return true
      }

      if (cardsInstallmentFilter.value === 'installment') {
        return (row.installment_total ?? 1) > 1
      }

      if (cardsInstallmentFilter.value === 'single') {
        return (row.installment_total ?? 1) <= 1
      }

      return true
    })
    .filter((row) => {
      const activeStatusFilter = activeTab.value === 'cards' ? cardsStatusFilter.value : accountsStatusFilter.value
      return activeStatusFilter === 'all' || row.status === activeStatusFilter
    })
    .filter((row) => {
      const activeLinkFilter = activeTab.value === 'cards'
        ? cardsReimbursementLinkFilter.value
        : accountsReimbursementLinkFilter.value

      if (activeLinkFilter === 'normal') {
        return !row.reimbursement_group_id
      }

      if (activeLinkFilter === 'reimbursement') {
        return row.reimbursement_role === 'reimbursement'
      }

      if (activeLinkFilter === 'linked') {
        return Boolean(row.reimbursement_group_id)
      }

      return true
    })
    .filter((row) => {
      if (!isDayRangeAvailable.value) {
        return true
      }

      const dayReference = activeTab.value === 'cards'
        ? row.financial_effective_date
        : row.instance_date

      const dayNumber = Number(dayReference.slice(8, 10))

      if (normalizedDayStart != null && dayNumber < normalizedDayStart) {
        return false
      }

      if (normalizedDayEnd != null && dayNumber > normalizedDayEnd) {
        return false
      }

      return true
    })
    .filter((row) => {
      const effectiveValue = getEffectiveValue(row)

      if (activeValueMin != null && effectiveValue < activeValueMin) {
        return false
      }

      if (activeValueMax != null && effectiveValue > activeValueMax) {
        return false
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
      reference_card_id: row.card_id
        ?? (row.reimbursement_group_id ? reimbursementOriginalCardMap.value.get(row.reimbursement_group_id) ?? null : null),
      installment_label: getInstallmentLabel(row),
      description_text: row.description?.trim() ? `${row.title} - ${row.description}` : row.title,
      person_name: row.person_id ? (peopleMap.value.get(row.person_id) || '-') : '-',
      category_name: row.category_id ? (categoriesMap.value.get(row.category_id) || '-') : '-',
      card_name: (() => {
        const cardId = row.card_id
          ?? (row.reimbursement_group_id ? reimbursementOriginalCardMap.value.get(row.reimbursement_group_id) ?? null : null)
        return cardId ? (cardsMap.value.get(cardId) || '-') : '-'
      })(),
      account_name: row.account_id ? (accountsMap.value.get(row.account_id) || '-') : '-',
      link_badge: row.reimbursement_role === 'original'
        ? 'Original'
        : row.reimbursement_role === 'reimbursement'
          ? 'Reembolso'
          : 'Normal'
    }))
})

const filteredTotalValue = computed(() => filteredRows.value.reduce((sum, row) => sum + getEffectiveValue(row as TransactionInstanceItem), 0))

const filteredIncomeValue = computed(() => {
  return filteredRows.value.reduce((sum, row) => {
    const item = row as TransactionInstanceItem
    return item.type === 'income' ? sum + getEffectiveValue(item) : sum
  }, 0)
})

const filteredExpenseValue = computed(() => {
  return filteredRows.value.reduce((sum, row) => {
    const item = row as TransactionInstanceItem
    return item.type === 'expense' ? sum + getEffectiveValue(item) : sum
  }, 0)
})

const filteredBalanceValue = computed(() => filteredIncomeValue.value - filteredExpenseValue.value)

const filteredIndicators = computed(() => {
  const entries = filteredRows.value as TransactionInstanceItem[]
  const purchaseIds = new Set(entries.map(entry => entry.source_transaction_id ?? entry.id))
  return {
    launches: entries.length,
    purchases: purchaseIds.size,
    reimbursements: entries.filter(entry => entry.reimbursement_role === 'reimbursement').length,
    installment: entries.filter(entry => (entry.installment_total ?? 1) > 1).length,
    single: entries.filter(entry => (entry.installment_total ?? 1) <= 1).length
  }
})

const tableRows = computed(() => filteredRows.value)

const selectionResetKey = computed(() => [
  activeTab.value,
  cardsPeriodFilter.value,
  cardsCardFilter.value,
  cardsPersonFilter.value,
  cardsInstallmentFilter.value,
  cardsStatusFilter.value,
  cardsReimbursementLinkFilter.value,
  cardsSearchDescription.value,
  cardsValueMin.value,
  cardsValueMax.value,
  cardsDayStart.value,
  cardsDayEnd.value,
  accountsPeriodFilter.value,
  accountsAccountFilter.value,
  accountsPersonFilter.value,
  accountsTypeFilter.value,
  accountsCategoryFilter.value,
  accountsStatusFilter.value,
  accountsReimbursementLinkFilter.value,
  accountsSearchDescription.value,
  accountsValueMin.value,
  accountsValueMax.value,
  accountsDayStart.value,
  accountsDayEnd.value
].join('|'))

const selectedVisibleRows = computed(() => filteredRows.value.filter(row => selectedRowIds.value.includes(row.id)))
const selectedVisibleRowCount = computed(() => selectedVisibleRows.value.length)
const allVisibleRowsSelected = computed(() => filteredRows.value.length > 0 && selectedVisibleRowCount.value === filteredRows.value.length)
const someVisibleRowsSelected = computed(() => selectedVisibleRowCount.value > 0 && selectedVisibleRowCount.value < filteredRows.value.length)

const bulkStatusActions = [
  { status: 'paid' as const, label: 'Pago' },
  { status: 'pending' as const, label: 'Pendente' },
  { status: 'skipped' as const, label: 'Ignorado' },
  { status: 'canceled' as const, label: 'Cancelado' }
]

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

function clearSelectedRows() {
  selectedRowIds.value = []
}

watch(selectionResetKey, () => {
  clearSelectedRows()
})

function isRowSelected(rowId: string) {
  return selectedRowIds.value.includes(rowId)
}

function toggleRowSelection(rowId: string, checked: boolean) {
  if (checked) {
    if (!selectedRowIds.value.includes(rowId)) {
      selectedRowIds.value = [...selectedRowIds.value, rowId]
    }
    return
  }

  selectedRowIds.value = selectedRowIds.value.filter(id => id !== rowId)
}

function toggleVisibleRowsSelection(checked: boolean) {
  if (!checked) {
    clearSelectedRows()
    return
  }

  selectedRowIds.value = filteredRows.value.map(row => row.id)
}

async function applyBulkStatus(status: TransactionStatus) {
  if (!selectedVisibleRows.value.length || bulkActionBusy.value) {
    return
  }

  bulkActionBusy.value = true
  pageError.value = ''

  const targetIds = selectedVisibleRows.value.map(row => row.id)

  try {
    await updateTransactionStatuses(targetIds, status)

    rows.value = rows.value.map((entry) => targetIds.includes(entry.id)
      ? { ...entry, status }
      : entry
    )

    clearSelectedRows()
    await refreshRowsAfterMutation({
      successMessage: `${targetIds.length} lançamentos atualizados com sucesso.`
    })
  } catch (err) {
    await fetchRows()
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar os lançamentos.'
  } finally {
    bulkActionBusy.value = false
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

function resolveDefaultFormDate() {
  const activePeriod = activePeriodFilter.value

  if (activePeriod !== 'all' && /^\d{4}-(0[1-9]|1[0-2])$/.test(activePeriod)) {
    return `${activePeriod}-01`
  }

  return `${monthYear.value}-01`
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

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function getCsvFileName() {
  const period = activePeriodFilter.value

  if (activeTab.value === 'cards') {
    return period === 'all'
      ? 'lancamentos-cartoes-todos.csv'
      : `lancamentos-cartoes-${period}.csv`
  }

  return period === 'all'
    ? 'lancamentos-contas-todos.csv'
    : `lancamentos-contas-${period}.csv`
}

function buildCsvLines() {
  const header = [
    'Data real',
    'Competencia/Fatura',
    'Ajuste manual',
    'Descricao',
    'Responsavel',
    'Conta',
    'Cartao',
    'Categoria',
    'Tipo',
    'Previsto',
    'Realizado',
    'Status',
    'Vinculo'
  ]

  const csvLines = [header.map(csvEscape).join(';')]

  for (const row of filteredRows.value) {
    const entry = row as TransactionInstanceItem & {
      description_text: string
      person_name: string
      account_name: string
      card_name: string
      category_name: string
      link_badge: string
    }

    const competenceLabel = activeTab.value === 'cards'
      ? (entry.linked_financial_competence_label ?? entry.financial_competence_label)
      : entry.instance_date
    const hasManualAdjustment = Boolean(entry.financial_effective_date_override)

    csvLines.push([
      entry.instance_date,
      competenceLabel,
      hasManualAdjustment ? 'Fatura ajustada' : '',
      entry.description_text,
      entry.person_name,
      entry.account_name,
      entry.card_name,
      entry.category_name,
      entry.type === 'income' ? 'Entrada' : 'Saida',
      entry.expected_value,
      entry.real_value ?? '',
      transactionStatusLabelMap[entry.status],
      entry.link_badge
    ].map(csvEscape).join(';'))
  }

  return csvLines
}

async function downloadCsvFromPreview() {
  if (!filteredRows.value.length) {
    pageError.value = 'Nao ha lancamentos filtrados para exportar.'
    return
  }

  exportingCsv.value = true
  pageError.value = ''

  try {
    const csvLines = buildCsvLines()

    const blob = new Blob([`\uFEFF${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = getCsvFileName()
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (err) {
    pageError.value = err instanceof Error
      ? `Nao foi possivel exportar CSV. ${err.message}`
      : 'Nao foi possivel exportar CSV.'
  } finally {
    exportingCsv.value = false
  }
}

async function downloadPngFromPreview() {
  if (!exportPreviewRef.value) {
    return
  }

  exportingPng.value = true
  pageError.value = ''

  try {
    const canvas = await renderPreviewCanvas()
    const link = document.createElement('a')
    const imageDate = new Date().toISOString().slice(0, 10)
    link.download = `lancamentos-filtrados-${imageDate}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (err) {
    pageError.value = err instanceof Error
      ? `Nao foi possivel gerar PNG. ${err.message}`
      : 'Nao foi possivel gerar PNG.'
  } finally {
    exportingPng.value = false
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

function openExportPreview() {
  if (!filteredRows.value.length) {
    pageError.value = 'Nao ha lancamentos filtrados para exportar.'
    return
  }

  pageError.value = ''
  isExportPreviewOpen.value = true
}

function resetForm() {
  const defaultFormDate = resolveDefaultFormDate()

  editingRow.value = null
  formTitle.value = ''
  formOriginType.value = 'single'
  formExpectedValue.value = ''
  formRealValue.value = ''
  formPurchaseDate.value = defaultFormDate
  formInstallmentTotal.value = '1'
  formRecurringStartDate.value = defaultFormDate
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
  formRecurringStartDate.value = row.instance_date
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
    await refreshRowsAfterMutation({ successMessage: 'Lançamento excluído com sucesso.' })
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel excluir o lancamento.'
  } finally {
    rowActionBusy.value = false
  }
}

async function handleDeleteClick(row: TransactionInstanceItem) {
  if (rowActionBusy.value) {
    return
  }

  if (row.origin_type === 'recurring' || row.origin_type === 'installment') {
    const scope = await openScopeModal({
      title: 'Excluir lançamento?',
      description: row.title,
      singleLabel: 'Excluir apenas este',
      futureLabel: 'Excluir este e os próximos',
      allowFuture: true
    })

    if (!scope) {
      return
    }

    pageError.value = ''
    rowActionBusy.value = true

    try {
      await removeTransactionInstance(row, scope)
      await refreshRowsAfterMutation({ successMessage: 'Lançamento excluído com sucesso.' })
    } catch (err) {
      pageError.value = err instanceof Error ? err.message : 'Nao foi possivel excluir o lancamento.'
    } finally {
      rowActionBusy.value = false
    }
    return
  }

  const scope = await openScopeModal({
    title: 'Excluir lançamento?',
    description: `${row.title} em ${formatDateBr(row.instance_date)}`,
    singleLabel: 'Excluir lançamento',
    allowFuture: false
  })

  if (scope !== 'single') {
    return
  }

  await deleteSingleTransaction(row)
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

function buildPeriodKey(year: string, month: string) {
  return `${year}-${month}`
}

function filterChipClass(isActive: boolean) {
  return isActive
    ? 'h-8 rounded-full border border-primary-dark bg-primary-dark px-3 text-xs font-semibold text-surface shadow-soft transition'
    : 'h-8 rounded-full border border-border bg-transparent px-3 text-xs font-semibold text-muted transition hover:border-primary-dark/50 hover:text-foreground'
}

function clearActiveTabFilters() {
  if (activeTab.value === 'cards') {
    cardsPeriodFilter.value = monthYear.value
    cardsPeriodMonth.value = monthYear.value.slice(5, 7)
    cardsPeriodYear.value = monthYear.value.slice(0, 4)
    cardsCardFilter.value = 'all'
    cardsPersonFilter.value = 'all'
    cardsInstallmentFilter.value = 'all'
    cardsStatusFilter.value = 'all'
    cardsReimbursementLinkFilter.value = 'all'
    cardsSearchDescription.value = ''
    cardsValueMin.value = ''
    cardsValueMax.value = ''
    cardsDayStart.value = ''
    cardsDayEnd.value = ''
    clearCardsFiltersStorage()
    saveCardsFiltersToStorage()
    return
  }

  accountsPeriodFilter.value = monthYear.value
  accountsPeriodMonth.value = monthYear.value.slice(5, 7)
  accountsPeriodYear.value = monthYear.value.slice(0, 4)
  accountsAccountFilter.value = 'all'
  accountsPersonFilter.value = 'all'
  accountsTypeFilter.value = 'all'
  accountsCategoryFilter.value = 'all'
  accountsStatusFilter.value = 'all'
  accountsReimbursementLinkFilter.value = 'all'
  accountsSearchDescription.value = ''
  accountsValueMin.value = ''
  accountsValueMax.value = ''
  accountsDayStart.value = ''
  accountsDayEnd.value = ''
  clearAccountsFiltersStorage()
  saveAccountsFiltersToStorage()
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

async function handleManualRefresh() {
  if (loading.value || rowActionBusy.value || bulkActionBusy.value) {
    return
  }

  pageNotice.value = ''
  await fetchRows()

  if (!pageError.value) {
    showToast('Tabela atualizada.', 'success')
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

function getStatusSelectClass(status: TransactionStatus) {
  if (status === 'paid') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }

  if (status === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  return 'border-border bg-surface text-foreground'
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

    await refreshRowsAfterMutation()
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
  const purchaseDate = formPurchaseDate.value || editingRow.value?.instance_date || ''
  const instanceDate = formOriginType.value === 'recurring'
    ? formRecurringStartDate.value
    : purchaseDate
  const wasCreating = !editingRow.value
  const previousFilteredCount = filteredRows.value.length
  const previousTotalCount = rows.value.length

  saving.value = true

  try {
    if (editingRow.value) {
      const editPayload = {
        title: formTitle.value,
        type: resolvedType,
        expected_value: parsedExpected,
        real_value: parsedReal,
        due_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : purchaseDate,
        instance_date: instanceDate,
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
        const scope = await openScopeModal({
          title: 'Salvar alterações?',
          description: editingRow.value.title,
          singleLabel: 'Salvar apenas este',
          futureLabel: 'Salvar este e os próximos',
          allowFuture: true
        })

        if (!scope) {
          return
        }

        if (editingRow.value.origin_type === 'recurring') {
          await updateRecurringTransaction(editingRow.value, editPayload, scope)
        } else if (editingRow.value.origin_type === 'installment') {
          await updateInstallmentTransaction(editingRow.value, editPayload, scope)
        } else {
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
        }
      } else {
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
      }
    } else {
      await createTransaction({
        origin_type: resolvedOriginType,
        title: formTitle.value,
        type: resolvedType,
        expected_value: parsedExpected,
        real_value: parsedExpected,
        due_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : purchaseDate,
        instance_date: instanceDate,
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

    await refreshRowsAfterMutation({
      successMessage: wasCreating ? 'Lançamento criado com sucesso.' : 'Lançamento atualizado com sucesso.',
      checkFilteredVisibility: true,
      previousFilteredCount,
      previousTotalCount
    })

    isModalOpen.value = false
    await clearNewLaunchQueryIfNeeded()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Nao foi possivel salvar o lancamento.'
  } finally {
    saving.value = false
  }
}

async function changeStatus(row: TransactionInstanceItem, nextStatus: TransactionStatus) {
  if (rowActionBusy.value) {
    return
  }

  pageError.value = ''

  if ((row.origin_type === 'recurring' || row.origin_type === 'installment') && nextStatus === 'canceled') {
    const scope = await openScopeModal({
      title: 'Cancelar lançamento?',
      description: row.title,
      singleLabel: 'Cancelar apenas este',
      futureLabel: 'Cancelar este e os próximos',
      allowFuture: true
    })

    if (!scope) {
      return
    }

    rowActionBusy.value = true

    try {
      if (row.origin_type === 'recurring') {
        await cancelRecurringTransaction(row, scope)
      } else {
        await cancelInstallmentTransaction(row, scope)
      }

      await refreshRowsAfterMutation({ successMessage: 'Lançamento cancelado com sucesso.' })
    } catch (err) {
      pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar o status.'
    } finally {
      rowActionBusy.value = false
    }
    return
  }

  rowActionBusy.value = true
  patchRowInState(row.id, {
    status: nextStatus
  })

  try {
    await setStatus(row, nextStatus)
    await refreshRowsAfterMutation({
      successMessage: nextStatus === 'canceled' ? 'Lançamento cancelado com sucesso.' : undefined
    })
  } catch (err) {
    patchRowInState(row.id, {
      status: row.status
    })
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar o status.'
  } finally {
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

watch(activeTab, () => {
  saveActiveTabToStorage()
})

watch(isAdvancedFiltersOpen, (open) => {
  if (!open) {
    return
  }

  pageError.value = ''
})

watch([cardsPeriodMonth, cardsPeriodYear], () => {
  cardsPeriodFilter.value = buildPeriodKey(cardsPeriodYear.value, cardsPeriodMonth.value)
})

watch([accountsPeriodMonth, accountsPeriodYear], () => {
  accountsPeriodFilter.value = buildPeriodKey(accountsPeriodYear.value, accountsPeriodMonth.value)
})

watch(
  [cardsPeriodFilter, cardsCardFilter, cardsPersonFilter, cardsInstallmentFilter, cardsStatusFilter, cardsReimbursementLinkFilter, cardsSearchDescription, cardsValueMin, cardsValueMax, cardsDayStart, cardsDayEnd],
  () => {
    saveCardsFiltersToStorage()
  }
)

watch(
  [accountsPeriodFilter, accountsAccountFilter, accountsPersonFilter, accountsTypeFilter, accountsCategoryFilter, accountsStatusFilter, accountsReimbursementLinkFilter, accountsSearchDescription, accountsValueMin, accountsValueMax, accountsDayStart, accountsDayEnd],
  () => {
    saveAccountsFiltersToStorage()
  }
)

watch(
  () => route.query.new,
  async () => {
    await consumeNewLaunchQuery()
  }
)

watch(
  () => route.query.tab,
  () => {
    applyTabFromRouteQuery()
  }
)

onMounted(async () => {
  document.addEventListener('mousedown', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentEscape)

  await fetchOptions()
  restoreActiveTabFromStorage()
  applyTabFromRouteQuery()
  restoreCardsFiltersFromStorage()
  restoreAccountsFiltersFromStorage()
  await fetchRows()
  await consumeNewLaunchQuery()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentEscape)

  if (toastTimeoutHandle) {
    clearTimeout(toastTimeoutHandle)
  }
})
</script>

<template>
  <section class="space-y-5">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toastVisible"
        class="fixed right-4 top-4 z-50 rounded-xl border px-3 py-2 text-xs font-semibold shadow-soft"
        :class="toastClass"
      >
        {{ toastMessage }}
      </div>
    </Transition>

    <AppCard class="sticky top-0 z-40 border-border/90 bg-surface/95 backdrop-blur-sm">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="!isTabLocked">
            <button type="button" :class="filterChipClass(activeTab === 'cards')" @click="switchTab('cards')">Cartão</button>
            <button type="button" :class="filterChipClass(activeTab === 'accounts')" @click="switchTab('accounts')">Conta</button>
          </template>
          <span v-else class="inline-flex h-8 items-center rounded-full border border-primary-dark bg-primary-dark px-3 text-xs font-semibold uppercase tracking-[0.08em] text-surface">{{ lockedTabLabel }}</span>
          <span class="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">{{ selectedPeriodLabel }}</span>
          <span class="inline-flex h-8 items-center rounded-full border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700">{{ formatCurrency(activeTab === 'cards' ? filteredExpenseValue : filteredBalanceValue) }}</span>
          <span class="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-muted">{{ recordsCountLabel }}</span>
        </div>

        <FilterToolbar>
          <template #line1>
            <div class="relative w-full">
              <div class="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/40 p-2">
                <div class="relative min-w-[220px] flex-1">
                  <input v-model="activeSearchDescriptionModel" class="h-9 w-full rounded-xl border border-border bg-surface px-3 pr-8 text-xs text-foreground placeholder:text-muted focus:border-primary-dark focus:outline-none" placeholder="Buscar descrição" type="text">
                  <button v-if="activeSearchDescriptionModel" type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted transition hover:text-foreground" title="Limpar busca" aria-label="Limpar busca" @click="clearActiveSearch">✕</button>
                </div>

                <button
                  ref="filtersButtonRef"
                  type="button"
                  class="inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition"
                  :class="isAdvancedFiltersOpen ? 'border-primary-dark bg-primary-dark text-surface' : 'border-border bg-surface text-muted hover:border-primary-dark/60 hover:text-foreground'"
                  @click="toggleAdvancedFilters"
                >
                  Filtros
                </button>

                <AppButton size="sm" variant="ghost" title="Limpar filtros" aria-label="Limpar filtros" @click="clearActiveTabFilters">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </AppButton>

                <AppButton size="sm" variant="ghost" :disabled="loading" title="Atualizar tabela" aria-label="Atualizar tabela" @click="handleManualRefresh">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 2v6h-6" />
                    <path d="M3 22v-6h6" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L3 8" />
                    <path d="M3.51 15A9 9 0 0 0 18.36 18.36L21 16" />
                  </svg>
                </AppButton>

                <AppButton size="sm" variant="ghost" :disabled="!filteredRows.length" title="Pré-visualizar exportação" aria-label="Pré-visualizar exportação" @click="openExportPreview">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 3v12" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                </AppButton>
              </div>

              <div
                v-if="isAdvancedFiltersOpen"
                ref="filtersPopoverRef"
                class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 w-full rounded-2xl border border-border bg-surface p-3 shadow-soft max-w-[calc(100vw-1rem)] lg:left-auto lg:right-0 lg:w-[min(760px,calc(100vw-1.5rem))]"
              >
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div class="space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Período</p>
                    <div class="grid grid-cols-2 gap-2">
                      <select v-if="activeTab === 'cards'" v-model="cardsPeriodMonth" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                        <option v-for="option in filterMonthOptions" :key="`cards-popover-month-${option.value}`" :value="option.value">{{ option.label }}</option>
                      </select>
                      <select v-if="activeTab === 'cards'" v-model="cardsPeriodYear" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                        <option v-for="year in filterYearOptions" :key="`cards-popover-year-${year}`" :value="year">{{ year }}</option>
                      </select>
                      <select v-if="activeTab === 'accounts'" v-model="accountsPeriodMonth" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                        <option v-for="option in filterMonthOptions" :key="`accounts-popover-month-${option.value}`" :value="option.value">{{ option.label }}</option>
                      </select>
                      <select v-if="activeTab === 'accounts'" v-model="accountsPeriodYear" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                        <option v-for="year in filterYearOptions" :key="`accounts-popover-year-${year}`" :value="year">{{ year }}</option>
                      </select>
                    </div>
                    <label class="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-2 text-xs text-foreground">
                      <input class="h-3.5 w-3.5 rounded border-border" type="checkbox" :checked="activeTab === 'cards' ? cardsPeriodFilter === 'all' : accountsPeriodFilter === 'all'" @change="handleAdvancedFiltersAllPeriodsChange">
                      Todos os períodos
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                      <input v-if="activeTab === 'cards'" v-model="cardsDayStart" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60" type="number" min="1" max="31" placeholder="Dia inicial" :disabled="!isDayRangeAvailable">
                      <input v-if="activeTab === 'cards'" v-model="cardsDayEnd" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60" type="number" min="1" max="31" placeholder="Dia final" :disabled="!isDayRangeAvailable">
                      <input v-if="activeTab === 'accounts'" v-model="accountsDayStart" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60" type="number" min="1" max="31" placeholder="Dia inicial" :disabled="!isDayRangeAvailable">
                      <input v-if="activeTab === 'accounts'" v-model="accountsDayEnd" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60" type="number" min="1" max="31" placeholder="Dia final" :disabled="!isDayRangeAvailable">
                    </div>
                  </div>

                  <div class="space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Forma de pagamento</p>
                    <select v-model="activePaymentFilterModel" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Todos</option>
                      <option
                        v-for="entry in (activeTab === 'cards' ? activeCardsForQuickFilter : activeAccountsForQuickFilter)"
                        :key="`payment-popover-${activeTab}-${entry.id}`"
                        :value="entry.id"
                      >
                        {{ entry.name }}
                      </option>
                    </select>

                    <p class="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Responsável</p>
                    <select v-model="activePersonFilterModel" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Todos</option>
                      <option
                        v-for="entry in activePeopleForQuickFilter"
                        :key="`person-popover-${entry.id}`"
                        :value="entry.id"
                      >
                        {{ entry.name }}
                      </option>
                    </select>

                    <p class="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{{ activeTab === 'cards' ? 'Parcelamento' : 'Tipo' }}</p>
                    <select v-if="activeTab === 'cards'" v-model="cardsInstallmentFilter" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Todos</option>
                      <option value="installment">Parceladas</option>
                      <option value="single">À vista</option>
                    </select>
                    <select v-else v-model="accountsTypeFilter" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Todos</option>
                      <option value="income">Entradas</option>
                      <option value="expense">Saídas</option>
                    </select>

                    <select v-if="activeTab === 'accounts'" v-model="accountsCategoryFilter" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Categoria: Todas</option>
                      <option v-for="entry in categories" :key="`accounts-popover-category-${entry.id}`" :value="entry.id">{{ entry.name }}</option>
                    </select>
                  </div>

                  <div class="space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</p>
                    <select v-model="activeStatusFilterModel" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Todos</option>
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="canceled">Cancelado</option>
                    </select>

                    <p class="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Vínculo</p>
                    <select v-model="activeLinkFilterModel" class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      <option value="all">Todos</option>
                      <option value="normal">Originais</option>
                      <option value="reimbursement">Reembolsos</option>
                      <option value="linked">Vinculados</option>
                    </select>

                    <p class="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Faixa de valor</p>
                    <div class="grid grid-cols-2 gap-2">
                      <input v-if="activeTab === 'cards'" v-model="cardsValueMin" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground" type="number" step="0.01" placeholder="Valor mín.">
                      <input v-if="activeTab === 'cards'" v-model="cardsValueMax" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground" type="number" step="0.01" placeholder="Valor máx.">
                      <input v-if="activeTab === 'accounts'" v-model="accountsValueMin" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground" type="number" step="0.01" placeholder="Valor mín.">
                      <input v-if="activeTab === 'accounts'" v-model="accountsValueMax" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground" type="number" step="0.01" placeholder="Valor máx.">
                    </div>
                  </div>
                </div>

                <div class="mt-3 flex justify-end">
                  <button type="button" class="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold text-muted transition hover:border-primary-dark/60 hover:text-foreground" @click="closeAdvancedFilters">
                    Fechar filtros
                  </button>
                </div>
              </div>
            </div>
          </template>
        </FilterToolbar>
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>
    <p v-if="pageNotice" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">{{ pageNotice }}</p>

    <AppCard title="Tabela de lançamentos" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <div v-if="selectedVisibleRowCount > 0" class="mb-3 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-foreground">{{ selectedVisibleRowCount }} selecionados</p>
          <p class="text-xs text-muted">Ações em massa somente para os itens visíveis.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppButton
            v-for="action in bulkStatusActions"
            :key="action.status"
            size="sm"
            variant="secondary"
            :label="action.label"
            :disabled="bulkActionBusy"
            @click="applyBulkStatus(action.status)"
          />
          <AppButton
            size="sm"
            variant="ghost"
            label="Limpar seleção"
            :disabled="bulkActionBusy"
            @click="clearSelectedRows"
          />
        </div>
      </div>

      <div>
        <AppTable :columns="columns" :rows="tableRows" empty-message="Nenhum lançamento encontrado.">
          <template #header-selection>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border"
              :checked="allVisibleRowsSelected"
              :indeterminate.prop="someVisibleRowsSelected"
              :disabled="bulkActionBusy || !filteredRows.length"
              aria-label="Selecionar todos os itens visíveis"
              @change="toggleVisibleRowsSelection(($event.target as HTMLInputElement).checked)"
            />
          </template>

          <template #cell-selection="{ row }">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border"
              :checked="isRowSelected((row as TransactionInstanceItem).id)"
              :disabled="bulkActionBusy"
              :aria-label="`Selecionar lançamento ${(row as TransactionInstanceItem).title}`"
              @change="toggleRowSelection((row as TransactionInstanceItem).id, ($event.target as HTMLInputElement).checked)"
            />
          </template>

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
            <div class="min-w-0 space-y-0.5 leading-tight">
              <p class="truncate" :title="(row as { card_name: string }).card_name">
                {{ (row as { card_name: string }).card_name }}
              </p>
              <p
                v-if="(row as TransactionInstanceItem).card_id"
                class="truncate text-[10px] uppercase tracking-[0.08em] text-muted"
                :title="(row as { financial_competence_label?: string }).financial_competence_label || ''"
              >
                {{ (row as { financial_competence_label?: string }).financial_competence_label }}
              </p>
            </div>
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
              class="h-9 w-full rounded-lg border px-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-light"
              :class="getStatusSelectClass((row as TransactionInstanceItem).status)"
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
                v-if="(row as TransactionInstanceItem).reimbursement_role !== 'reimbursement'"
                size="sm"
                variant="ghost"
                :aria-label="(row as TransactionInstanceItem).card_id ? 'Mover para a próxima fatura' : 'Mover para o próximo mês'"
                :title="(row as TransactionInstanceItem).card_id ? 'Mover para a próxima fatura' : 'Mover para o próximo mês'"
                :disabled="rowActionBusy"
                @click="openMoveModal(row as TransactionInstanceItem)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 5 7 7-7 7" />
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
              <AppInput v-model="formRecurringStartDate" :label="editingRow ? 'Data do lançamento' : 'Data inicial'" type="date" required />

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

    <AppModal
      v-model="isExportPreviewOpen"
      title="Pré-visualização de exportação"
      description="Confira os dados filtrados antes de baixar CSV ou PNG."
      max-width-class="max-w-5xl"
    >
      <div class="space-y-4">
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

            <div class="mt-4 overflow-hidden rounded-lg border border-border/80 bg-[#fdfdf9]">
              <div class="overflow-x-auto">
                <table class="w-full table-fixed text-xs text-[#2f3526]">
                  <colgroup>
                    <col class="w-[12%]" />
                    <col class="w-[27%]" />
                    <col class="w-[15%]" />
                    <col class="w-[14%]" />
                    <col class="w-[11%]" />
                    <col class="w-[11%]" />
                    <col class="w-[7%]" />
                    <col class="w-[13%]" />
                  </colgroup>
                  <thead>
                    <tr class="bg-[#d7e0b5] text-[11px] font-semibold uppercase tracking-wide text-[#334127]">
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Data</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Descricao</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle whitespace-nowrap">Responsavel</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Categoria</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle">Cartao</th>
                      <th class="border-b border-border/80 px-3 py-2 text-left align-middle whitespace-nowrap">Competencia</th>
                      <th class="border-b border-border/80 px-3 py-2 text-center align-middle">Parcela</th>
                      <th class="border-b border-border/80 px-3 py-2 text-right align-middle whitespace-nowrap">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in filteredRows"
                      :key="(row as TransactionInstanceItem).id"
                      class="border-b border-border/70 text-[#2f3526] odd:bg-[#fdfdf9] even:bg-[#f3f6e7]"
                    >
                      <td class="px-3 py-2.5 text-left align-middle">{{ formatDateBr((row as TransactionInstanceItem).instance_date) }}</td>
                      <td class="px-3 py-2.5 text-left align-middle">{{ (row as { description_text: string }).description_text }}</td>
                      <td class="px-3 py-2.5 text-left align-middle whitespace-nowrap">{{ (row as { person_name: string }).person_name }}</td>
                      <td class="px-3 py-2.5 text-left align-middle">{{ (row as { category_name: string }).category_name }}</td>
                      <td class="px-3 py-2.5 text-left align-middle">
                        <div class="space-y-1">
                          <p>{{ (row as { card_name: string }).card_name }}</p>
                          <span
                            v-if="(row as TransactionInstanceItem).financial_effective_date_override"
                            class="inline-flex rounded-full border border-[#e3d39b] bg-[#f3efd8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b5a23]"
                          >
                            Fatura ajustada
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-2.5 text-left align-middle whitespace-nowrap">
                        {{ activeTab === 'cards'
                          ? ((row as TransactionInstanceItem).linked_financial_competence_label ?? (row as TransactionInstanceItem).financial_competence_label)
                          : (row as TransactionInstanceItem).instance_date }}
                      </td>
                      <td class="px-3 py-2.5 text-center align-middle">{{ (row as { installment_label: string }).installment_label }}</td>
                      <td class="px-3 py-2.5 text-right align-middle tabular-nums whitespace-nowrap">{{ formatCurrency(getEffectiveValue(row as TransactionInstanceItem)) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="bg-[#c0cf8f] font-semibold text-[#2f3526]">
                      <td colspan="7" class="px-3 py-3 text-right align-middle">Total</td>
                      <td class="px-3 py-3 text-right align-middle text-xs tabular-nums whitespace-nowrap">{{ formatCurrency(exportTotalEffective) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Fechar" variant="ghost" block @click="isExportPreviewOpen = false" />
          <AppButton :label="exportingPng ? 'Gerando PNG...' : 'Baixar PNG'" :disabled="exportingPng || !filteredRows.length" block @click="downloadPngFromPreview" />
          <AppButton :label="exportingCsv ? 'Exportando CSV...' : 'Baixar CSV'" :disabled="exportingCsv || !filteredRows.length" block @click="downloadCsvFromPreview" />
        </div>
      </template>
    </AppModal>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isMoveModalOpen" class="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" @click="closeMoveModal" />
      </Transition>
      <Transition name="slide-up">
        <div v-if="isMoveModalOpen" class="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-3xl bg-[#16181a] p-5 shadow-2xl ring-1 ring-white/10">
            <h3 class="text-lg font-semibold text-white">
              {{ pendingMoveRow?.card_id ? 'Mover para a próxima fatura?' : 'Mover para o próximo mês?' }}
            </h3>
            <p v-if="pendingMoveRow" class="mt-1 text-sm text-white/60">{{ pendingMoveRow.title }}</p>
            <div class="mt-4 grid gap-3">
              <button
                type="button"
                class="h-12 rounded-2xl bg-white text-sm font-semibold text-[#111315] transition hover:bg-white/90"
                :disabled="rowActionBusy"
                @click="executeMoveTransaction('single')"
              >
                Mover apenas este
              </button>
              <button
                v-if="pendingMoveRow && (pendingMoveRow.origin_type === 'installment' || pendingMoveRow.origin_type === 'recurring')"
                type="button"
                class="h-12 rounded-2xl bg-[#2a2f34] text-sm font-semibold text-white transition hover:bg-[#353b41]"
                :disabled="rowActionBusy"
                @click="executeMoveTransaction('future')"
              >
                Mover este e os proximos
              </button>
              <button
                type="button"
                class="mt-1 h-11 rounded-2xl border border-white/20 bg-transparent text-sm font-semibold text-white/90 transition hover:bg-white/10"
                @click="closeMoveModal"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isScopeModalOpen" class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm" @click="resolveScopeModal(null)" />
      </Transition>
      <Transition name="slide-up">
        <div v-if="isScopeModalOpen" class="fixed inset-0 z-[150] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-3xl bg-[#16181a] p-5 shadow-2xl ring-1 ring-white/10">
            <h3 class="text-lg font-semibold text-white">{{ scopeModalTitle }}</h3>
            <p v-if="scopeModalDescription" class="mt-1 text-sm text-white/60">{{ scopeModalDescription }}</p>
            <div class="mt-4 grid gap-3">
              <button
                type="button"
                class="h-12 rounded-2xl bg-white text-sm font-semibold text-[#111315] transition hover:bg-white/90"
                @click="resolveScopeModal('single')"
              >
                {{ scopeModalSingleLabel }}
              </button>
              <button
                v-if="scopeModalAllowFuture"
                type="button"
                class="h-12 rounded-2xl bg-[#2a2f34] text-sm font-semibold text-white transition hover:bg-[#353b41]"
                @click="resolveScopeModal('future')"
              >
                {{ scopeModalFutureLabel }}
              </button>
              <button
                type="button"
                class="mt-1 h-11 rounded-2xl border border-white/20 bg-transparent text-sm font-semibold text-white/90 transition hover:bg-white/10"
                @click="resolveScopeModal(null)"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </section>
</template>
