<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import {
  RECURRING_FREQUENCIES,
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
  cancelRecurringTransaction,
  createTransaction,
  deleteTransactionInstance: removeTransactionInstance,
  getRecurringConfiguration,
  listFilterOptions,
  listManualInstances,
  setChecked,
  setStatus,
  updateRecurringTransaction,
  updateTransactionInstance
} = useTransactions()

const loading = ref(false)
const saving = ref(false)
const cancelSaving = ref(false)
const deleteSaving = ref(false)
const pageError = ref('')
const modalError = ref('')
const cancelError = ref('')
const deleteError = ref('')

const monthYear = ref(new Date().toISOString().slice(0, 7))
const isFiltersPanelOpen = ref(false)
const cardFilter = ref('all')
const personFilter = ref('all')
const categoryFilter = ref('all')
const accountFilter = ref('all')
const statusFilter = ref<'all' | TransactionStatus>('all')
const searchDescription = ref('')

const rows = ref<TransactionInstanceItem[]>([])
const people = ref<PersonItem[]>([])
const accounts = ref<AccountItem[]>([])
const cards = ref<CardItem[]>([])
const categories = ref<CategoryItem[]>([])

const realValueDrafts = ref<Record<string, string>>({})

const isModalOpen = ref(false)
const isCancelModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const editingRow = ref<TransactionInstanceItem | null>(null)
const cancelTargetRow = ref<TransactionInstanceItem | null>(null)
const deleteTargetRow = ref<TransactionInstanceItem | null>(null)

const formTitle = ref('')
const formOriginType = ref<TransactionOriginType>('single')
const formType = ref<TransactionType>('expense')
const formExpectedValue = ref('')
const formRealValue = ref('')
const formDueDate = ref('')
const formInstanceDate = ref('')
const formInstallmentTotal = ref('2')
const formInstallmentStartDate = ref('')
const formRecurringStartDate = ref('')
const formRecurringEndDate = ref('')
const formRecurringNoEndDate = ref(true)
const formRecurringFrequency = ref<RecurringFrequency>('monthly')
const formRecurringEndingMode = ref<RecurringEndMode>('no_end')
const formRecurringOccurrences = ref('12')
const formRecurringScope = ref<RecurringScope>('single')
const cancelRecurringScope = ref<RecurringScope>('single')
const deleteRecurringScope = ref<DeleteRecurringScope>('single')
const formPersonId = ref('')
const formAccountId = ref('')
const formCardId = ref('')
const formCategoryId = ref('')
const formDescription = ref('')
const formStatus = ref<TransactionStatus>('pending')

const columns = [
  { key: 'checked_toggle', label: 'Conferido', align: 'center' as const },
  { key: 'instance_date', label: 'Data' },
  { key: 'description_text', label: 'Descricao' },
  { key: 'person_name', label: 'Responsavel' },
  { key: 'category_name', label: 'Categoria' },
  { key: 'card_name', label: 'Cartao' },
  { key: 'expected_value', label: 'Previsto', align: 'right' as const },
  { key: 'real_value_input', label: 'Realizado', align: 'right' as const },
  { key: 'actions', label: 'Acoes', align: 'right' as const }
]

const originTypeOptions = [
  { value: 'single', label: 'Lancamento unico' },
  { value: 'installment', label: 'Compra parcelada' },
  { value: 'recurring', label: 'Lancamento recorrente mensal' }
] as const

const recurringScopeOptions = [
  { value: 'single', label: 'Somente esta instancia' },
  { value: 'future', label: 'Esta e futuras instancias' },
  { value: 'series', label: 'Serie completa (futuras)' }
] as const

const recurringFrequencyLabelMap: Record<RecurringFrequency, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual'
}

const deleteRecurringScopeOptions = [
  { value: 'single', label: 'Somente este lancamento selecionado' },
  { value: 'future', label: 'Este lancamento e todos os futuros' }
] as const

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

