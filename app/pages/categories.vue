<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import { CATEGORY_TYPES } from '~/composables/useMasterData'
import type { CategoryItem, CategoryType } from '~/composables/useMasterData'

definePageMeta({ middleware: 'auth' })

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
  { key: 'name', label: 'Nome' },
  { key: 'type', label: 'Tipo' },
  { key: 'color', label: 'Cor' },
  { key: 'icon', label: 'Icone' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Criado em' },
  { key: 'actions', label: 'Acoes', align: 'right' as const }
]

const filteredRows = computed(() => {
  const normalizedSearch = search.value.trim().toLowerCase()

  return rows.value
    .filter((row) => {
      if (statusFilter.value === 'active') return row.is_active
      if (statusFilter.value === 'inactive') return !row.is_active
      return true
    })
    .filter((row) => typeFilter.value === 'all' || row.type === typeFilter.value)
    .filter((row) => !normalizedSearch || row.name.toLowerCase().includes(normalizedSearch) || (row.icon || '').toLowerCase().includes(normalizedSearch) || (row.color || '').toLowerCase().includes(normalizedSearch))
    .map((row) => ({ ...row, status: row.is_active ? 'Ativo' : 'Inativo' }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
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
    pageError.value = err instanceof Error ? err.message : 'Falha ao carregar categorias.'
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  modalError.value = ''
  if (!name.value.trim()) {
    modalError.value = 'Nome obrigatorio.'
    return
  }

  saving.value = true
  try {
    await upsertCategory({ name: name.value, type: type.value, color: color.value, icon: icon.value, is_active: isActive.value }, editingId.value || undefined)
    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Falha ao salvar categoria.'
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
    pageError.value = err instanceof Error ? err.message : 'Falha ao desativar categoria.'
  }
}

onMounted(fetchRows)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Dados mestres</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Categorias</h2>
      <p class="mt-2 text-sm text-muted">Gerencie categorias para classificacao de receitas e despesas.</p>
    </div>

    <AppCard title="Filtros">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Buscar" placeholder="Buscar por nome, icone ou cor" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Tipo</label>
          <select v-model="typeFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">Todos</option>
            <option v-for="entry in CATEGORY_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="statusFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <AppButton label="Nova categoria" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Lista de categorias" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="Nenhuma categoria encontrada.">
        <template #cell-type="{ value }"><span class="capitalize">{{ value }}</span></template>
        <template #cell-color="{ value }"><span class="text-sm text-muted">{{ value || '-' }}</span></template>
        <template #cell-icon="{ value }"><span class="text-sm text-muted">{{ value || '-' }}</span></template>
        <template #cell-status="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ value }}</span>
        </template>
        <template #cell-created_at="{ value }">{{ formatDate(String(value)) }}</template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <AppButton size="sm" variant="ghost" label="Editar" @click="openEditModal(row as CategoryItem)" />
            <AppButton v-if="(row as CategoryItem).is_active" size="sm" variant="danger" label="Desativar" @click="deactivate(row as CategoryItem)" />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Editar categoria' : 'Nova categoria'" description="Crie ou atualize uma categoria.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Nome" placeholder="Nome da categoria" required />
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Tipo</label>
          <select v-model="type" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in CATEGORY_TYPES" :key="entry" :value="entry">{{ entry }}</option>
          </select>
        </div>
        <AppInput v-model="color" label="Cor" placeholder="#8F9B7A" />
        <AppInput v-model="icon" label="Icone" placeholder="wallet" />
        <label class="flex items-center gap-2 text-sm text-foreground"><input v-model="isActive" type="checkbox" class="h-4 w-4 rounded border-border" />Ativo</label>
        <p v-if="modalError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ modalError }}</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <AppButton label="Cancelar" variant="ghost" @click="isModalOpen = false" />
          <AppButton :label="saving ? 'Salvando...' : 'Salvar'" :disabled="saving" @click="submitForm" />
        </div>
      </template>
    </AppModal>
  </section>
</template>
