<script setup lang="ts">
import AppCard from '~/components/common/AppCard.vue'
import AppTable from '~/components/common/AppTable.vue'
import type { TransactionType } from '~/composables/useTransactions'

definePageMeta({
  middleware: 'auth'
})

const { getMonthlySummary } = useFinancialSummary()
const session = useSupabaseSession()

const loading = ref(false)
const pageError = ref('')

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
    const data = await getMonthlySummary({
      month: Number(selectedMonth.value),
      year: Number(selectedYear.value)
    })

    summary.value = data
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
      <p class="mt-2 text-sm text-muted">Summary based on transaction_instances as the primary financial source.</p>
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
      <AppCard title="Total Income">
        <p class="text-2xl font-semibold text-emerald-700">{{ formatCurrency(summary.totalIncome) }}</p>
      </AppCard>

      <AppCard title="Total Expense">
        <p class="text-2xl font-semibold text-rose-700">{{ formatCurrency(summary.totalExpense) }}</p>
      </AppCard>

      <AppCard title="Monthly Balance">
        <p class="text-2xl font-semibold" :class="summary.monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
          {{ formatCurrency(summary.monthlyBalance) }}
        </p>
      </AppCard>

      <AppCard title="Checked Total">
        <p class="text-2xl font-semibold text-foreground">{{ formatCurrency(summary.checkedTotal) }}</p>
      </AppCard>

      <AppCard title="Pending Total">
        <p class="text-2xl font-semibold text-foreground">{{ formatCurrency(summary.pendingTotal) }}</p>
      </AppCard>

      <AppCard title="Canceled Total">
        <p class="text-2xl font-semibold text-foreground">{{ formatCurrency(summary.canceledTotal) }}</p>
      </AppCard>

      <AppCard title="Number of Transactions">
        <p class="text-2xl font-semibold text-foreground">{{ summary.numberOfTransactions }}</p>
      </AppCard>
    </div>

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
