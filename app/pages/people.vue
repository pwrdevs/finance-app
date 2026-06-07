<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import type { PersonItem } from '~/composables/useMasterData'

definePageMeta({
  middleware: 'auth'
})

const { deactivatePerson, listPeople, upsertPerson } = useMasterData()

const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const modalError = ref('')
const search = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('active')

const rows = ref<PersonItem[]>([])

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const name = ref('')
const notes = ref('')
const isActive = ref(true)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'notes', label: 'Notes' },
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
      if (!normalizedSearch) {
        return true
      }

      return row.name.toLowerCase().includes(normalizedSearch)
        || (row.notes || '').toLowerCase().includes(normalizedSearch)
    })
    .map((row) => ({
      ...row,
      status: row.is_active ? 'Active' : 'Inactive'
    }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-CA')
}

function resetForm() {
  editingId.value = null
  name.value = ''
  notes.value = ''
  isActive.value = true
  modalError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(row: PersonRecord) {
  editingId.value = row.id
  name.value = row.name
  notes.value = row.notes ?? ''
  isActive.value = row.is_active
  modalError.value = ''
  isModalOpen.value = true
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    rows.value = await listPeople()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to load people.'
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

  saving.value = true

  try {
    await upsertPerson(
      {
        name: name.value,
        notes: notes.value,
        is_active: isActive.value
      },
      editingId.value || undefined
    )

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Failed to save person.'
  } finally {
    saving.value = false
  }
}

async function deactivate(row: PersonItem) {
  pageError.value = ''

  try {
    await deactivatePerson(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to deactivate person.'
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
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">People</h2>
      <p class="mt-2 text-sm text-muted">Manage responsible people used across the finance records.</p>
    </div>

    <AppCard title="Filters">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <AppInput v-model="search" label="Search" placeholder="Search by name or note" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="statusFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        <AppButton label="New person" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="People list" :subtitle="loading ? 'Loading data...' : `${filteredRows.length} record(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="No people found.">
        <template #cell-notes="{ value }">
          <span class="text-sm text-muted">{{ value || '—' }}</span>
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
            <AppButton size="sm" variant="ghost" label="Edit" @click="openEditModal(row as PersonItem)" />
            <AppButton
              v-if="(row as PersonItem).is_active"
              size="sm"
              variant="danger"
              label="Disable"
              @click="deactivate(row as PersonItem)"
            />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Edit person' : 'New person'" description="Create or update a person record.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Name" placeholder="Person name" required />
        <AppInput v-model="notes" label="Notes" placeholder="Optional notes" />

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
