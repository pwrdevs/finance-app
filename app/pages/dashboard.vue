<script setup lang="ts">
import AppCard from '~/components/common/AppCard.vue'
import AppTable from '~/components/common/AppTable.vue'
import type { CardItem } from '~/composables/useMasterData'
import type { TransactionType } from '~/composables/useTransactions'

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

const columns = [
  { key: 'instance_date', label: 'Date' },
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'expected_value', label: 'Expected', align: 'right' as const },
  { key: 'real_value', label: 'Real', align: 'right' as const },
  { key: 'status', label: 'Status' },
  { key: 'checked_badge', label: 'Checked' }
]

const monthOptions = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
]

const yearOptions = computed(() => {
  const current = now.getFullYear()
  return [current - 2, current - 1, current, current + 1, current + 2].map(value => String(value))
})

const launchRows = computed(() => {
  return summary.value.recentLaunches.map((launch) => ({
    ...launch,
    checked_badge: launch.is_checked ? 'Checked' : 'Open'
  }))
})

const cardStatementRows = computed(() => {
  const cardMap = new Map(cards.value.map(card => [card.id, card.name]))

  return summary.value.cardStatements.map((statement) => ({
    ...statement,
    card_name: cardMap.get(statement.card_id) || 'Unknown card'
  }))
})

const projectionRows = computed(() => accumulatedProjection.value.months)

function formatCurrency(value: number) {
  return value.toFixed(2)
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
    pageError.value = error instanceof Error ? error.message : 'Failed to load financial summary.'
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
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Dashboard</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Monthly Financial Summary</h2>
      <p class="mt-2 text-sm text-muted">Summary based on transaction_instances. Main totals exclude canceled launches.</p>
    </div>

    <AppCard title="Filters" :subtitle="loading ? 'Loading monthly data...' : 'Choose month and year to refresh the summary.'">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Month</label>
          <select v-model="selectedMonth" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in monthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Year</label>
          <select v-model="selectedYear" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
            <option v-for="option in yearOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AppCard title="Income (active)">
        <p class="text-2xl font-semibold text-emerald-700">{{ formatCurrency(summary.totalIncome) }}</p>
      </AppCard>

      <AppCard title="Expense (active)">
        <p class="text-2xl font-semibold text-rose-700">{{ formatCurrency(summary.totalExpense) }}</p>
      </AppCard>

      <AppCard title="Net month (active)">
        <p class="text-2xl font-semibold" :class="summary.monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
          {{ formatCurrency(summary.monthlyBalance) }}
        </p>
      </AppCard>

      <AppCard title="Reconciled (active)">
        <p class="text-2xl font-semibold text-foreground">{{ formatCurrency(summary.checkedTotal) }}</p>
      </AppCard>

      <AppCard title="Pending (active)">
        <p class="text-2xl font-semibold text-foreground">{{ formatCurrency(summary.pendingTotal) }}</p>
      </AppCard>

      <AppCard title="Canceled Total">
        <p class="text-2xl font-semibold text-foreground">{{ formatCurrency(summary.canceledTotal) }}</p>
      </AppCard>

      <AppCard title="Active launches">
        <p class="text-2xl font-semibold text-foreground">{{ summary.numberOfTransactions }}</p>
      </AppCard>
    </div>

    <AppCard title="Card statement summary" subtitle="Expense-only totals by card. Canceled launches are excluded.">
      <div v-if="cardStatementRows.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="statement in cardStatementRows"
          :key="statement.card_id"
          class="rounded-2xl border border-border bg-primary-light/20 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-foreground">{{ statement.card_name }}</p>
              <p class="text-xs text-muted">{{ statement.transactionCount }} expense(s) in selected month</p>
            </div>
            <span class="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Card</span>
          </div>
          <p class="mt-4 text-2xl font-semibold text-foreground">{{ formatCurrency(statement.totalExpense) }}</p>
        </article>
      </div>

      <p v-else class="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
        No card expenses found for this month.
      </p>
    </AppCard>

    <AppCard title="Accumulated balance projection" subtitle="12-month projection using account opening balances and instance movements.">
      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-border bg-primary-light/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Initial balance</p>
          <p class="mt-3 text-2xl font-semibold" :class="accumulatedProjection.initialBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(accumulatedProjection.initialBalance) }}
          </p>
        </article>

        <article class="rounded-2xl border border-border bg-primary-light/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Month balance</p>
          <p class="mt-1 text-xs text-muted">{{ monthOptions.find(item => item.value === selectedMonth)?.label }} {{ selectedYear }}</p>
          <p class="mt-2 text-2xl font-semibold" :class="accumulatedProjection.firstMonthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(accumulatedProjection.firstMonthBalance) }}
          </p>
        </article>

        <article class="rounded-2xl border border-border bg-primary-light/20 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Accumulated balance</p>
          <p class="mt-1 text-xs text-muted">After selected month</p>
          <p class="mt-2 text-2xl font-semibold" :class="accumulatedProjection.firstMonthAccumulatedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
            {{ formatCurrency(accumulatedProjection.firstMonthAccumulatedBalance) }}
          </p>
        </article>
      </div>

      <div class="mt-4 space-y-3 md:hidden">
        <article
          v-for="row in projectionRows"
          :key="`mobile-${row.monthKey}`"
          class="rounded-2xl border border-border bg-surface p-3"
        >
          <p class="text-sm font-semibold text-foreground">{{ row.monthLabel }}</p>
          <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-xl bg-primary-light/20 px-2.5 py-2">
              <p class="uppercase tracking-[0.12em] text-muted">Month</p>
              <p class="mt-1 font-semibold" :class="row.monthBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatCurrency(row.monthBalance) }}</p>
            </div>
            <div class="rounded-xl bg-primary-light/20 px-2.5 py-2">
              <p class="uppercase tracking-[0.12em] text-muted">Accumulated</p>
              <p class="mt-1 font-semibold" :class="row.accumulatedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatCurrency(row.accumulatedBalance) }}</p>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-4 hidden overflow-x-auto md:block">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted">
              <th class="px-3 py-2">Month</th>
              <th class="px-3 py-2 text-right">Month balance</th>
              <th class="px-3 py-2 text-right">Accumulated</th>
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

    <AppCard title="Latest Launches" :subtitle="`${launchRows.length} record(s) in selected month`">
      <AppTable :columns="columns" :rows="launchRows" empty-message="No launches found for this period.">
        <template #cell-type="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="value === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
            {{ value }}
          </span>
        </template>

        <template #cell-expected_value="{ value }">
          {{ formatCurrency(Number(value)) }}
        </template>

        <template #cell-real_value="{ value }">
          {{ value == null ? '—' : formatCurrency(Number(value)) }}
        </template>

        <template #cell-status="{ value }">
          <span class="capitalize">{{ value }}</span>
        </template>

        <template #cell-checked_badge="{ value }">
          <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="value === 'Checked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            {{ value }}
          </span>
        </template>
      </AppTable>
    </AppCard>
  </section>
</template>
