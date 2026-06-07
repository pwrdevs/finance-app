<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPES,
  type TransactionInstanceItem,
  type TransactionStatus,
  type TransactionType
} from '~/composables/useTransactions'
import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

definePageMeta({
  middleware: 'auth'
})

const {
  createSingleTransaction,
  listFilterOptions,
  listManualInstances,
  setChecked,
  setStatus,
  updateTransactionInstance
} = useTransactions()

const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const modalError = ref('')

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
const editingRow = ref<TransactionInstanceItem | null>(null)

const formTitle = ref('')
const formType = ref<TransactionType>('expense')
const formExpectedValue = ref('')
const formRealValue = ref('')
const formDueDate = ref('')
const formInstanceDate = ref('')
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

const peopleMap = computed(() => new Map(people.value.map(entry => [entry.id, entry.name])))
const accountsMap = computed(() => new Map(accounts.value.map(entry => [entry.id, entry.name])))
const cardsMap = computed(() => new Map(cards.value.map(entry => [entry.id, entry.name])))
const categoriesMap = computed(() => new Map(categories.value.map(entry => [entry.id, entry.name])))

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
  formType.value = 'expense'
  formExpectedValue.value = ''
  formRealValue.value = ''
  formDueDate.value = `${monthYear.value}-01`
  formInstanceDate.value = `${monthYear.value}-01`
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
  formType.value = row.type
  formExpectedValue.value = String(row.expected_value)
  formRealValue.value = row.real_value == null ? '' : String(row.real_value)
  formDueDate.value = row.due_date
  formInstanceDate.value = row.instance_date
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
    pageError.value = err instanceof Error ? err.message : 'Failed to load transactions.'
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
    pageError.value = err instanceof Error ? err.message : 'Failed to load form filters.'
  }
}

async function submitForm() {
  modalError.value = ''

  if (!formTitle.value.trim()) {
    modalError.value = 'Title is required.'
    return
  }

  const parsedExpected = Number(formExpectedValue.value)
  if (Number.isNaN(parsedExpected)) {
    modalError.value = 'Expected value must be a valid number.'
    return
  }

  const parsedReal = parseOptionalNumber(formRealValue.value)
  if (Number.isNaN(parsedReal)) {
    modalError.value = 'Real value must be a valid number when provided.'
    return
  }

  if (!formDueDate.value || !formInstanceDate.value) {
    modalError.value = 'Due date and instance date are required.'
    return
  }

  saving.value = true

  try {
    if (editingRow.value) {
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
        editingRow.value.source_transaction_id
      )
    } else {
      await createSingleTransaction({
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
      })
    }

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Failed to save transaction.'
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
    pageError.value = err instanceof Error ? err.message : 'Failed to update checked state.'
  }
}

async function changeStatus(row: TransactionInstanceItem, nextStatus: TransactionStatus) {
  pageError.value = ''

  try {
    await setStatus(row, nextStatus)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to update status.'
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
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Manual Launches</h2>
      <p class="mt-2 text-sm text-muted">Single transactions using transaction_instances as the financial source.</p>
    </div>

    <AppCard title="Filters">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppInput v-model="monthYear" label="Month / Year" type="month" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="typeFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in TRANSACTION_TYPES" :key="entry" :value="entry">{{ entry }}</option>
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
          <label class="block text-sm font-medium text-foreground">Card</label>
          <select v-model="cardFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in cards" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
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
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="statusFilter" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in TRANSACTION_STATUS" :key="entry" :value="entry">{{ entry }}</option>
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

      <div class="mt-4 flex justify-end">
        <AppButton label="New transaction" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard
      title="Instances list"
      :subtitle="loading
        ? 'Loading data...'
        : `${filteredRows.length} record(s) in ${monthYearLabel} • Expected balance: ${formatCurrency(totalExpected)} • Real balance: ${formatCurrency(totalReal)}`"
    >
      <AppTable :columns="columns" :rows="filteredRows" empty-message="No transactions found for this period.">
        <template #cell-instance_date="{ value }">
          {{ String(value) }}
        </template>

        <template #cell-type="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="value === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
            {{ value }}
          </span>
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
              :label="(row as TransactionInstanceItem).is_checked ? 'Uncheck' : 'Check'"
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
    </AppCard>

    <AppModal
      v-model="isModalOpen"
      :title="editingRow ? 'Edit transaction instance' : 'New single transaction'"
      description="Creates or updates a manual single launch and its financial instance."
    >
      <div class="space-y-4">
        <AppInput v-model="formTitle" label="Title" placeholder="Transaction title" required />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="formType" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in TRANSACTION_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <AppInput v-model="formExpectedValue" label="Expected value" type="number" placeholder="0.00" required />
          <AppInput v-model="formRealValue" label="Real value" type="number" placeholder="Optional" />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <AppInput v-model="formDueDate" label="Due date" type="date" required />
          <AppInput v-model="formInstanceDate" label="Instance date" type="date" required />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
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
        <div class="flex justify-end gap-2">
          <AppButton label="Cancel" variant="ghost" @click="isModalOpen = false" />
          <AppButton :label="saving ? 'Saving...' : 'Save'" :disabled="saving" @click="submitForm" />
        </div>
      </template>
    </AppModal>
  </section>
</template>