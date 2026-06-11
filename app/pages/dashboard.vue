<script setup lang="ts">
import AppCard from '~/components/common/AppCard.vue'
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
  selectedMonthBalance: 0,
  selectedMonthAccumulatedBalance: 0,
  minimumAccumulatedBalance: 0,
  requiredContribution: 0,
  firstNegativeMonthLabel: null as string | null,
  analysisStartLabel: '',
  analysisEndLabel: '',
  months: [] as Array<{
    month: number
    year: number
    monthKey: string
    monthLabel: string
    income: number
    expense: number
    monthBalance: number
    accumulatedBalance: number
  }>
})

const isMobileChart = ref(false)

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

const selectedPeriodLabel = computed(() => {
  const monthLabel = monthOptions.find(option => option.value === selectedMonth.value)?.label ?? selectedMonth.value
  return `${monthLabel} ${selectedYear.value}`
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
  const cardMap = new Map(cards.value.map(card => [card.id, card]))

  return summary.value.cardStatements.map((statement) => ({
    ...statement,
    card_name: cardMap.get(statement.card_id)?.name || 'Cartao nao encontrado',
    card_closing_day: cardMap.get(statement.card_id)?.closing_day ?? null,
    card_due_day: cardMap.get(statement.card_id)?.due_day ?? null
  }))
})

const projectionRows = computed(() => accumulatedProjection.value.months)

const projectedBalance = computed(() => accumulatedProjection.value.selectedMonthAccumulatedBalance)

const selectedMonthProjection = computed(() => accumulatedProjection.value.months.at(-1) ?? null)

const requiredContribution = computed(() => accumulatedProjection.value.requiredContribution)

const chartData = computed(() => {
  const months = accumulatedProjection.value.months

  if (!months.length) {
    return {
      path: '',
      fillPath: '',
      points: [] as Array<{ x: number; y: number; labelY: number; label: string; value: number; showValue: boolean }>,
      min: 0,
      max: 0
    }
  }

  const width = 960
  const height = 280
  const paddingX = 36
  const paddingY = 28
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingY * 2
  const values = months.map(item => item.accumulatedBalance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = months.length > 1 ? usableWidth / (months.length - 1) : 0
  let lastLabelY: number | null = null

  const points = months.map((item, index) => {
    const x = paddingX + (index * step)
    const normalized = (item.accumulatedBalance - min) / range
    const y = paddingY + (usableHeight - (normalized * usableHeight))
    const showValue = true
    let labelY = y - 10

    // Avoid stacked text collisions when adjacent points are too close.
    if (showValue && !isMobileChart.value && lastLabelY !== null && Math.abs(labelY - lastLabelY) < 14) {
      labelY = y + 16
    }

    if (labelY < 14) {
      labelY = y + 16
    }

    if (labelY > (height - 18)) {
      labelY = y - 10
    }

    if (showValue) {
      lastLabelY = labelY
    }

    return {
      x,
      y,
      labelY,
      label: item.monthLabel,
      value: item.accumulatedBalance,
      showValue
    }
  })

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
  const fillPath = `${path} L ${points[points.length - 1].x.toFixed(2)} ${height - paddingY} L ${points[0].x.toFixed(2)} ${height - paddingY} Z`

  return {
    path,
    fillPath,
    points,
    min,
    max
  }
})

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
  isMobileChart.value = window.innerWidth < 640
  window.addEventListener('resize', handleViewportResize)
  await fetchSummary()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportResize)
})

