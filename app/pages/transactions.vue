<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import {
  RECURRING_SCOPE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPES,
  type RecurringScope,
  type TransactionOriginType,
  type TransactionInstanceItem,
  type TransactionStatus,
  type TransactionType
} from '~/composables/useTransactions'
import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

definePageMeta({
  middleware: 'auth'
})

const {
  cancelRecurringTransaction,
  createTransaction,
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
const pageError = ref('')
const modalError = ref('')
const cancelError = ref('')

const monthYear = ref(new Date().toISOString().slice(0, 7))
const typeFilter = ref<'all' | TransactionType>('all')
const personFilter = ref('all')
const cardFilter = ref('all')
const accountFilter = ref('all')
const categoryFilter = ref('all')
const statusFilter = ref<'all' | TransactionStatus>('all')
const checkedFilter = ref<'all' | 'checked' | 'unchecked'>('all')

const rows = ref<TransactionInstanceItem[]>([])
const people = ref<PersonItem[]>([])
const accounts = ref<AccountItem[]>([])
const cards = ref<CardItem[]>([])
const categories = ref<CategoryItem[]>([])

const isModalOpen = ref(false)
const isCancelModalOpen = ref(false)
const editingRow = ref<TransactionInstanceItem | null>(null)
const cancelTargetRow = ref<TransactionInstanceItem | null>(null)

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
const formRecurringScope = ref<RecurringScope>('single')
const cancelRecurringScope = ref<RecurringScope>('single')
const formPersonId = ref('')
const formAccountId = ref('')
const formCardId = ref('')
const formCategoryId = ref('')
const formDescription = ref('')
const formStatus = ref<TransactionStatus>('pending')
const formChecked = ref(false)

const columns = [
  { key: 'instance_date', label: 'Date' },
  { key: 'title', label: 'Title' },
  { key: 'origin_label', label: 'Origin' },
  { key: 'installment_label', label: 'Installment' },
  { key: 'type', label: 'Type' },
  { key: 'expected_value', label: 'Expected', align: 'right' as const },
  { key: 'real_value', label: 'Real', align: 'right' as const },
  { key: 'person_name', label: 'Person' },
  { key: 'account_name', label: 'Account' },
  { key: 'card_name', label: 'Card' },
  { key: 'category_name', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'checked_badge', label: 'Checked' },
  { key: 'actions', label: 'Actions', align: 'right' as const }
]

const originTypeOptions = [
  { value: 'single', label: 'Single launch' },
  { value: 'installment', label: 'Installment purchase' },
  { value: 'recurring', label: 'Recurring monthly launch' }
] as const

const originTypeLabelMap: Record<TransactionOriginType, string> = {
  single: 'Single',
  installment: 'Installment',
  recurring: 'Recurring'
}

const recurringScopeOptions = [
  { value: 'single', label: 'Only this instance' },
  { value: 'future', label: 'This and future instances' },
  { value: 'series', label: 'Full series (future only)' }
] as const

const peopleMap = computed(() => new Map(people.value.map(entry => [entry.id, entry.name])))
const accountsMap = computed(() => new Map(accounts.value.map(entry => [entry.id, entry.name])))
const cardsMap = computed(() => new Map(cards.value.map(entry => [entry.id, entry.name])))
const categoriesMap = computed(() => new Map(categories.value.map(entry => [entry.id, entry.name])))

const isEditingRecurring = computed(() => editingRow.value?.origin_type === 'recurring')

const originTypeHint = computed(() => {
  if (formOriginType.value === 'single') {
    return 'Creates one instance for the selected date.'
  }

  if (formOriginType.value === 'installment') {
    return 'Splits the total purchase into monthly card installments.'
  }

  return 'Generates monthly instances (up to 12 months in current MVP).'
})

const monthYearLabel = computed(() => {
  const date = new Date(`${monthYear.value}-01T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return monthYear.value
  }

  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
})

const filteredRows = computed(() => {
  return rows.value
    .filter((row) => typeFilter.value === 'all' || row.type === typeFilter.value)
    .filter((row) => personFilter.value === 'all' || row.person_id === personFilter.value)
    .filter((row) => cardFilter.value === 'all' || row.card_id === cardFilter.value)
    .filter((row) => accountFilter.value === 'all' || row.account_id === accountFilter.value)
    .filter((row) => categoryFilter.value === 'all' || row.category_id === categoryFilter.value)
    .filter((row) => statusFilter.value === 'all' || row.status === statusFilter.value)
    .filter((row) => {
      if (checkedFilter.value === 'checked') {
        return row.is_checked
      }

      if (checkedFilter.value === 'unchecked') {
        return !row.is_checked
      }

      return true
    })
    .map((row) => ({
      ...row,
      origin_label: originTypeLabelMap[row.origin_type],
      installment_label: row.origin_type === 'installment' && row.installment_number && row.installment_total
        ? `${row.installment_number}/${row.installment_total}`
        : '—',
      person_name: row.person_id ? (peopleMap.value.get(row.person_id) || 'Unknown') : '—',
      account_name: row.account_id ? (accountsMap.value.get(row.account_id) || 'Unknown') : '—',
      card_name: row.card_id ? (cardsMap.value.get(row.card_id) || 'Unknown') : '—',
      category_name: row.category_id ? (categoriesMap.value.get(row.category_id) || 'Unknown') : '—',
      checked_badge: row.is_checked ? 'Checked' : 'Open'
    }))
})

const totalExpected = computed(() => {
  return filteredRows.value.reduce((sum, row) => {
    const signed = row.type === 'income' ? row.expected_value : -row.expected_value
    return sum + signed
  }, 0)
})

const totalReal = computed(() => {
  return filteredRows.value.reduce((sum, row) => {
    if (row.real_value == null) {
      return sum
    }

    const signed = row.type === 'income' ? row.real_value : -row.real_value
    return sum + signed
  }, 0)
})

function formatCurrency(value: number | null) {
  if (value == null) {
    return '—'
  }

  return Number(value).toFixed(2)
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
  formRecurringScope.value = 'single'
  formPersonId.value = ''
  formAccountId.value = ''
  formCardId.value = ''
  formCategoryId.value = ''
  formDescription.value = ''
  formStatus.value = 'pending'
  formChecked.value = false
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
  formRecurringScope.value = 'single'
  formPersonId.value = row.person_id ?? ''
  formAccountId.value = row.account_id ?? ''
  formCardId.value = row.card_id ?? ''
  formCategoryId.value = row.category_id ?? ''
  formDescription.value = row.description ?? ''
  formStatus.value = row.status
  formChecked.value = row.is_checked
  modalError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(row: TransactionInstanceItem) {
  fillFormFromRow(row)
  isModalOpen.value = true
}

function openRecurringCancelModal(row: TransactionInstanceItem) {
  cancelTargetRow.value = row
  cancelRecurringScope.value = 'single'
  cancelError.value = ''
  isCancelModalOpen.value = true
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

function parseMonthYear(value: string) {
  const [yearText, monthText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    throw new Error('Invalid month/year filter.')
  }

  return { month, year }
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    const period = parseMonthYear(monthYear.value)
    rows.value = await listManualInstances(period)
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Unable to load transactions for the selected month.'
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
    pageError.value = err instanceof Error ? err.message : 'Unable to load filters and form options.'
  }
}

async function submitForm() {
  modalError.value = ''

  if (!formTitle.value.trim()) {
    modalError.value = 'Title is required to save this launch.'
    return
  }

  const parsedExpected = Number(formExpectedValue.value)
  if (Number.isNaN(parsedExpected) || parsedExpected <= 0) {
    modalError.value = 'Expected value must be a valid number greater than zero.'
    return
  }

  const parsedReal = parseOptionalNumber(formRealValue.value)
  if (Number.isNaN(parsedReal)) {
    modalError.value = 'Real value must be a valid number when provided.'
    return
  }

  if (formOriginType.value === 'single' && (!formDueDate.value || !formInstanceDate.value)) {
    modalError.value = 'Due date and instance date are required for a single launch.'
    return
  }

  const parsedInstallmentTotal = Number(formInstallmentTotal.value)

  if (formOriginType.value === 'installment') {
    if (!Number.isInteger(parsedInstallmentTotal) || parsedInstallmentTotal < 2) {
      modalError.value = 'Installment total must be an integer greater than or equal to 2.'
      return
    }

    if (!formCardId.value) {
      modalError.value = 'Card is required for installment transactions.'
      return
    }

    if (!formInstallmentStartDate.value) {
      modalError.value = 'Installment start date is required.'
      return
    }
  }

  if (formOriginType.value === 'recurring') {
    if (!formRecurringStartDate.value) {
      modalError.value = 'Recurring start date is required.'
      return
    }

    if (!editingRow.value && !formRecurringNoEndDate.value && !formRecurringEndDate.value) {
      modalError.value = 'Recurring end date is required when no end date is disabled.'
      return
    }

    if (formRecurringEndDate.value && formRecurringEndDate.value < formRecurringStartDate.value) {
      modalError.value = 'Recurring end date must be greater than or equal to start date.'
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
            is_checked: formChecked.value,
            recurring_end_date: formRecurringNoEndDate.value ? null : (formRecurringEndDate.value || null),
            recurring_no_end_date: formRecurringNoEndDate.value
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
            is_checked: formChecked.value
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
        real_value: parsedReal,
        due_date: formOriginType.value === 'single' ? formDueDate.value : formInstallmentStartDate.value,
        instance_date: formOriginType.value === 'single' ? formInstanceDate.value : formInstallmentStartDate.value,
        installment_total: formOriginType.value === 'installment' ? parsedInstallmentTotal : undefined,
        installment_start_date: formOriginType.value === 'installment' ? formInstallmentStartDate.value : undefined,
        recurring_start_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : undefined,
        recurring_end_date: formOriginType.value === 'recurring' && !formRecurringNoEndDate.value
          ? (formRecurringEndDate.value || null)
          : null,
        recurring_no_end_date: formOriginType.value === 'recurring' ? formRecurringNoEndDate.value : undefined,
        person_id: formPersonId.value || null,
        account_id: formAccountId.value || null,
        card_id: formCardId.value || null,
        category_id: formCategoryId.value || null,
        description: formDescription.value,
        status: formStatus.value,
        is_checked: formChecked.value
      })
    }

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Unable to save this transaction right now.'
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
    pageError.value = err instanceof Error ? err.message : 'Unable to update reconciliation status.'
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
    pageError.value = err instanceof Error ? err.message : 'Unable to update transaction status.'
  }
}

async function confirmRecurringCancel() {
  cancelError.value = ''

  if (!cancelTargetRow.value) {
    cancelError.value = 'No recurring transaction selected for cancellation.'
    return
  }

  cancelSaving.value = true

  try {
    await cancelRecurringTransaction(cancelTargetRow.value, cancelRecurringScope.value)
    isCancelModalOpen.value = false
    await fetchRows()
  } catch (err) {
    cancelError.value = err instanceof Error ? err.message : 'Unable to cancel recurring transaction for the selected scope.'
  } finally {
    cancelSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchOptions(), fetchRows()])
})

watch(monthYear, async () => {
  await fetchRows()
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Transactions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Financial Launches</h2>
      <p class="mt-2 text-sm text-muted">Single, installment, and recurring launches. Financial calculations use transaction_instances as source of truth.</p>
    </div>

    <AppCard title="Filters" subtitle="Start with month, card and status on mobile.">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AppInput v-model="monthYear" label="Month / Year" type="month" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Card</label>
          <select v-model="cardFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in cards" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="typeFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in TRANSACTION_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="statusFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Person</label>
          <select v-model="personFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Account</label>
          <select v-model="accountFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in accounts" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Category</label>
          <select v-model="categoryFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Checked</label>
          <select v-model="checkedFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
          </select>
        </div>
      </div>

      <div class="mt-4">
        <AppButton label="New transaction" size="lg" block @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard
      title="Instances list"
      :subtitle="loading
        ? 'Loading data...'
        : `${filteredRows.length} record(s) in ${monthYearLabel} · Expected ${formatCurrency(totalExpected)} · Real ${formatCurrency(totalReal)}`"
    >
      <div class="space-y-3 md:hidden">
        <article
          v-for="row in filteredRows"
          :key="row.id"
          class="rounded-2xl border border-border bg-surface p-3 shadow-soft"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-foreground">{{ row.title }}</p>
              <p class="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                {{ row.instance_date }} · {{ row.origin_label }}
              </p>
            </div>
            <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="row.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
              {{ row.type }}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-xl bg-primary-light/20 px-3 py-2">
              <p class="text-[11px] uppercase tracking-[0.12em] text-muted">Expected</p>
              <p class="mt-1 font-semibold text-foreground">{{ formatCurrency(Number(row.expected_value)) }}</p>
            </div>
            <div class="rounded-xl bg-primary-light/20 px-3 py-2">
              <p class="text-[11px] uppercase tracking-[0.12em] text-muted">Real</p>
              <p class="mt-1 font-semibold text-foreground">{{ formatCurrency(row.real_value == null ? null : Number(row.real_value)) }}</p>
            </div>
            <div class="rounded-xl bg-primary-light/20 px-3 py-2">
              <p class="text-[11px] uppercase tracking-[0.12em] text-muted">Card</p>
              <p class="mt-1 truncate font-semibold text-foreground">{{ row.card_name }}</p>
            </div>
            <div class="rounded-xl bg-primary-light/20 px-3 py-2">
              <p class="text-[11px] uppercase tracking-[0.12em] text-muted">Checked</p>
              <p class="mt-1 font-semibold" :class="row.checked_badge === 'Checked' ? 'text-emerald-700' : 'text-amber-700'">{{ row.checked_badge }}</p>
            </div>
          </div>

          <div class="mt-3 space-y-2">
            <label class="block text-xs font-medium text-foreground">Status</label>
            <select
              class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
              :value="row.status"
              @change="changeStatus(row as TransactionInstanceItem, ($event.target as HTMLSelectElement).value as TransactionStatus)"
            >
              <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ entry }}</option>
            </select>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <AppButton size="lg" label="Edit" block @click="openEditModal(row as TransactionInstanceItem)" />
            <AppButton
              size="lg"
              :variant="row.is_checked ? 'secondary' : 'primary'"
              :label="row.is_checked ? 'Undo reconcile' : 'Reconcile'"
              block
              @click="toggleChecked(row as TransactionInstanceItem)"
            />
            <AppButton
              v-if="row.status !== 'canceled'"
              size="lg"
              variant="danger"
              label="Cancel"
              block
              class="col-span-2"
              @click="changeStatus(row as TransactionInstanceItem, 'canceled')"
            />
          </div>
        </article>

        <p v-if="!filteredRows.length" class="rounded-xl border border-border bg-surface px-4 py-5 text-center text-sm text-muted">
          No transactions found for this period. Try changing filters or create a new launch.
        </p>
      </div>

      <div class="hidden md:block">
        <AppTable :columns="columns" :rows="filteredRows" empty-message="No transactions found for this period.">
          <template #cell-instance_date="{ value }">
            {{ String(value) }}
          </template>

          <template #cell-type="{ value }">
            <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="value === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
              {{ value }}
            </span>
          </template>

          <template #cell-origin_label="{ value }">
            <span>{{ value }}</span>
          </template>

          <template #cell-expected_value="{ value }">
            {{ formatCurrency(Number(value)) }}
          </template>

          <template #cell-real_value="{ value }">
            {{ formatCurrency(value == null ? null : Number(value)) }}
          </template>

          <template #cell-status="{ row }">
            <select
              class="h-9 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
              :value="(row as TransactionInstanceItem).status"
              @change="changeStatus(row as TransactionInstanceItem, ($event.target as HTMLSelectElement).value as TransactionStatus)"
            >
              <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ entry }}</option>
            </select>
          </template>

          <template #cell-checked_badge="{ value }">
            <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Checked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
              {{ value }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-2">
              <AppButton size="sm" variant="ghost" label="Edit" @click="openEditModal(row as TransactionInstanceItem)" />
              <AppButton
                size="sm"
                :variant="(row as TransactionInstanceItem).is_checked ? 'secondary' : 'primary'"
                :label="(row as TransactionInstanceItem).is_checked ? 'Undo reconcile' : 'Reconcile'"
                @click="toggleChecked(row as TransactionInstanceItem)"
              />
              <AppButton
                v-if="(row as TransactionInstanceItem).status !== 'canceled'"
                size="sm"
                variant="danger"
                label="Cancel"
                @click="changeStatus(row as TransactionInstanceItem, 'canceled')"
              />
            </div>
          </template>
        </AppTable>
      </div>
    </AppCard>

    <AppModal
      v-model="isModalOpen"
      :title="editingRow ? 'Edit transaction instance' : 'New transaction'"
      description="Creates and manages single, installment and recurring launches."
      max-width-class="max-w-2xl"
    >
      <div class="space-y-4">
        <AppInput v-model="formTitle" label="Title" placeholder="Transaction title" required />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Origin Type</label>
          <select v-model="formOriginType" :disabled="Boolean(editingRow)" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60">
            <option v-for="entry in originTypeOptions" :key="entry.value" :value="entry.value">{{ entry.label }}</option>
          </select>
          <p v-if="editingRow" class="text-xs text-muted">Origin type cannot be changed in edit mode.</p>
          <p v-else class="text-xs text-muted">{{ originTypeHint }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="formType" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in TRANSACTION_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AppInput
            v-model="formExpectedValue"
            :label="formOriginType === 'installment' ? 'Expected total purchase value' : 'Expected value'"
            type="number"
            placeholder="0.00"
            required
          />
          <AppInput v-model="formRealValue" label="Real value" type="number" placeholder="Optional" />
        </div>

        <div v-if="formOriginType === 'single'" class="grid gap-4 sm:grid-cols-2">
          <AppInput v-model="formDueDate" label="Due date" type="date" required />
          <AppInput v-model="formInstanceDate" label="Instance date" type="date" required />
        </div>

        <div v-else-if="formOriginType === 'installment'" class="grid gap-4 sm:grid-cols-2">
          <AppInput v-model="formInstallmentTotal" label="Installment total" type="number" placeholder="2" required />
          <AppInput v-model="formInstallmentStartDate" label="Installment start date" type="date" required />
        </div>

        <div v-else class="space-y-3 rounded-xl border border-border p-3">
          <p class="text-sm font-medium text-foreground">Repeat monthly</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="formRecurringStartDate" label="Start date" type="date" required />
            <AppInput
              v-model="formRecurringEndDate"
              label="End date (optional)"
              type="date"
              :disabled="formRecurringNoEndDate"
              placeholder="Optional"
            />
          </div>
          <label class="flex items-center gap-2 text-sm text-foreground">
            <input v-model="formRecurringNoEndDate" type="checkbox" class="h-4 w-4 rounded border-border" />
            No end date (MVP will generate 12 months)
          </label>
        </div>

        <div v-if="isEditingRecurring" class="space-y-2 rounded-xl border border-border p-3">
          <label class="block text-sm font-medium text-foreground">Apply edit to</label>
          <select v-model="formRecurringScope" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in recurringScopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Person</label>
            <select v-model="formPersonId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="">None</option>
              <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Account</label>
            <select v-model="formAccountId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="">None</option>
              <option v-for="entry in accounts" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Card</label>
            <select v-model="formCardId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="">None</option>
              <option v-for="entry in cards" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Category</label>
            <select v-model="formCategoryId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="">None</option>
              <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="formStatus" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <AppInput v-model="formDescription" label="Description" placeholder="Optional details" />

        <label class="flex items-center gap-2 text-sm text-foreground">
          <input v-model="formChecked" type="checkbox" class="h-4 w-4 rounded border-border" />
          Checked / reconciled
        </label>

        <p v-if="modalError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ modalError }}</p>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Cancel" variant="ghost" block @click="isModalOpen = false" />
          <AppButton :label="saving ? 'Saving...' : 'Save'" :disabled="saving" block @click="submitForm" />
        </div>
      </template>
    </AppModal>

    <AppModal
      v-model="isCancelModalOpen"
      title="Cancel recurring transaction"
      description="Choose how cancellation should be applied."
      max-width-class="max-w-lg"
    >
      <div class="space-y-3">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Cancel scope</label>
          <select v-model="cancelRecurringScope" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in recurringScopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <p v-if="cancelError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ cancelError }}</p>
      </div>

      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton label="Back" variant="ghost" block @click="isCancelModalOpen = false" />
          <AppButton
            label="Confirm cancel"
            variant="danger"
            :disabled="cancelSaving"
            block
            @click="confirmRecurringCancel"
          />
        </div>
      </template>
    </AppModal>
  </section>
</template>
