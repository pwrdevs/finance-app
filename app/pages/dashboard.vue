<script setup lang="ts">
import AppCard from '~/components/common/AppCard.vue'
import AppTable from '~/components/common/AppTable.vue'
import type { CardItem } from '~/composables/useMasterData'
import type { TransactionType } from '~/composables/useTransactions'
import { formatBRL } from '~/utils/currency'

definePageMeta({
  middleware: 'auth'
})

const { getAccumulatedBalanceProjection, getMonthlySummary } = useFinancialSummary()
const { listCards } = useMasterData()
const session = useSupabaseSession()

const loading = ref(false)
const pageError = ref('')
const cards = ref<CardItem[]>([])

const now = new Date()
const selectedMonth = ref(String(now.getMonth() + 1).padStart(2, '0'))
const selectedYear = ref(String(now.getFullYear()))

const summary = ref({
  totalIncome: 0,
  totalExpense: 0,
  monthlyBalance: 0,
  checkedTotal: 0,
  pendingTotal: 0,
  canceledTotal: 0,
  numberOfTransactions: 0,
  cardStatements: [] as Array<{
    card_id: string
    totalExpense: number
    transactionCount: number
  }>,
  recentLaunches: [] as Array<{
    id: string
    title: string
    type: TransactionType
    description: string | null
    instance_date: string
    expected_value: number
    real_value: number | null
    status: string
    is_checked: boolean
  }>
})

const accumulatedProjection = ref({
  initialBalance: 0,
  firstMonthBalance: 0,
  firstMonthAccumulatedBalance: 0,
  months: [] as Array<{
    month: number
    year: number
    monthKey: string
    monthLabel: string
    monthBalance: number
    accumulatedBalance: number
  }>
})

const statusLabelMap = {
  pending: 'Pendente',
  paid: 'Pago',
  skipped: 'Ignorado',
  canceled: 'Cancelado'
} as const

const typeLabelMap = {
  income: 'Receita',
  expense: 'Despesa'
} as const

const columns = [
  { key: 'instance_date', label: 'Data' },
  { key: 'title', label: 'Titulo' },
  { key: 'type', label: 'Tipo' },
  { key: 'expected_value', label: 'Previsto', align: 'right' as const },
  { key: 'real_value', label: 'Real', align: 'right' as const },
  { key: 'effective_value', label: 'Efetivo', align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'checked_badge', label: 'Conferencia' }
]

const monthOptions = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Marco' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
]

const yearOptions = computed(() => {
  const current = now.getFullYear()
  return [current - 2, current - 1, current, current + 1, current + 2].map(value => String(value))
})

const launchRows = computed(() => {
  return summary.value.recentLaunches.map((launch) => ({
    ...launch,
    type_label: typeLabelMap[launch.type],
    status_label: statusLabelMap[launch.status as keyof typeof statusLabelMap] ?? launch.status,
    effective_value: launch.real_value == null ? launch.expected_value : launch.real_value,
    checked_badge: launch.is_checked ? 'Conferido' : 'Aberto'
  }))
})

const cardStatementRows = computed(() => {
  const cardMap = new Map(cards.value.map(card => [card.id, card.name]))

  return summary.value.cardStatements.map((statement) => ({
    ...statement,
    card_name: cardMap.get(statement.card_id) || 'Cartao nao encontrado'
  }))
})

const projectionRows = computed(() => accumulatedProjection.value.months)

function formatCurrency(value: number) {
  return formatBRL(value)
}