const isEditingRecurring = computed(() => editingRow.value?.origin_type === 'recurring')
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

const filteredRows = computed(() => {
  const normalizedSearch = searchDescription.value.trim().toLowerCase()

  return rows.value
    .filter((row) => personFilter.value === 'all' || row.person_id === personFilter.value)
    .filter((row) => cardFilter.value === 'all' || row.card_id === cardFilter.value)
    .filter((row) => accountFilter.value === 'all' || row.account_id === accountFilter.value)
    .filter((row) => categoryFilter.value === 'all' || row.category_id === categoryFilter.value)
    .filter((row) => statusFilter.value === 'all' || row.status === statusFilter.value)
    .filter((row) => {
      if (!normalizedSearch) return true
      const text = `${row.title} ${row.description ?? ''}`.toLowerCase()
      return text.includes(normalizedSearch)
    })
    .map((row) => ({
      ...row,
      description_text: row.description?.trim() ? `${row.title} - ${row.description}` : row.title,
      person_name: row.person_id ? (peopleMap.value.get(row.person_id) || '-') : '-',
      category_name: row.category_id ? (categoriesMap.value.get(row.category_id) || '-') : '-',
      card_name: row.card_id ? (cardsMap.value.get(row.card_id) || '-') : '-',
      account_name: row.account_id ? (accountsMap.value.get(row.account_id) || '-') : '-',
      checked_toggle: row.is_checked
    }))
})

function formatCurrency(value: number | null) {
  return formatBRLOrDash(value)
}

function resetForm() {
  editingRow.value = null
  formTitle.value = ''
  formOriginType.value = 'single'
  formType.value = 'expense'
  formExpectedValue.value = ''
  formRealValue.value = ''
  formDueDate.value = `${monthYear.value}-01`
  formInstanceDate.value = `${monthYear.value}-01`
  formInstallmentTotal.value = '2'
  formInstallmentStartDate.value = `${monthYear.value}-01`
  formRecurringStartDate.value = `${monthYear.value}-01`
  formRecurringEndDate.value = ''
  formRecurringNoEndDate.value = true
  formRecurringFrequency.value = 'monthly'
  formRecurringEndingMode.value = 'no_end'
  formRecurringOccurrences.value = '12'
  formRecurringScope.value = 'single'
  formPersonId.value = ''
  formAccountId.value = ''
  formCardId.value = ''
  formCategoryId.value = ''
  formDescription.value = ''
  formStatus.value = 'pending'
  modalError.value = ''
}

function fillFormFromRow(row: TransactionInstanceItem) {
  editingRow.value = row
  formTitle.value = row.title
  formOriginType.value = row.origin_type
  formType.value = row.type
  formExpectedValue.value = String(row.expected_value)
  formRealValue.value = row.real_value == null ? '' : String(row.real_value)
  formDueDate.value = row.due_date
  formInstanceDate.value = row.instance_date
  formInstallmentTotal.value = String(row.installment_total ?? 2)
  formInstallmentStartDate.value = row.instance_date
  formRecurringStartDate.value = row.due_date
  formRecurringEndDate.value = ''
  formRecurringNoEndDate.value = false
  formRecurringFrequency.value = 'monthly'
  formRecurringEndingMode.value = 'end_date'
  formRecurringOccurrences.value = '12'
  formRecurringScope.value = 'single'
  formPersonId.value = row.person_id ?? ''
  formAccountId.value = row.account_id ?? ''
  formCardId.value = row.card_id ?? ''
  formCategoryId.value = row.category_id ?? ''
  formDescription.value = row.description ?? ''
  formStatus.value = row.status
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
    formRecurringEndingMode.value = recurringConfig.end_mode
    formRecurringEndDate.value = recurringConfig.end_date || ''
    formRecurringOccurrences.value = recurringConfig.occurrences_count == null ? '12' : String(recurringConfig.occurrences_count)
  }

  isModalOpen.value = true
}

