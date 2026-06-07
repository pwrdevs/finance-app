<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import { ACCOUNT_TYPES } from '~/composables/useMasterData'
import type { AccountItem, AccountType } from '~/composables/useMasterData'

definePageMeta({
  middleware: 'auth'
})

const { deactivateAccount, listAccounts, upsertAccount } = useMasterData()

const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const modalError = ref('')

const search = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('active')
const typeFilter = ref<'all' | AccountType>('all')

const rows = ref<AccountItem[]>([])

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const name = ref('')
const type = ref<AccountType>('checking')
const initialBalance = ref('0')
const isActive = ref(true)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'initial_balance', label: 'Initial Balance', align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: 'Actions', align: 'right' as const }
]

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
      if (typeFilter.value === 'all') {
        return true
      }

      return row.type === typeFilter.value
    })
    .filter((row) => {
      if (!normalizedSearch) {
        return true
      }

      return row.name.toLowerCase().includes(normalizedSearch)
    })
    .map((row) => ({
      ...row,
      status: row.is_active ? 'Active' : 'Inactive',
      initial_balance: Number(row.initial_balance).toFixed(2)
    }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-CA')
}

function resetForm() {
  editingId.value = null
  name.value = ''
  type.value = 'checking'
  initialBalance.value = '0'
  isActive.value = true
  modalError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(row: AccountItem) {
  editingId.value = row.id
  name.value = row.name
  type.value = row.type
  initialBalance.value = String(row.initial_balance)
  isActive.value = row.is_active
  modalError.value = ''
  isModalOpen.value = true
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    rows.value = await listAccounts()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to load accounts.'
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

  const parsedBalance = Number(initialBalance.value)

  if (Number.isNaN(parsedBalance)) {
    modalError.value = 'Initial balance must be a valid number.'
    return
  }

  saving.value = true

  try {
    await upsertAccount(
      {
        name: name.value,
        type: type.value,
        initial_balance: parsedBalance,
        is_active: isActive.value
      },
      editingId.value || undefined
    )

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Failed to save account.'
  } finally {
    saving.value = false
  }
}

async function deactivate(row: AccountItem) {
  pageError.value = ''

  try {
    await deactivateAccount(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to deactivate account.'
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
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Accounts</h2>
      <p class="mt-2 text-sm text-muted">Manage financial containers used by the application.</p>
    </div>

    <AppCard title="Filters">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Search" placeholder="Search by account name" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="typeFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in ACCOUNT_TYPES" :key="entry" :value="entry">{{ entry }}</option>
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

        <AppButton label="New account" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Accounts list" :subtitle="loading ? 'Loading data...' : `${filteredRows.length} record(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="No accounts found.">
        <template #cell-type="{ value }">
          <span class="capitalize">{{ value }}</span>
        </template>

        <template #cell-status="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            {{ value }}
          </span>
        </template>

        <template #cell-created_at="{ value }">
          {{ formatDate(String(value)) }}
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <AppButton size="sm" variant="ghost" label="Edit" @click="openEditModal(row as AccountItem)" />
            <AppButton
              v-if="(row as AccountItem).is_active"
              size="sm"
              variant="danger"
              label="Disable"
              @click="deactivate(row as AccountItem)"
            />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Edit account' : 'New account'" description="Create or update an account.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Name" placeholder="Account name" required />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="type" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in ACCOUNT_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <AppInput v-model="initialBalance" label="Initial balance" type="number" placeholder="0.00" required />

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
