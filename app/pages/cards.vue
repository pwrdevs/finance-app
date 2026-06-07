<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import type { CardItem, PersonItem } from '~/composables/useMasterData'

definePageMeta({
  middleware: 'auth'
})

const { deactivateCard, listCards, listPeople, upsertCard } = useMasterData()

const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const modalError = ref('')

const search = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('active')
const personFilter = ref('all')

const rows = ref<CardItem[]>([])
const people = ref<PersonItem[]>([])

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const name = ref('')
const personId = ref('')
const brand = ref('')
const closingDay = ref('')
const dueDay = ref('')
const creditLimit = ref('')
const isActive = ref(true)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'person_name', label: 'Person' },
  { key: 'brand', label: 'Brand' },
  { key: 'closing_day', label: 'Closing day', align: 'center' as const },
  { key: 'due_day', label: 'Due day', align: 'center' as const },
  { key: 'credit_limit', label: 'Credit limit', align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' as const }
]

const peopleMap = computed(() => {
  return new Map(people.value.map(entry => [entry.id, entry.name]))
})

const activePeople = computed(() => people.value.filter(entry => entry.is_active))

const filteredRows = computed(() => {
  const normalizedSearch = search.value.trim().toLowerCase()

  return rows.value
    .filter((row) => {
      if (statusFilter.value === 'active') {
        return row.is_active
      }

      if (statusFilter.value === 'inactive') {
        return !row.is_active
      }

      return true
    })
    .filter((row) => {
      if (personFilter.value === 'all') {
        return true
      }

      return row.person_id === personFilter.value
    })
    .filter((row) => {
      if (!normalizedSearch) {
        return true
      }

      const personName = peopleMap.value.get(row.person_id) || ''

      return row.name.toLowerCase().includes(normalizedSearch)
        || (row.brand || '').toLowerCase().includes(normalizedSearch)
        || personName.toLowerCase().includes(normalizedSearch)
    })
    .map((row) => ({
      ...row,
      person_name: peopleMap.value.get(row.person_id) || 'Unknown person',
      status: row.is_active ? 'Active' : 'Inactive',
      closing_day: row.closing_day ?? '—',
      due_day: row.due_day ?? '—',
      credit_limit: row.credit_limit == null ? '—' : Number(row.credit_limit).toFixed(2)
    }))
})

function resetForm() {
  editingId.value = null
  name.value = ''
  personId.value = activePeople.value[0]?.id || ''
  brand.value = ''
  closingDay.value = ''
  dueDay.value = ''
  creditLimit.value = ''
  isActive.value = true
  modalError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(row: CardItem) {
  editingId.value = row.id
  name.value = row.name
  personId.value = row.person_id
  brand.value = row.brand ?? ''
  closingDay.value = row.closing_day == null ? '' : String(row.closing_day)
  dueDay.value = row.due_day == null ? '' : String(row.due_day)
  creditLimit.value = row.credit_limit == null ? '' : String(row.credit_limit)
  isActive.value = row.is_active
  modalError.value = ''
  isModalOpen.value = true
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    const [cardsData, peopleData] = await Promise.all([
      listCards(),
      listPeople()
    ])

    rows.value = cardsData
    people.value = peopleData

    if (!personId.value && activePeople.value.length > 0) {
      personId.value = activePeople.value[0].id
    }
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to load cards.'
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  modalError.value = ''

  if (!name.value.trim()) {
    modalError.value = 'Name is required.'
    return
  }

  if (!personId.value) {
    modalError.value = 'Person is required.'
    return
  }

  const personExists = people.value.some(entry => entry.id === personId.value)

  if (!personExists) {
    modalError.value = 'Selected person does not exist.'
    return
  }

  const parsedClosingDay = parseOptionalNumber(closingDay.value)
  const parsedDueDay = parseOptionalNumber(dueDay.value)
  const parsedCreditLimit = parseOptionalNumber(creditLimit.value)

  if (Number.isNaN(parsedClosingDay) || Number.isNaN(parsedDueDay) || Number.isNaN(parsedCreditLimit)) {
    modalError.value = 'Closing day, due day and credit limit must be valid numbers when provided.'
    return
  }

  if (parsedClosingDay != null && (parsedClosingDay < 1 || parsedClosingDay > 31)) {
    modalError.value = 'Closing day must be between 1 and 31.'
    return
  }

  if (parsedDueDay != null && (parsedDueDay < 1 || parsedDueDay > 31)) {
    modalError.value = 'Due day must be between 1 and 31.'
    return
  }

  saving.value = true

  try {
    await upsertCard(
      {
        name: name.value,
        person_id: personId.value,
        brand: brand.value,
        closing_day: parsedClosingDay,
        due_day: parsedDueDay,
        credit_limit: parsedCreditLimit,
        is_active: isActive.value
      },
      editingId.value || undefined
    )

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Failed to save card.'
  } finally {
    saving.value = false
  }
}

async function deactivate(row: CardItem) {
  pageError.value = ''

  try {
    await deactivateCard(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to deactivate card.'
  }
}

onMounted(async () => {
  await fetchRows()
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Master Data</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Cards</h2>
      <p class="mt-2 text-sm text-muted">Manage credit cards linked to existing people.</p>
    </div>

    <AppCard title="Filters">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Search" placeholder="Search by card, brand or person" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Person</label>
          <select v-model="personFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="statusFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        <AppButton label="New card" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Cards list" :subtitle="loading ? 'Loading data...' : `${filteredRows.length} record(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="No cards found.">
        <template #cell-status="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            {{ value }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <AppButton size="sm" variant="ghost" label="Edit" @click="openEditModal(row as CardItem)" />
            <AppButton
              v-if="(row as CardItem).is_active"
              size="sm"
              variant="danger"
              label="Disable"
              @click="deactivate(row as CardItem)"
            />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Edit card' : 'New card'" description="Create or update a card record.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Name" placeholder="Card name" required />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Person</label>
          <select v-model="personId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in activePeople" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <AppInput v-model="brand" label="Brand" placeholder="Visa, Mastercard..." />

        <div class="grid gap-4 md:grid-cols-2">
          <AppInput v-model="closingDay" label="Closing day" type="number" placeholder="1-31" />
          <AppInput v-model="dueDay" label="Due day" type="number" placeholder="1-31" />
        </div>

        <AppInput v-model="creditLimit" label="Credit limit" type="number" placeholder="0.00" />

        <label class="flex items-center gap-2 text-sm text-foreground">
          <input v-model="isActive" type="checkbox" class="h-4 w-4 rounded border-border" />
          Active
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
