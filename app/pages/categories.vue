<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import { CATEGORY_TYPES } from '~/composables/useMasterData'
import type { CategoryItem, CategoryType } from '~/composables/useMasterData'

definePageMeta({
  middleware: 'auth'
})

const { deactivateCategory, listCategories, upsertCategory } = useMasterData()

const loading = ref(false)
const saving = ref(false)
const pageError = ref('')
const modalError = ref('')

const search = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('active')
const typeFilter = ref<'all' | CategoryType>('all')

const rows = ref<CategoryItem[]>([])

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const name = ref('')
const type = ref<CategoryType>('expense')
const color = ref('')
const icon = ref('')
const isActive = ref(true)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'color', label: 'Color' },
  { key: 'icon', label: 'Icon' },
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
        || (row.icon || '').toLowerCase().includes(normalizedSearch)
        || (row.color || '').toLowerCase().includes(normalizedSearch)
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
  type.value = 'expense'
  color.value = ''
  icon.value = ''
  isActive.value = true
  modalError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(row: CategoryItem) {
  editingId.value = row.id
  name.value = row.name
  type.value = row.type
  color.value = row.color ?? ''
  icon.value = row.icon ?? ''
  isActive.value = row.is_active
  modalError.value = ''
  isModalOpen.value = true
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    rows.value = await listCategories()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to load categories.'
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
    await upsertCategory(
      {
        name: name.value,
        type: type.value,
        color: color.value,
        icon: icon.value,
        is_active: isActive.value
      },
      editingId.value || undefined
    )

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Failed to save category.'
  } finally {
    saving.value = false
  }
}

async function deactivate(row: CategoryItem) {
  pageError.value = ''

  try {
    await deactivateCategory(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to deactivate category.'
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
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Categories</h2>
      <p class="mt-2 text-sm text-muted">Manage categories for income and expense classifications.</p>
    </div>

    <AppCard title="Filters">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Search" placeholder="Search by name, icon or color" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="typeFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All</option>
            <option v-for="entry in CATEGORY_TYPES" :key="entry" :value="entry">{{ entry }}</option>
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

        <AppButton label="New category" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Categories list" :subtitle="loading ? 'Loading data...' : `${filteredRows.length} record(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="No categories found.">
        <template #cell-type="{ value }">
          <span class="capitalize">{{ value }}</span>
        </template>

        <template #cell-color="{ value }">
          <span class="text-sm text-muted">{{ value || '—' }}</span>
        </template>

        <template #cell-icon="{ value }">
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
            <AppButton size="sm" variant="ghost" label="Edit" @click="openEditModal(row as CategoryItem)" />
            <AppButton
              v-if="(row as CategoryItem).is_active"
              size="sm"
              variant="danger"
              label="Disable"
              @click="deactivate(row as CategoryItem)"
            />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Edit category' : 'New category'" description="Create or update a category.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Name" placeholder="Category name" required />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Type</label>
          <select v-model="type" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in CATEGORY_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <AppInput v-model="color" label="Color" placeholder="#8F9B7A" />
        <AppInput v-model="icon" label="Icon" placeholder="wallet" />

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
