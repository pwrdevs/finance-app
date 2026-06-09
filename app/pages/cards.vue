<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'
import type { CardItem, PersonItem } from '~/composables/useMasterData'
import { formatBRL } from '~/utils/currency'

definePageMeta({ middleware: 'auth' })

const { deactivateCard, deleteCard, listCards, listPeople, upsertCard } = useMasterData()

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
  { key: 'name', label: 'Nome' },
  { key: 'person_name', label: 'Responsavel' },
  { key: 'brand', label: 'Bandeira' },
  { key: 'billing_cycle', label: 'Ciclo de fatura' },
  { key: 'closing_day', label: 'Dia fechamento', align: 'center' as const },
  { key: 'due_day', label: 'Dia vencimento', align: 'center' as const },
  { key: 'credit_limit', label: 'Limite', align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Acoes', align: 'right' as const }
]

const peopleMap = computed(() => new Map(people.value.map(entry => [entry.id, entry.name])))
const activePeople = computed(() => people.value.filter(entry => entry.is_active))

const filteredRows = computed(() => {
  const normalizedSearch = search.value.trim().toLowerCase()

  return rows.value
    .filter((row) => {
      if (statusFilter.value === 'active') return row.is_active
      if (statusFilter.value === 'inactive') return !row.is_active
      return true
    })
    .filter((row) => personFilter.value === 'all' || row.person_id === personFilter.value)
    .filter((row) => {
      if (!normalizedSearch) return true
      const personName = peopleMap.value.get(row.person_id) || ''
      return row.name.toLowerCase().includes(normalizedSearch)
        || (row.brand || '').toLowerCase().includes(normalizedSearch)
        || personName.toLowerCase().includes(normalizedSearch)
    })
    .map((row) => ({
      ...row,
      person_name: peopleMap.value.get(row.person_id) || 'Responsavel nao encontrado',
      status: row.is_active ? 'Ativo' : 'Inativo',
      billing_cycle: row.closing_day && row.due_day
        ? `Fecha dia ${row.closing_day} - vence dia ${row.due_day}`
        : row.closing_day
          ? `Fecha dia ${row.closing_day}`
          : row.due_day
            ? `Vence dia ${row.due_day}`
            : 'Nao configurado',
      closing_day: row.closing_day ?? '-',
      due_day: row.due_day ?? '-',
      credit_limit: row.credit_limit == null ? '-' : formatBRL(Number(row.credit_limit))
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
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

async function fetchRows() {
  loading.value = true
  pageError.value = ''

  try {
    const [cardsData, peopleData] = await Promise.all([listCards(), listPeople()])
    rows.value = cardsData
    people.value = peopleData

    if (!personId.value && activePeople.value.length > 0) {
      personId.value = activePeople.value[0].id
    }
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Falha ao carregar cartoes.'
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

  if (!personId.value) {
    modalError.value = 'Responsavel obrigatorio.'
    return
  }

  const personExists = people.value.some(entry => entry.id === personId.value)
  if (!personExists) {
    modalError.value = 'Responsavel selecionado nao existe.'
    return
  }

  const parsedClosingDay = parseOptionalNumber(closingDay.value)
  const parsedDueDay = parseOptionalNumber(dueDay.value)
  const parsedCreditLimit = parseOptionalNumber(creditLimit.value)

  if (Number.isNaN(parsedClosingDay) || Number.isNaN(parsedDueDay) || Number.isNaN(parsedCreditLimit)) {
    modalError.value = 'Fechamento, vencimento e limite devem ser numeros validos quando informados.'
    return
  }

  if (parsedClosingDay != null && (parsedClosingDay < 1 || parsedClosingDay > 31)) {
    modalError.value = 'Dia de fechamento deve estar entre 1 e 31.'
    return
  }

  if (parsedDueDay != null && (parsedDueDay < 1 || parsedDueDay > 31)) {
    modalError.value = 'Dia de vencimento deve estar entre 1 e 31.'
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
    modalError.value = err instanceof Error ? err.message : 'Falha ao salvar cartao.'
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
    pageError.value = err instanceof Error ? err.message : 'Falha ao desativar cartao.'
  }
}

async function remove(row: CardItem) {
  const confirmed = window.confirm(`Deseja deletar o cartao "${row.name}"? Esta acao nao pode ser desfeita.`)

  if (!confirmed) {
    return
  }

  pageError.value = ''

  try {
    await deleteCard(row.id)
    await fetchRows()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Falha ao deletar cartao.'
  }
}

onMounted(fetchRows)
</script>

<template>
  <section class="space-y-6">
    <AppCard title="Filtros">
      <div class="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <AppInput v-model="search" label="Buscar" placeholder="Buscar por cartao, bandeira ou responsavel" />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Responsavel</label>
          <select v-model="personFilter" class="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">Todos</option>
            <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
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

        <AppButton label="Novo cartao" size="lg" @click="openCreateModal" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <AppCard title="Lista de cartoes" :subtitle="loading ? 'Carregando dados...' : `${filteredRows.length} registro(s)`">
      <div class="hidden md:block">
        <AppTable :columns="columns" :rows="filteredRows" empty-message="Nenhum cartao encontrado.">
          <template #cell-status="{ value }">
            <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ value }}</span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-2">
              <AppButton size="sm" variant="ghost" label="Editar" @click="openEditModal(row as CardItem)" />
              <AppButton v-if="(row as CardItem).is_active" size="sm" variant="danger" label="Desativar" @click="deactivate(row as CardItem)" />
              <AppButton size="sm" variant="danger" label="Deletar" @click="remove(row as CardItem)" />
            </div>
          </template>
        </AppTable>
      </div>
    </AppCard>

    <AppModal v-model="isModalOpen" :title="editingId ? 'Editar cartao' : 'Novo cartao'" description="Crie ou atualize um cartao.">
      <div class="space-y-4">
        <AppInput v-model="name" label="Nome" placeholder="Nome do cartao" required />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Responsavel</label>
          <select v-model="personId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="entry in activePeople" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </div>

        <AppInput v-model="brand" label="Bandeira" placeholder="Visa, Mastercard..." />

        <div class="grid gap-4 md:grid-cols-2">
          <AppInput v-model="closingDay" label="Dia de fechamento" type="number" placeholder="1-31" />
          <AppInput v-model="dueDay" label="Dia de vencimento" type="number" placeholder="1-31" />
        </div>

        <AppInput v-model="creditLimit" label="Limite de credito" type="number" placeholder="0.00" />

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