function formatDateBr(value: string) {
  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

async function fetchSummary() {
  if (!session.value?.user?.id) {
    return
  }

  loading.value = true
  pageError.value = ''

  try {
    const period = {
      month: Number(selectedMonth.value),
      year: Number(selectedYear.value)
    }

    const [data, cardList, projection] = await Promise.all([
      getMonthlySummary({
        month: period.month,
        year: period.year
      }),
      listCards(),
      getAccumulatedBalanceProjection(period)
    ])

    summary.value = data
    cards.value = cardList
    accumulatedProjection.value = projection
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Nao foi possivel carregar o resumo financeiro.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchSummary()
})

watch([selectedMonth, selectedYear], async () => {
  await fetchSummary()
})

watch(
  () => session.value?.user?.id,
  async (userId) => {
    if (userId) {
      await fetchSummary()
    }
  }
)
</script>

<template>
  <section class="space-y-6">
    <AppCard title="Filtros" :subtitle="loading ? 'Carregando dados mensais...' : 'Selecione mes e ano para atualizar o resumo.'">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Mes</label>
          <select v-model="selectedMonth" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in monthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Ano</label>
          <select v-model="selectedYear" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in yearOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AppCard title="Receitas (ativas)">
        <p class="text-xl font-semibold text-emerald-700 sm:text-2xl">{{ formatCurrency(summary.totalIncome) }}</p>
      </AppCard>

      <AppCard title="Despesas (ativas)">
        <p class="text-xl font-semibold text-rose-700 sm:text-2xl">{{ formatCurrency(summary.totalExpense) }}</p>
      </AppCard>

      <AppCard title="Saldo do mes (ativo)">
        <p class="text-xl font-semibold sm:text-2xl" :class="summary.monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
          {{ formatCurrency(summary.monthlyBalance) }}
        </p>
      </AppCard>

      <AppCard title="Conferidos (ativos)">
        <p class="text-xl font-semibold text-foreground sm:text-2xl">{{ formatCurrency(summary.checkedTotal) }}</p>
      </AppCard>

      <AppCard title="Pendentes (ativos)">
        <p class="text-xl font-semibold text-foreground sm:text-2xl">{{ formatCurrency(summary.pendingTotal) }}</p>
      </AppCard>

      <AppCard title="Total cancelado">
        <p class="text-xl font-semibold text-foreground sm:text-2xl">{{ formatCurrency(summary.canceledTotal) }}</p>
      </AppCard>

      <AppCard title="Lancamentos ativos">
        <p class="text-xl font-semibold text-foreground sm:text-2xl">{{ summary.numberOfTransactions }}</p>
      </AppCard>
    </div>

    <AppCard title="Resumo de fatura por cartao" subtitle="Somente despesas ativas com valor efetivo.">
      <div v-if="cardStatementRows.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="statement in cardStatementRows"
          :key="statement.card_id"
          class="rounded-2xl border border-border bg-primary-light/20 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-foreground">{{ statement.card_name }}</p>
              <p class="text-xs text-muted">{{ statement.transactionCount }} despesa(s) no mes selecionado</p>
            </div>
            <span class="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Cartao</span>
          </div>
          <p class="mt-4 text-2xl font-semibold text-foreground">{{ formatCurrency(statement.totalExpense) }}</p>
        </article>
      </div>

      <p v-else class="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
        Nenhuma despesa em cartao encontrada para este mes.
      </p>
    </AppCard>

    <AppCard title="Projecao de saldo acumulado" subtitle="12 meses com base em saldos iniciais e movimentos efetivos das instancias.">
      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-border bg-primary-light/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saldo inicial</p>
          <p class="mt-3 text-2xl font-semibold" :class="accumulatedProjection.initialBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(accumulatedProjection.initialBalance) }}
          </p>
        </article>

        <article class="rounded-2xl border border-border bg-primary-light/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saldo do mes</p>
          <p class="mt-1 text-xs text-muted">{{ monthOptions.find(item => item.value === selectedMonth)?.label }} {{ selectedYear }}</p>
          <p class="mt-2 text-2xl font-semibold" :class="accumulatedProjection.firstMonthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(accumulatedProjection.firstMonthBalance) }}
          </p>
        </article>

        <article class="rounded-2xl border border-border bg-primary-light/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saldo acumulado</p>
          <p class="mt-1 text-xs text-muted">Apos o mes selecionado</p>
          <p class="mt-2 text-2xl font-semibold" :class="accumulatedProjection.firstMonthAccumulatedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(accumulatedProjection.firstMonthAccumulatedBalance) }}
          </p>
        </article>
      </div>

      <div class="mt-4 hidden overflow-x-auto md:block">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted">
              <th class="px-3 py-2">Mes</th>
              <th class="px-3 py-2 text-right">Saldo do mes</th>
              <th class="px-3 py-2 text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in projectionRows" :key="row.monthKey" class="border-b border-border/80">
              <td class="px-3 py-2 font-medium text-foreground">{{ row.monthLabel }}</td>
              <td class="px-3 py-2 text-right font-semibold" :class="row.monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                {{ formatCurrency(row.monthBalance) }}
              </td>
              <td class="px-3 py-2 text-right font-semibold" :class="row.accumulatedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                {{ formatCurrency(row.accumulatedBalance) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <AppCard title="Ultimos lancamentos" :subtitle="`${launchRows.length} registro(s) no mes selecionado`">
      <AppTable :columns="columns" :rows="launchRows" empty-message="Nenhum lancamento encontrado para este periodo.">
        <template #cell-instance_date="{ value }">
          {{ formatDateBr(String(value)) }}
        </template>

        <template #cell-type="{ row }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="(row as any).type_label === 'Receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
            {{ (row as any).type_label }}
          </span>
        </template>

        <template #cell-expected_value="{ value }">
          {{ formatCurrency(Number(value)) }}
        </template>

        <template #cell-real_value="{ value }">
          {{ value == null ? '-' : formatCurrency(Number(value)) }}
        </template>

        <template #cell-effective_value="{ value }">
          {{ formatCurrency(Number(value)) }}
        </template>

        <template #cell-status="{ row }">
          {{ (row as any).status_label }}
        </template>

        <template #cell-checked_badge="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Conferido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            {{ value }}
          </span>
        </template>
      </AppTable>
    </AppCard>
  </section>
</template>