function openRecurringCancelModal(row: TransactionInstanceItem) {
  cancelTargetRow.value = row
  cancelRecurringScope.value = 'single'
  cancelError.value = ''
  isCancelModalOpen.value = true
}

function openDeleteModal(row: TransactionInstanceItem) {
  deleteTargetRow.value = row
  deleteRecurringScope.value = 'single'
  deleteError.value = ''
  isDeleteModalOpen.value = true
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

function clearFilters() {
  cardFilter.value = 'all'
  personFilter.value = 'all'
  categoryFilter.value = 'all'
  accountFilter.value = 'all'
  statusFilter.value = 'all'
  searchDescription.value = ''
}

function toggleFiltersPanel() {
  isFiltersPanelOpen.value = !isFiltersPanelOpen.value
}

async function applyFilters() {
  await fetchRows()
  isFiltersPanelOpen.value = false
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    const period = parseMonthYear(monthYear.value)
    rows.value = await listManualInstances(period)
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel carregar os lancamentos.'
  } finally {
    loading.value = false
  }
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
  const rawValue = getRealDraftValue(row).trim()
  const parsedReal = rawValue === '' ? null : Number(rawValue)

  if (parsedReal != null && Number.isNaN(parsedReal)) {
    pageError.value = 'Valor realizado invalido.'
    return
  }

  if (row.real_value === parsedReal) return

  pageError.value = ''

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

  if (formOriginType.value === 'single' && (!formDueDate.value || !formInstanceDate.value)) {
    modalError.value = 'Vencimento e data do lancamento sao obrigatorios.'
    return
  }

  const parsedInstallmentTotal = Number(formInstallmentTotal.value)
  const parsedRecurringOccurrences = Number(formRecurringOccurrences.value)

  if (formOriginType.value === 'installment') {
    if (!Number.isInteger(parsedInstallmentTotal) || parsedInstallmentTotal < 2) {
      modalError.value = 'Quantidade de parcelas deve ser inteira e maior ou igual a 2.'
      return
    }

    if (!formCardId.value) {
      modalError.value = 'Cartao obrigatorio para lancamento parcelado.'
      return
    }

    if (!formInstallmentStartDate.value) {
      modalError.value = 'Data inicial do parcelamento obrigatoria.'
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
  }

  saving.value = true

  try {
    if (editingRow.value) {
      if (editingRow.value.origin_type === 'recurring') {
        await updateRecurringTransaction(
          editingRow.value,
          {
            title: formTitle.value,
            type: formType.value,
            expected_value: parsedExpected,
            real_value: parsedReal,
            due_date: formDueDate.value,
            instance_date: formInstanceDate.value,
            person_id: formPersonId.value || null,
            account_id: formAccountId.value || null,
            card_id: formCardId.value || null,
            category_id: formCategoryId.value || null,
            description: formDescription.value,
            status: formStatus.value,
            is_checked: editingRow.value.is_checked,
            recurring_end_mode: formRecurringEndingMode.value,
            recurring_end_date: formRecurringEndingMode.value === 'end_date' ? (formRecurringEndDate.value || null) : null,
            recurring_occurrences_count: formRecurringEndingMode.value === 'count' ? parsedRecurringOccurrences : null,
            recurring_no_end_date: formRecurringEndingMode.value === 'no_end'
          },
          formRecurringScope.value
        )
      } else {
        await updateTransactionInstance(
          editingRow.value.id,
          {
            title: formTitle.value,
            type: formType.value,
            expected_value: parsedExpected,
            real_value: parsedReal,
            due_date: formDueDate.value,
            instance_date: formInstanceDate.value,
            person_id: formPersonId.value || null,
            account_id: formAccountId.value || null,
            card_id: formCardId.value || null,
            category_id: formCategoryId.value || null,
            description: formDescription.value,
            status: formStatus.value,
            is_checked: editingRow.value.is_checked
          },
          editingRow.value.source_transaction_id,
          editingRow.value.origin_type
        )
      }
    } else {
      await createTransaction({
        origin_type: formOriginType.value,
        title: formTitle.value,
        type: formType.value,
        expected_value: parsedExpected,
        real_value: parsedExpected,
        due_date: formOriginType.value === 'single' ? formDueDate.value : formInstallmentStartDate.value,
        instance_date: formOriginType.value === 'single' ? formInstanceDate.value : formInstallmentStartDate.value,
        installment_total: formOriginType.value === 'installment' ? parsedInstallmentTotal : undefined,
        installment_start_date: formOriginType.value === 'installment' ? formInstallmentStartDate.value : undefined,
        recurring_start_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : undefined,
        recurring_end_mode: formOriginType.value === 'recurring' ? formRecurringEndingMode.value : undefined,
        recurring_end_date: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'end_date'
          ? (formRecurringEndDate.value || null)
          : null,
        recurring_no_end_date: formOriginType.value === 'recurring' ? formRecurringEndingMode.value === 'no_end' : undefined,
        recurring_frequency: formOriginType.value === 'recurring' ? formRecurringFrequency.value : undefined,
        recurring_occurrences_count: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'count'
          ? parsedRecurringOccurrences
          : null,
        recurring_occurrences_limit: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'count'
          ? parsedRecurringOccurrences
          : null,
        person_id: formPersonId.value || null,
        account_id: formAccountId.value || null,
        card_id: formCardId.value || null,
        category_id: formCategoryId.value || null,
        description: formDescription.value,
        status: 'pending',
        is_checked: false
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
  pageError.value = ''

  try {
    await setChecked(row, !row.is_checked)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar a conferencia.'
  }
}

async function changeStatus(row: TransactionInstanceItem, nextStatus: TransactionStatus) {
  pageError.value = ''

  if (row.origin_type === 'recurring' && nextStatus === 'canceled') {
    openRecurringCancelModal(row)
    return
  }

  try {
    await setStatus(row, nextStatus)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar o status.'
  }
}

async function confirmRecurringCancel() {
  cancelError.value = ''

  if (!cancelTargetRow.value) {
    cancelError.value = 'Nenhum lancamento recorrente selecionado para cancelamento.'
    return
  }

  cancelSaving.value = true

  try {
    await cancelRecurringTransaction(cancelTargetRow.value, cancelRecurringScope.value)
    isCancelModalOpen.value = false
    await fetchRows()
  } catch (err) {
    cancelError.value = err instanceof Error ? err.message : 'Nao foi possivel cancelar no escopo selecionado.'
  } finally {
    cancelSaving.value = false
  }
}

async function confirmDeleteTransaction() {
  deleteError.value = ''

  if (!deleteTargetRow.value) {
    deleteError.value = 'Nenhum lancamento selecionado para exclusao.'
    return
  }

  deleteSaving.value = true

  try {
    const scope = deleteTargetRow.value.origin_type === 'recurring'
      ? deleteRecurringScope.value
      : 'single'

    await removeTransactionInstance(deleteTargetRow.value, scope)
    isDeleteModalOpen.value = false
    await fetchRows()
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Nao foi possivel deletar o lancamento.'
  } finally {
    deleteSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchOptions(), fetchRows()])
})

watch(monthYear, fetchRows)
</script>

<template>
  <section class="space-y-5 overflow-x-hidden">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Lancamentos</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Conferencia Financeira</h2>
      <p class="mt-2 text-sm text-muted">Tabela principal de conciliacao com conferencia e valor realizado inline.</p>
    </div>

    <AppCard title="Painel de controle" subtitle="Ações rápidas e resumo dos filtros ativos.">
      <div class="relative flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
            Período selecionado: {{ monthYear }}
          </span>
          <AppButton label="Filtros" size="sm" variant="ghost" @click="toggleFiltersPanel" />
          <AppButton label="Limpar" size="sm" variant="ghost" @click="clearFilters" />
          <div class="ml-auto">
            <AppButton label="Novo lançamento" size="sm" @click="openCreateModal" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium" :class="'border-border bg-background text-muted'">
            Período: {{ monthYear }}
          </span>
          <span
            class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            :class="hasActiveCardFilter ? 'border-primary-dark/50 bg-primary-light text-foreground' : 'border-border bg-background text-muted'"
          >
            Cartão: {{ selectedCardLabel }}
          </span>
          <span
            class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            :class="hasActiveStatusFilter ? 'border-primary-dark/50 bg-primary-light text-foreground' : 'border-border bg-background text-muted'"
          >
            Status: {{ selectedStatusLabel }}
          </span>
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-2 scale-[0.98] opacity-0"
          enter-to-class="translate-y-0 scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 scale-100 opacity-100"
          leave-to-class="translate-y-2 scale-[0.98] opacity-0"
        >
          <div
            v-if="isFiltersPanelOpen"
            class="absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-border bg-background p-3 shadow-[0_20px_50px_rgba(15,23,42,0.16)]"
          >
            <div class="max-h-[min(70vh,32rem)] overflow-y-auto pr-1">
              <div class="grid gap-3 md:grid-cols-3">
              <AppInput v-model="monthYear" label="Período" type="month" />

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Cartão</label>
                <select v-model="cardFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                  <option value="all">Todos</option>
                  <option v-for="entry in cards" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Responsável</label>
                <select v-model="personFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                  <option value="all">Todos</option>
                  <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Categoria</label>
                <select v-model="categoryFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                  <option value="all">Todas</option>
                  <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Conta</label>
                <select v-model="accountFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                  <option value="all">Todas</option>
                  <option v-for="entry in accounts" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Status</label>
                <select v-model="statusFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                  <option value="all">Todos</option>
                  <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ transactionStatusLabelMap[entry] }}</option>
                </select>
              </div>
              </div>

              <div class="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <AppInput v-model="searchDescription" label="Pesquisar descrição" placeholder="Digite parte da descrição" />
                <AppButton label="Aplicar filtros" variant="secondary" @click="applyFilters" />
                <AppButton label="Limpar filtros" variant="ghost" @click="clearFilters" />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Tabela de lançamentos" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <div class="overflow-x-auto">
        <AppTable :columns="columns" :rows="filteredRows" empty-message="Nenhum lançamento encontrado.">
          <template #cell-checked_toggle="{ row }">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border"
              :checked="Boolean((row as TransactionInstanceItem).is_checked)"
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
              @input="onRealDraftInput((row as TransactionInstanceItem).id, ($event.target as HTMLInputElement).value)"
              @blur="saveInlineRealValue(row as TransactionInstanceItem)"
              @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            />
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-2">
              <AppButton size="sm" variant="ghost" label="Editar" @click="openEditModal(row as TransactionInstanceItem)" />
              <AppButton
                v-if="(row as TransactionInstanceItem).status !== 'canceled'"
                size="sm"
                variant="danger"
                label="Cancelar"
                @click="changeStatus(row as TransactionInstanceItem, 'canceled')"
              />
              <AppButton
                size="sm"
                variant="danger"
                label="Deletar"
                @click="openDeleteModal(row as TransactionInstanceItem)"
              />
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
            <label class="block text-sm font-medium text-foreground">Origem</label>
            <select v-model="formOriginType" :disabled="Boolean(editingRow)" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60">
              <option v-for="entry in originTypeOptions" :key="entry.value" :value="entry.value">{{ entry.label }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Tipo financeiro</label>
            <select v-model="formType" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">2) Valores</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formExpectedValue" label="Valor previsto" type="number" placeholder="0.00" required />
            <AppInput v-model="formRealValue" label="Valor realizado (edicao)" type="number" placeholder="Sera igual ao previsto na criacao" />
          </div>
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
              <label class="block text-sm font-medium text-foreground">Conta</label>
              <select v-model="formAccountId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="">Nenhuma</option>
                <option v-for="entry in accounts" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Cartao</label>
              <select v-model="formCardId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="">Nenhum</option>
                <option v-for="entry in cards" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Categoria</label>
              <select v-model="formCategoryId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="">Nenhuma</option>
                <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Status</label>
            <select v-model="formStatus" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ transactionStatusLabelMap[entry] }}</option>
            </select>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">4) Repeticao / Parcelamento</p>

          <div v-if="formOriginType === 'single'" class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formDueDate" label="Data de vencimento" type="date" required />
            <AppInput v-model="formInstanceDate" label="Data da instancia" type="date" required />
          </div>

          <div v-else-if="formOriginType === 'installment'" class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formInstallmentTotal" label="Quantidade de parcelas" type="number" placeholder="2" required />
            <AppInput v-model="formInstallmentStartDate" label="Data inicial do parcelamento" type="date" required />
          </div>

          <div v-else class="space-y-3 rounded-xl border border-border p-3">
            <div class="grid gap-4 sm:grid-cols-2">
              <AppInput v-model="formRecurringStartDate" label="Data inicial" type="date" required />

              <div class="space-y-2">
                <label class="block text-sm font-medium text-foreground">Frequencia</label>
                <select v-model="formRecurringFrequency" :disabled="Boolean(editingRow)" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60">
                  <option v-for="entry in RECURRING_FREQUENCIES" :key="entry" :value="entry">{{ recurringFrequencyLabelMap[entry] }}</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">Encerrar recorrência por</label>
              <select v-model="formRecurringEndingMode" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
                <option value="no_end">Sem data final</option>
                <option value="count">Quantidade de vezes</option>
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

            <p v-if="formRecurringEndingMode === 'no_end'" class="text-xs text-muted">
              O MVP gera até 12 meses futuros para recorrências sem data final.
            </p>

            <p v-if="editingRow" class="text-xs text-muted">
              A frequência permanece travada na edição para evitar distorcer instâncias recorrentes já geradas.
            </p>
          </div>

          <div v-if="isEditingRecurring" class="space-y-2 rounded-xl border border-border p-3">
            <label class="block text-sm font-medium text-foreground">Aplicar edicao em</label>
            <select v-model="formRecurringScope" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option v-for="option in recurringScopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-semibold text-foreground">5) Observacoes</p>
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
      v-model="isCancelModalOpen"
      title="Cancelar lancamento recorrente"
      description="Escolha como o cancelamento sera aplicado."
      max-width-class="max-w-lg"
    >
      <div class="space-y-3">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Escopo do cancelamento</label>
          <select v-model="cancelRecurringScope" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in recurringScopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <p v-if="cancelError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ cancelError }}</p>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Voltar" variant="ghost" block @click="isCancelModalOpen = false" />
          <AppButton :label="cancelSaving ? 'Cancelando...' : 'Confirmar cancelamento'" variant="danger" :disabled="cancelSaving" block @click="confirmRecurringCancel" />
        </div>
      </template>
    </AppModal>

    <AppModal
      v-model="isDeleteModalOpen"
      title="Deletar lancamento"
      description="Confirme a exclusao do lancamento selecionado."
      max-width-class="max-w-lg"
    >
      <div class="space-y-3">
        <p class="text-sm text-foreground">Esta acao nao pode ser desfeita.</p>

        <div v-if="deleteTargetRow?.origin_type === 'recurring'" class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Escopo da exclusao</label>
          <select v-model="deleteRecurringScope" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in deleteRecurringScopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <p v-if="deleteError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ deleteError }}</p>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Voltar" variant="ghost" block @click="isDeleteModalOpen = false" />
          <AppButton :label="deleteSaving ? 'Deletando...' : 'Confirmar exclusao'" variant="danger" :disabled="deleteSaving" block @click="confirmDeleteTransaction" />
        </div>
      </template>
    </AppModal>
  </section>
</template>
