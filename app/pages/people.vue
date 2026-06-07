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
  { key: 'name', label: 'Nome' },
  { key: 'notes', label: 'Observações' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Criado em' },
  { key: 'actions', label: 'Ações', align: 'right' as const }
]

function extractErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (err && typeof err === 'object') {
    const statusMessage = 'statusMessage' in err ? String((err as { statusMessage?: unknown }).statusMessage ?? '') : ''
    if (statusMessage) {
      return statusMessage
    }

    const message = 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
    if (message) {
      return message
    }
  }

  return fallback
}

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
      status: row.is_active ? 'Ativo' : 'Inativo'
    }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
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

function openEditModal(row: PersonItem) {
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
    pageError.value = extractErrorMessage(err, 'Não foi possível carregar as pessoas.')
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  modalError.value = ''

  if (!name.value.trim()) {
    modalError.value = 'O nome é obrigatório.'
    return
  }

  saving.value = true

  try {
    await upsertPerson(
      {
        name: name.value.trim(),
        notes: notes.value,
        is_active: isActive.value
      },
      editingId.value || undefined
    )

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = extractErrorMessage(err, 'Não foi possível salvar a pessoa.')
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
    pageError.value = extractErrorMessage(err, 'Não foi possível desativar a pessoa.')
  }
}

onMounted(async () => {
  await fetchRows()
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Dados Mestres</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Pessoas</h2>
      <p class="mt-2 text-sm text-muted">Gerencie responsáveis usados nos lançamentos financeiros.</p>
    </div>

    <AppCard title="Filtros">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <AppInput v-model="search" label="Busca" placeholder="Buscar por nome ou observação" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Status</label>
          <select v-model="statusFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <AppButton label="Nova pessoa" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Lista de pessoas" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="Nenhuma pessoa encontrada.">
        <template #cell-notes="{ value }">
          <span class="text-sm text-muted">{{ value || '—' }}</span>
        </template>

        <template #cell-status="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            {{ value }}
          </span>
        </template>

        <template #cell-created_at="{ value }">
          {{ formatDate(String(value)) }}
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <AppButton size="sm" variant="ghost" label="Editar" @click="openEditModal(row as PersonItem)" />
            <AppButton
              v-if="(row as PersonItem).is_active"
              size="sm"
              variant="danger"
              label="Desativar"
              @click="deactivate(row as PersonItem)"
            />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Editar pessoa' : 'Nova pessoa'" description="Crie ou atualize uma pessoa.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Nome" placeholder="Nome da pessoa" required />
        <AppInput v-model="notes" label="Observações" placeholder="Observações opcionais" />

        <label class="flex items-center gap-2 text-sm text-foreground">
          <input v-model="isActive" type="checkbox" class="h-4 w-4 rounded border-border" />
          Ativo
        </label>

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