function handleViewportResize() {
  isMobileChart.value = window.innerWidth < 640
}

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
  <section class="space-y-6 overflow-x-hidden">
    <AppCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Dashboard V2</p>
          <div>
            <h2 class="text-2xl font-semibold text-foreground sm:text-3xl">Visão financeira estratégica</h2>
            <p class="mt-1 max-w-2xl text-sm text-muted">Acompanhe entradas, saídas, saldo acumulado e risco futuro sem ruído operacional.</p>
          </div>
        </div>

        <div class="w-full space-y-2 lg:w-auto">
          <label class="block text-sm font-medium text-foreground">Período</label>
          <div class="grid gap-2 sm:grid-cols-2 lg:w-[26rem]">
            <select
              v-model="selectedMonth"
              class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-emerald-400"
            >
              <option v-for="option in monthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select
              v-model="selectedYear"
              class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-emerald-400"
            >
              <option v-for="option in yearOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <p class="text-xs text-muted">{{ selectedPeriodLabel }}</p>
        </div>
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ pageError }}</p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AppCard>
        <div class="flex min-h-[12rem] flex-col justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Entradas</p>
            <p class="mt-3 text-2xl font-semibold text-emerald-700 sm:text-3xl">{{ formatCurrency(summary.totalIncome) }}</p>
          </div>
          <p class="text-sm text-muted">Total de receitas no período selecionado.</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="flex min-h-[12rem] flex-col justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Saídas</p>
            <p class="mt-3 text-2xl font-semibold text-rose-700 sm:text-3xl">{{ formatCurrency(summary.totalExpense) }}</p>
          </div>
          <p class="text-sm text-muted">Total de despesas no período selecionado.</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="flex min-h-[12rem] flex-col justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Saldo do período</p>
            <span class="mt-2 inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Principal</span>
          </div>
          <p class="text-2xl font-semibold sm:text-3xl" :class="summary.monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(summary.monthlyBalance) }}
          </p>
          <p class="text-sm text-muted">Entradas menos saídas no período selecionado.</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="flex min-h-[12rem] flex-col justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Saldo Projetado</p>
            <span class="mt-2 inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Projeto</span>
          </div>
          <p class="text-2xl font-semibold text-foreground sm:text-3xl">{{ formatCurrency(projectedBalance) }}</p>
          <p class="text-sm text-muted">Baseado em entradas e saídas previstas até este período.</p>
        </div>
      </AppCard>

      <AppCard>
        <div class="flex min-h-[12rem] flex-col justify-between gap-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Aporte necessário</p>
          <p class="text-2xl font-semibold sm:text-3xl" :class="requiredContribution > 0 ? 'text-amber-700' : 'text-emerald-700'">
            {{ formatCurrency(requiredContribution) }}
          </p>
          <p class="text-sm text-muted">{{ requiredContribution > 0 ? 'Para manter o saldo positivo no período acumulado.' : 'Nenhum aporte necessário no período.' }}</p>
        </div>
      </AppCard>
    </div>

    <AppCard title="Projeção Financeira" subtitle="Estimativa futura baseada em lançamentos únicos, parcelados e recorrentes.">
      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
          <div class="flex min-h-[10.5rem] flex-col justify-between gap-3">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saldo inicial</p>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Base</span>
            </div>
            <p class="text-2xl font-semibold" :class="accumulatedProjection.initialBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
              {{ formatCurrency(accumulatedProjection.initialBalance) }}
            </p>
            <p class="text-xs text-muted">Saldo antes da janela de análise.</p>
          </div>
        </article>

        <article class="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
          <div class="flex min-h-[10.5rem] flex-col justify-between gap-3">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saldo do período</p>
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Mês</span>
            </div>
            <div>
              <p class="text-xs text-muted">{{ selectedPeriodLabel }}</p>
              <p class="mt-2 text-2xl font-semibold" :class="selectedMonthProjection?.monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                {{ formatCurrency(selectedMonthProjection?.monthBalance ?? 0) }}
              </p>
            </div>
            <p class="text-xs text-muted">Entradas menos saídas do período selecionado.</p>
          </div>
        </article>

        <article class="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
          <div class="flex min-h-[10.5rem] flex-col justify-between gap-3">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saldo acumulado projetado</p>
              <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Acumulado</span>
            </div>
            <p class="text-2xl font-semibold" :class="projectedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
              {{ formatCurrency(projectedBalance) }}
            </p>
            <p class="text-xs text-muted">Acumulado de {{ accumulatedProjection.analysisStartLabel || selectedPeriodLabel }} até {{ accumulatedProjection.analysisEndLabel || selectedPeriodLabel }}.</p>
          </div>
        </article>
      </div>

      <div class="mt-6 rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-slate-100 shadow-panel">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">Gráfico de evolução financeira</p>
            <p class="text-xs text-slate-300">Saldo acumulado dos últimos 12 meses até o período selecionado.</p>
          </div>
          <p class="text-xs text-slate-300">Fechamento {{ selectedPeriodLabel }}: {{ formatCurrency(projectedBalance) }}</p>
        </div>

        <div v-if="chartData.points.length" class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3">
          <svg viewBox="0 0 960 280" class="h-64 w-full">
            <defs>
              <linearGradient id="balanceLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stop-color="#22c55e" />
                <stop offset="100%" stop-color="#84cc16" />
              </linearGradient>
              <linearGradient id="balanceAreaGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stop-color="#22c55e" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#22c55e" stop-opacity="0" />
              </linearGradient>
            </defs>

            <line
              v-for="tick in [0, 1, 2, 3]"
              :key="tick"
              :x1="36"
              :x2="924"
              :y1="28 + (224 / 3) * tick"
              :y2="28 + (224 / 3) * tick"
              stroke="rgba(255,255,255,0.08)"
              stroke-width="1"
            />

            <path :d="chartData.fillPath" fill="url(#balanceAreaGradient)" />
            <path :d="chartData.path" fill="none" stroke="url(#balanceLineGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />

            <g v-for="point in chartData.points" :key="point.label">
              <circle :cx="point.x" :cy="point.y" r="4.5" fill="#f8fafc" stroke="#16a34a" stroke-width="3" />
              <text
                v-if="point.showValue"
                :x="point.x"
                :y="point.labelY"
                text-anchor="middle"
                class="fill-slate-100 text-[10px] font-semibold"
              >
                {{ formatCurrency(point.value) }}
              </text>
              <text :x="point.x" y="262" text-anchor="middle" class="fill-slate-300 text-[11px] font-medium">{{ point.label }}</text>
            </g>
          </svg>
        </div>
      </div>

      <div class="mt-6 space-y-4">
        <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-sm font-semibold text-foreground">Resumo executivo da projeção</p>
            <p class="text-xs text-muted">Janela de exibição: últimos 12 meses até {{ selectedPeriodLabel }}. O acumulado considera todo o período desde o lançamento mais antigo.</p>
          </div>
          <p class="text-xs text-muted">Atualizado para {{ selectedPeriodLabel }}</p>
        </div>

        <div class="overflow-hidden rounded-2xl border border-border bg-surface/70">
          <div class="hidden md:block">
            <table class="min-w-full text-sm">
              <thead class="bg-primary-light/20 text-left text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th class="px-4 py-3">Mês</th>
                  <th class="px-4 py-3 text-right">Entradas</th>
                  <th class="px-4 py-3 text-right">Saídas</th>
                  <th class="px-4 py-3 text-right">Saldo do mês</th>
                  <th class="px-4 py-3 text-right">Saldo acumulado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in projectionRows" :key="row.monthKey" class="border-t border-border/80">
                  <td class="px-4 py-3 font-medium text-foreground">{{ row.monthLabel }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-emerald-700">{{ formatCurrency(row.income) }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-rose-700">{{ formatCurrency(row.expense) }}</td>
                  <td class="px-4 py-3 text-right font-semibold" :class="row.monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                    {{ formatCurrency(row.monthBalance) }}
                  </td>
                  <td class="px-4 py-3 text-right font-semibold" :class="row.accumulatedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                    {{ formatCurrency(row.accumulatedBalance) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid gap-3 p-3 md:hidden">
            <article
              v-for="row in projectionRows"
              :key="row.monthKey"
              class="rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-foreground">{{ row.monthLabel }}</p>
                  <p class="text-xs text-muted">Saldo acumulado</p>
                </div>
                <p class="text-base font-semibold" :class="row.accumulatedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  {{ formatCurrency(row.accumulatedBalance) }}
                </p>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-muted">Entradas</p>
                  <p class="font-semibold text-emerald-700">{{ formatCurrency(row.income) }}</p>
                </div>
                <div>
                  <p class="text-muted">Saídas</p>
                  <p class="font-semibold text-rose-700">{{ formatCurrency(row.expense) }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-muted">Saldo do mês</p>
                  <p class="font-semibold" :class="row.monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatCurrency(row.monthBalance) }}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard title="Resumo de cartões" subtitle="Fatura estimada pelos lançamentos de despesa ativos do período selecionado.">
      <div v-if="cardStatementRows.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="statement in cardStatementRows"
          :key="statement.card_id"
          class="rounded-2xl border border-border bg-surface px-4 py-3"
        >
          <p class="text-sm font-semibold text-foreground">{{ statement.card_name }}</p>
          <div class="mt-2 flex items-end justify-between gap-3">
            <p class="text-lg font-semibold text-foreground">{{ formatCurrency(statement.totalExpense) }}</p>
            <p class="text-xs text-muted">{{ statement.transactionCount }} despesa(s)</p>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <p class="rounded-lg bg-slate-100/70 px-2 py-1 text-slate-700">
              Fechamento: <span class="font-semibold">{{ statement.card_closing_day == null ? '--' : `${String(statement.card_closing_day).padStart(2, '0')}` }}</span>
            </p>
            <p class="rounded-lg bg-slate-100/70 px-2 py-1 text-slate-700">
              Vencimento: <span class="font-semibold">{{ statement.card_due_day == null ? '--' : `${String(statement.card_due_day).padStart(2, '0')}` }}</span>
            </p>
          </div>
        </article>
      </div>

      <p v-else class="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
        Nenhuma despesa em cartao encontrada para este mes.
      </p>
    </AppCard>
  </section>
</template>
