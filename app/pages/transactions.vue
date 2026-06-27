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
const exportingCsv = ref(false)
const scopeModalSaving = ref(false)
const rowActionBusy = ref(false)
const ACTIVE_TAB_STORAGE_KEY = 'transactions.activeTab'
const CARDS_FILTERS_STORAGE_KEY = 'transactions.filters.cards'
const ACCOUNTS_FILTERS_STORAGE_KEY = 'transactions.filters.accounts'
const pageError = ref('')
const pageNotice = ref('')
const modalError = ref('')
const scopeModalError = ref('')

const monthYear = ref(new Date().toISOString().slice(0, 7))
const activeTab = ref<'cards' | 'accounts'>('cards')
const { month: initialPeriodMonth, year: initialPeriodYear } = parseMonthYear(monthYear.value)
const cardsPeriodMonth = ref(String(initialPeriodMonth).padStart(2, '0'))
const cardsPeriodYear = ref(String(initialPeriodYear))
const accountsPeriodMonth = ref(String(initialPeriodMonth).padStart(2, '0'))
const accountsPeriodYear = ref(String(initialPeriodYear))

const cardsPeriodFilter = ref<string | 'all'>(monthYear.value)
const cardsCardFilter = ref('all')
const cardsStatusFilter = ref<'all' | TransactionStatus>('all')
const cardsReimbursementLinkFilter = ref<'all' | 'normal' | 'reimbursement' | 'linked'>('all')
const cardsSearchDescription = ref('')

const accountsPeriodFilter = ref<string | 'all'>(monthYear.value)
const accountsAccountFilter = ref('all')
const accountsTypeFilter = ref<'all' | TransactionType>('all')
const accountsCategoryFilter = ref('all')
const accountsStatusFilter = ref<'all' | TransactionStatus>('all')
const accountsReimbursementLinkFilter = ref<'all' | 'normal' | 'reimbursement' | 'linked'>('all')
const accountsSearchDescription = ref('')

const route = useRoute()
const router = useRouter()

const rows = ref<TransactionInstanceItem[]>([])
const people = ref<PersonItem[]>([])
const accounts = ref<AccountItem[]>([])
const cards = ref<CardItem[]>([])
const categories = ref<CategoryItem[]>([])

const realValueDrafts = ref<Record<string, string>>({})

const isModalOpen = ref(false)
const isScopeModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
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

const activePeriodFilter = computed(() => activeTab.value === 'cards' ? cardsPeriodFilter.value : accountsPeriodFilter.value)
const activeSearchDescription = computed(() => activeTab.value === 'cards' ? cardsSearchDescription.value : accountsSearchDescription.value)

const selectedPeriodLabel = computed(() => {
  if (activePeriodFilter.value === 'all') {
    return 'Todos os períodos'
  }

  const [year, month] = activePeriodFilter.value.split('-')
  const monthOption = filterMonthOptions.find(entry => entry.value === month)
  return monthOption ? `${monthOption.label}/${year}` : activePeriodFilter.value
})
const selectedPeriodMonthKey = computed(() => {
  if (activePeriodFilter.value === 'all') {
    return null
  }

  return activePeriodFilter.value
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
const activeAccountsForQuickFilter = computed(() => accounts.value.filter(entry => entry.is_active))

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

interface PersistedCardsFilters {
  period_filter: string | 'all'
  card_filter: string
  status_filter: 'all' | TransactionStatus
  reimbursement_link_filter: 'all' | 'normal' | 'reimbursement' | 'linked'
  search_description: string
}

interface PersistedAccountsFilters {
  period_filter: string | 'all'
  account_filter: string
  type_filter: 'all' | TransactionType
  category_filter: string
  status_filter: 'all' | TransactionStatus
  reimbursement_link_filter: 'all' | 'normal' | 'reimbursement' | 'linked'
  search_description: string
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
    status_filter: cardsStatusFilter.value,
    reimbursement_link_filter: cardsReimbursementLinkFilter.value,
    search_description: cardsSearchDescription.value.trim()
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
    type_filter: accountsTypeFilter.value,
    category_filter: accountsCategoryFilter.value,
    status_filter: accountsStatusFilter.value,
    reimbursement_link_filter: accountsReimbursementLinkFilter.value,
    search_description: accountsSearchDescription.value.trim()
  }

  window.localStorage.setItem(ACCOUNTS_FILTERS_STORAGE_KEY, JSON.stringify(payload))
}

function clearCardsFiltersStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(CARDS_FILTERS_STORAGE_KEY)
}

function clearAccountsFiltersStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ACCOUNTS_FILTERS_STORAGE_KEY)
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
    cardsStatusFilter.value = typeof parsed.status_filter === 'string' && isValidStatusFilter(parsed.status_filter)
      ? parsed.status_filter
      : 'all'
    cardsReimbursementLinkFilter.value = typeof parsed.reimbursement_link_filter === 'string' && isValidReimbursementLinkFilter(parsed.reimbursement_link_filter)
      ? parsed.reimbursement_link_filter
      : 'all'
    cardsSearchDescription.value = typeof parsed.search_description === 'string' ? parsed.search_description : ''
  } catch {
    clearCardsFiltersStorage()
  }
}

function restoreAccountsFiltersFromStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const raw = window.localStorage.getItem(ACCOUNTS_FILTERS_STORAGE_KEY)

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
  } catch {
    clearAccountsFiltersStorage()
  }
}

function switchTab(tab: 'cards' | 'accounts') {
  activeTab.value = tab
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

async function refreshRowsAfterMutation(options: { created?: boolean; previousFilteredCount?: number; previousTotalCount?: number } = {}) {
  await fetchRows()

  if (!options.created) {
    pageNotice.value = ''
    return
  }

  const previousFilteredCount = options.previousFilteredCount ?? 0
  const previousTotalCount = options.previousTotalCount ?? 0
  const nextFilteredCount = filteredRows.value.length
  const nextTotalCount = rows.value.length

  if (nextTotalCount > previousTotalCount && nextFilteredCount <= previousFilteredCount) {
    pageNotice.value = 'Lançamento salvo, mas fora do filtro atual.'
    return
  }

  pageNotice.value = ''
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
  const normalizedSearch = activeSearchDescription.value.trim().toLowerCase()

  return rows.value
    .filter((row) => {
      const isLinkedToCardInvoice = Boolean(row.linked_financial_competence_label)

      if (activeTab.value === 'cards') {
        return Boolean(row.card_id) || isLinkedToCardInvoice
      }

      return !row.card_id && !isLinkedToCardInvoice
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
    .filter((row) => activeTab.value === 'cards' || accountsTypeFilter.value === 'all' || row.type === accountsTypeFilter.value)
    .filter((row) => activeTab.value === 'cards' || accountsCategoryFilter.value === 'all' || row.category_id === accountsCategoryFilter.value)
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

async function exportCurrentTabCsv() {
  if (!filteredRows.value.length) {
    pageError.value = 'Nao ha lancamentos filtrados para exportar.'
    return
  }

  exportingCsv.value = true
  pageError.value = ''

  try {
    const header = [
      'Data real',
      'Competencia/Fatura',
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

      csvLines.push([
        entry.instance_date,
        competenceLabel,
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

function buildPeriodKey(year: string, month: string) {
  return `${year}-${month}`
}

function clearActiveTabFilters() {
  if (activeTab.value === 'cards') {
    cardsPeriodFilter.value = monthYear.value
    cardsPeriodMonth.value = monthYear.value.slice(5, 7)
    cardsPeriodYear.value = monthYear.value.slice(0, 4)
    cardsCardFilter.value = 'all'
    cardsStatusFilter.value = 'all'
    cardsReimbursementLinkFilter.value = 'all'
    cardsSearchDescription.value = ''
    clearCardsFiltersStorage()
    saveCardsFiltersToStorage()
    return
  }

  accountsPeriodFilter.value = monthYear.value
  accountsPeriodMonth.value = monthYear.value.slice(5, 7)
  accountsPeriodYear.value = monthYear.value.slice(0, 4)
  accountsAccountFilter.value = 'all'
  accountsTypeFilter.value = 'all'
  accountsCategoryFilter.value = 'all'
  accountsStatusFilter.value = 'all'
  accountsReimbursementLinkFilter.value = 'all'
  accountsSearchDescription.value = ''
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

    isModalOpen.value = false
    await clearNewLaunchQueryIfNeeded()
    await refreshRowsAfterMutation({
      created: wasCreating,
      previousFilteredCount,
      previousTotalCount
    })
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

watch(activeTab, () => {
  saveActiveTabToStorage()
})

watch([cardsPeriodMonth, cardsPeriodYear], () => {
  cardsPeriodFilter.value = buildPeriodKey(cardsPeriodYear.value, cardsPeriodMonth.value)
})

watch([accountsPeriodMonth, accountsPeriodYear], () => {
  accountsPeriodFilter.value = buildPeriodKey(accountsPeriodYear.value, accountsPeriodMonth.value)
})

watch(
  [cardsPeriodFilter, cardsCardFilter, cardsStatusFilter, cardsReimbursementLinkFilter, cardsSearchDescription],
  () => {
    saveCardsFiltersToStorage()
  }
)

watch(
  [accountsPeriodFilter, accountsAccountFilter, accountsTypeFilter, accountsCategoryFilter, accountsStatusFilter, accountsReimbursementLinkFilter, accountsSearchDescription],
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

onMounted(async () => {
  await fetchOptions()
  restoreActiveTabFromStorage()
  restoreCardsFiltersFromStorage()
  restoreAccountsFiltersFromStorage()
  await fetchRows()
  await consumeNewLaunchQuery()
})
</script>

<template>
  <section class="space-y-5 overflow-x-hidden">
    <AppCard>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="h-9 rounded-full border px-4 text-sm font-semibold transition"
            :class="activeTab === 'cards' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
            @click="switchTab('cards')"
          >
            Cartoes
          </button>
          <button
            type="button"
            class="h-9 rounded-full border px-4 text-sm font-semibold transition"
            :class="activeTab === 'accounts' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
            @click="switchTab('accounts')"
          >
            Contas
          </button>
          <span class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground">{{ selectedPeriodLabel }}</span>
          <span class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground">Total filtrado: {{ formatCurrency(filteredTotalValue) }}</span>
        </div>

        <div class="grid gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Periodo</label>
            <select
              v-if="activeTab === 'cards'"
              v-model="cardsPeriodMonth"
              class="h-9 min-w-[9rem] rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
            >
              <option v-for="option in filterMonthOptions" :key="`cards-month-${option.value}`" :value="option.value">{{ option.label }}</option>
            </select>
            <select
              v-if="activeTab === 'cards'"
              v-model="cardsPeriodYear"
              class="h-9 min-w-[7rem] rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
            >
              <option v-for="year in filterYearOptions" :key="`cards-year-${year}`" :value="year">{{ year }}</option>
            </select>

            <select
              v-if="activeTab === 'accounts'"
              v-model="accountsPeriodMonth"
              class="h-9 min-w-[9rem] rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
            >
              <option v-for="option in filterMonthOptions" :key="`accounts-month-${option.value}`" :value="option.value">{{ option.label }}</option>
            </select>
            <select
              v-if="activeTab === 'accounts'"
              v-model="accountsPeriodYear"
              class="h-9 min-w-[7rem] rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
            >
              <option v-for="year in filterYearOptions" :key="`accounts-year-${year}`" :value="year">{{ year }}</option>
            </select>
            <AppButton label="Todos os periodos" size="sm" variant="ghost" @click="activeTab === 'cards' ? (cardsPeriodFilter = 'all') : (accountsPeriodFilter = 'all')" />
          </div>

          <div v-if="activeTab === 'cards'" class="space-y-2">
            <div class="w-full overflow-x-auto pb-1">
              <div class="flex min-w-max items-center gap-2">
                <button type="button" class="h-8 rounded-full border px-3 text-xs font-semibold transition" :class="cardsCardFilter === 'all' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'" @click="cardsCardFilter = 'all'">Todos</button>
                <button
                  v-for="entry in activeCardsForQuickFilter"
                  :key="`cards-chip-${entry.id}`"
                  type="button"
                  class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                  :class="cardsCardFilter === entry.id ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                  @click="cardsCardFilter = entry.id"
                >
                  {{ entry.name }}
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <AppButton label="Status: Todos" size="sm" :variant="cardsStatusFilter === 'all' ? 'secondary' : 'ghost'" @click="cardsStatusFilter = 'all'" />
              <AppButton label="Pendente" size="sm" :variant="cardsStatusFilter === 'pending' ? 'secondary' : 'ghost'" @click="cardsStatusFilter = 'pending'" />
              <AppButton label="Pago" size="sm" :variant="cardsStatusFilter === 'paid' ? 'secondary' : 'ghost'" @click="cardsStatusFilter = 'paid'" />
              <AppButton label="Cancelado" size="sm" :variant="cardsStatusFilter === 'canceled' ? 'secondary' : 'ghost'" @click="cardsStatusFilter = 'canceled'" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <AppButton label="Vinculo: Todos" size="sm" :variant="cardsReimbursementLinkFilter === 'all' ? 'secondary' : 'ghost'" @click="cardsReimbursementLinkFilter = 'all'" />
              <AppButton label="Normais" size="sm" :variant="cardsReimbursementLinkFilter === 'normal' ? 'secondary' : 'ghost'" @click="cardsReimbursementLinkFilter = 'normal'" />
              <AppButton label="Reembolsos" size="sm" :variant="cardsReimbursementLinkFilter === 'reimbursement' ? 'secondary' : 'ghost'" @click="cardsReimbursementLinkFilter = 'reimbursement'" />
              <AppButton label="Vinculados" size="sm" :variant="cardsReimbursementLinkFilter === 'linked' ? 'secondary' : 'ghost'" @click="cardsReimbursementLinkFilter = 'linked'" />
            </div>

            <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <AppInput v-model="cardsSearchDescription" label="Buscar descricao" placeholder="Digite parte da descricao" />
              <AppButton label="Limpar filtros" size="sm" variant="ghost" @click="clearActiveTabFilters" />
              <AppButton :label="exportingCsv ? 'Exportando...' : 'Exportar CSV'" size="sm" variant="ghost" :disabled="exportingCsv || !filteredRows.length" @click="exportCurrentTabCsv" />
              <AppButton label="Novo" size="sm" @click="openCreateModal" />
            </div>
          </div>

          <div v-else class="space-y-2">
            <div class="w-full overflow-x-auto pb-1">
              <div class="flex min-w-max items-center gap-2">
                <button type="button" class="h-8 rounded-full border px-3 text-xs font-semibold transition" :class="accountsAccountFilter === 'all' ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'" @click="accountsAccountFilter = 'all'">Todas as contas</button>
                <button
                  v-for="entry in activeAccountsForQuickFilter"
                  :key="`accounts-chip-${entry.id}`"
                  type="button"
                  class="h-8 rounded-full border px-3 text-xs font-semibold transition"
                  :class="accountsAccountFilter === entry.id ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
                  @click="accountsAccountFilter = entry.id"
                >
                  {{ entry.name }}
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <AppButton label="Tipo: Todos" size="sm" :variant="accountsTypeFilter === 'all' ? 'secondary' : 'ghost'" @click="accountsTypeFilter = 'all'" />
              <AppButton label="Entrada" size="sm" :variant="accountsTypeFilter === 'income' ? 'secondary' : 'ghost'" @click="accountsTypeFilter = 'income'" />
              <AppButton label="Saida" size="sm" :variant="accountsTypeFilter === 'expense' ? 'secondary' : 'ghost'" @click="accountsTypeFilter = 'expense'" />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Categoria</label>
              <select v-model="accountsCategoryFilter" class="h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs text-foreground sm:max-w-sm">
                <option value="all">Todas</option>
                <option v-for="entry in categories" :key="`accounts-category-${entry.id}`" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <AppButton label="Status: Todos" size="sm" :variant="accountsStatusFilter === 'all' ? 'secondary' : 'ghost'" @click="accountsStatusFilter = 'all'" />
              <AppButton label="Pendente" size="sm" :variant="accountsStatusFilter === 'pending' ? 'secondary' : 'ghost'" @click="accountsStatusFilter = 'pending'" />
              <AppButton label="Pago" size="sm" :variant="accountsStatusFilter === 'paid' ? 'secondary' : 'ghost'" @click="accountsStatusFilter = 'paid'" />
              <AppButton label="Cancelado" size="sm" :variant="accountsStatusFilter === 'canceled' ? 'secondary' : 'ghost'" @click="accountsStatusFilter = 'canceled'" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <AppButton label="Vinculo: Todos" size="sm" :variant="accountsReimbursementLinkFilter === 'all' ? 'secondary' : 'ghost'" @click="accountsReimbursementLinkFilter = 'all'" />
              <AppButton label="Normais" size="sm" :variant="accountsReimbursementLinkFilter === 'normal' ? 'secondary' : 'ghost'" @click="accountsReimbursementLinkFilter = 'normal'" />
              <AppButton label="Reembolsos" size="sm" :variant="accountsReimbursementLinkFilter === 'reimbursement' ? 'secondary' : 'ghost'" @click="accountsReimbursementLinkFilter = 'reimbursement'" />
              <AppButton label="Vinculados" size="sm" :variant="accountsReimbursementLinkFilter === 'linked' ? 'secondary' : 'ghost'" @click="accountsReimbursementLinkFilter = 'linked'" />
            </div>

            <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <AppInput v-model="accountsSearchDescription" label="Buscar descricao" placeholder="Digite parte da descricao" />
              <AppButton label="Limpar filtros" size="sm" variant="ghost" @click="clearActiveTabFilters" />
              <AppButton :label="exportingCsv ? 'Exportando...' : 'Exportar CSV'" size="sm" variant="ghost" :disabled="exportingCsv || !filteredRows.length" @click="exportCurrentTabCsv" />
              <AppButton label="Novo" size="sm" @click="openCreateModal" />
            </div>
          </div>
        </div>
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>
    <p v-if="pageNotice" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">{{ pageNotice }}</p>

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
                Fatura: {{ (row as { financial_competence_label?: string }).financial_competence_label }}
              </span>
              <span
                v-else-if="Boolean((row as TransactionInstanceItem).linked_financial_competence_label)"
                class="inline-flex rounded-full border border-border/80 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                Vinculado à fatura: {{ (row as { linked_financial_competence_label?: string | null }).linked_financial_competence_label }}
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
