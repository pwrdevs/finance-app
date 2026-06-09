<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import { CATEGORY_TYPES } from '~/composables/useMasterData'
import type { CategoryItem, CategoryType } from '~/composables/useMasterData'

definePageMeta({ middleware: 'auth' })

const { deactivateCategory, deleteCategory, listCategories, upsertCategory } = useMasterData()

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

const COLOR_OPTIONS = [
  '#8F9B7A',
  '#4E79A7',
  '#59A14F',
  '#F28E2B',
  '#E15759',
  '#B07AA1',
  '#76B7B2',
  '#EDC948',
  '#1F2937',
  '#6B7280'
] as const

const ICON_OPTIONS = [
  '💰',
  '🛒',
  '🏠',
  '🚗',
  '🍽️',
  '💳',
  '🎓',
  '🏥',
  '🎉',
  '📦',
  '📈',
  '🧾'
] as const

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'type', label: 'Tipo' },
  { key: 'color', label: 'Cor' },
  { key: 'icon', label: 'Ícone' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Criado em' },
  { key: 'actions', label: 'Ações', align: 'right' as const }
]

const categoryTypeLabels: Record<CategoryType, string> = {
  income: 'Receita',
  expense: 'Despesa'
}

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
    .map((row) => ({
      ...row,
      status: row.is_active ? 'Ativo' : 'Inativo',
      type_label: categoryTypeLabels[row.type]
    }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function resetForm() {
  editingId.value = null
  name.value = ''
  type.value = 'expense'
  color.value = COLOR_OPTIONS[0]
  icon.value = ICON_OPTIONS[0]
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
  color.value = row.color && COLOR_OPTIONS.includes(row.color as (typeof COLOR_OPTIONS)[number]) ? row.color : COLOR_OPTIONS[0]
  icon.value = row.icon && ICON_OPTIONS.includes(row.icon as (typeof ICON_OPTIONS)[number]) ? row.icon : ICON_OPTIONS[0]
  isActive.value = row.is_active
  modalError.value = ''
  isModalOpen.value = true
}

function selectColor(selected: string) {
  color.value = selected
}

function selectIcon(selected: string) {
  icon.value = selected
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''
  try {
    rows.value = await listCategories()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível carregar as categorias.'
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  modalError.value = ''
  if (!name.value.trim()) {
    modalError.value = 'Nome obrigatório.'
    return
  }

  saving.value = true
  try {
    await upsertCategory({ name: name.value, type: type.value, color: color.value, icon: icon.value, is_active: isActive.value }, editingId.value || undefined)
    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Não foi possível salvar a categoria.'
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
    pageError.value = err instanceof Error ? err.message : 'Não foi possível desativar a categoria.'
  }
}

async function remove(row: CategoryItem) {
  const confirmed = window.confirm(`Deseja deletar a categoria "${row.name}"? Esta ação não pode ser desfeita.`)

  if (!confirmed) {
    return
  }

  pageError.value = ''

  try {
    await deleteCategory(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível deletar a categoria.'
  }
}

onMounted(fetchRows)
</script>

<template>
  <section class="space-y-6">
    <AppCard title="Filtros">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Buscar" placeholder="Buscar por nome, ícone ou cor" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Tipo</label>
          <select v-model="typeFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">Todos</option>
            <option v-for="entry in CATEGORY_TYPES" :key="entry" :value="entry">{{ categoryTypeLabels[entry] }}</option>
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
        <template #cell-type="{ row }"><span>{{ (row as any).type_label }}</span></template>
        <template #cell-color="{ value }">
          <div class="flex items-center gap-2">
            <span class="inline-block h-4 w-4 rounded-full border border-border" :style="{ backgroundColor: String(value || '#e5e7eb') }" />
            <span class="text-sm text-muted">{{ value || '-' }}</span>
          </div>
        </template>
        <template #cell-icon="{ value }"><span class="text-lg">{{ value || '-' }}</span></template>
        <template #cell-status="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ value }}</span>
        </template>
        <template #cell-created_at="{ value }">{{ formatDate(String(value)) }}</template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <AppButton size="sm" variant="ghost" label="Editar" @click="openEditModal(row as CategoryItem)" />
            <AppButton v-if="(row as CategoryItem).is_active" size="sm" variant="danger" label="Desativar" @click="deactivate(row as CategoryItem)" />
            <AppButton size="sm" variant="danger" label="Deletar" @click="remove(row as CategoryItem)" />
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
            <option v-for="entry in CATEGORY_TYPES" :key="entry" :value="entry">{{ categoryTypeLabels[entry] }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Cor padrão</label>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="option in COLOR_OPTIONS"
              :key="option"
              type="button"
              class="h-10 rounded-xl border-2 transition"
              :class="color === option ? 'border-foreground' : 'border-border'"
              :style="{ backgroundColor: option }"
              :aria-label="`Selecionar cor ${option}`"
              @click="selectColor(option)"
            />
          </div>
          <p class="text-xs text-muted">Cor selecionada: {{ color }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Ícone (emoji)</label>
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="option in ICON_OPTIONS"
              :key="option"
              type="button"
              class="h-10 rounded-xl border text-xl transition"
              :class="icon === option ? 'border-primary-dark bg-primary-light/40' : 'border-border bg-surface'"
              :aria-label="`Selecionar icone ${option}`"
              @click="selectIcon(option)"
            >
              {{ option }}
            </button>
          </div>
          <p class="text-xs text-muted">Icone selecionado: {{ icon }}</p>
        </div>

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
