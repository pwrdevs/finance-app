<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import { ACCOUNT_TYPES } from '~/composables/useMasterData'
import type { AccountItem, AccountType } from '~/composables/useMasterData'
import { formatBRL } from '~/utils/currency'

definePageMeta({ middleware: 'auth' })

const { deactivateAccount, deleteAccount, listAccounts, upsertAccount } = useMasterData()

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
  { key: 'name', label: 'Nome' },
  { key: 'type', label: 'Tipo' },
  { key: 'initial_balance', label: 'Saldo inicial', align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Criado em' },
  { key: 'actions', label: 'Ações', align: 'right' as const }
]

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira / Dinheiro',
  investment: 'Investimento',
  other: 'Outro'
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
    .filter((row) => !normalizedSearch || row.name.toLowerCase().includes(normalizedSearch))
    .map((row) => ({
      ...row,
      status: row.is_active ? 'Ativo' : 'Inativo',
      type_label: accountTypeLabels[row.type],
      initial_balance: formatBRL(Number(row.initial_balance))
    }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
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
    pageError.value = err instanceof Error ? err.message : 'Não foi possível carregar as contas.'
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

  const parsedBalance = Number(initialBalance.value)
  if (Number.isNaN(parsedBalance)) {
    modalError.value = 'Saldo inicial deve ser um número válido.'
    return
  }

  saving.value = true
  try {
    await upsertAccount(
      { name: name.value, type: type.value, initial_balance: parsedBalance, is_active: isActive.value },
      editingId.value || undefined
    )

    isModalOpen.value = false
    await fetchRows()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Não foi possível salvar a conta.'
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
    pageError.value = err instanceof Error ? err.message : 'Não foi possível desativar a conta.'
  }
}

async function remove(row: AccountItem) {
  const confirmed = window.confirm(`Deseja deletar a conta "${row.name}"? Esta ação não pode ser desfeita.`)

  if (!confirmed) {
    return
  }

  pageError.value = ''

  try {
    await deleteAccount(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível deletar a conta.'
  }
}

onMounted(fetchRows)
</script>

<template>
  <section class="space-y-6">
    <AppCard title="Filtros">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Buscar" placeholder="Buscar por nome da conta" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Tipo</label>
          <select v-model="typeFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">Todos</option>
            <option v-for="entry in ACCOUNT_TYPES" :key="entry" :value="entry">{{ entry }}</option>
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

        <AppButton label="Nova conta" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Lista de contas" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <AppTable :columns="columns" :rows="filteredRows" empty-message="Nenhuma conta encontrada.">
        <template #cell-type="{ row }"><span>{{ (row as any).type_label }}</span></template>
        <template #cell-status="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ value }}</span>
        </template>
        <template #cell-created_at="{ value }">{{ formatDate(String(value)) }}</template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <AppButton size="sm" variant="ghost" label="Editar" @click="openEditModal(row as AccountItem)" />
            <AppButton v-if="(row as AccountItem).is_active" size="sm" variant="danger" label="Desativar" @click="deactivate(row as AccountItem)" />
            <AppButton size="sm" variant="danger" label="Deletar" @click="remove(row as AccountItem)" />
          </div>
        </template>
      </AppTable>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Editar conta' : 'Nova conta'" description="Crie ou atualize uma conta.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Nome" placeholder="Nome da conta" required />
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Tipo</label>
          <select v-model="type" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in ACCOUNT_TYPES" :key="entry" :value="entry">{{ accountTypeLabels[entry] }}</option>
          </select>
        </div>
        <AppInput v-model="initialBalance" label="Saldo inicial" type="number" placeholder="0.00" required />
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
