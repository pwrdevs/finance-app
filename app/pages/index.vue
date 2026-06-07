<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import AppTable from '~/components/common/AppTable.vue'

definePageMeta({
  middleware: 'auth'
})

const config = useRuntimeConfig()
const currentEnvironment = computed(() => config.public.appEnv || 'development')

const search = ref('')
const isModalOpen = ref(false)

const summaryCards = [
  { title: 'Monthly Income', value: '$8,420.00', delta: '+8.2%' },
  { title: 'Monthly Expenses', value: '$4,935.00', delta: '-2.7%' },
  { title: 'Net Balance', value: '$3,485.00', delta: '+11.4%' }
]

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount', align: 'right' as const }
]

const rows = [
  { id: 1, date: '2026-06-01', description: 'Groceries - Family Market', type: 'Expense', amount: '$312.20' },
  { id: 2, date: '2026-06-01', description: 'Salary - Main Job', type: 'Income', amount: '$5,300.00' },
  { id: 3, date: '2026-06-02', description: 'Credit Card Payment', type: 'Expense', amount: '$1,120.00' }
]
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-panel md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">PWRDEVS / Finance OS</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Dashboard</h2>
        <p class="mt-2 text-sm text-muted">Current environment: <span class="font-semibold text-foreground">{{ currentEnvironment }}</span></p>
      </div>

      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <AppInput
          v-model="search"
          label="Quick Search"
          placeholder="Search transactions"
          hint="Demo input using design system component"
        />
        <div class="flex items-end gap-2">
          <AppButton label="Login" variant="secondary" @click="navigateTo('/login')" />
          <AppButton label="Register" @click="navigateTo('/register')" />
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <AppCard
        v-for="item in summaryCards"
        :key="item.title"
        :title="item.title"
      >
        <p class="text-2xl font-semibold text-foreground">{{ item.value }}</p>
        <p class="mt-2 text-xs font-semibold uppercase tracking-wider text-primary-dark">{{ item.delta }} vs last month</p>
      </AppCard>
    </div>

    <AppCard title="Latest transactions" subtitle="Example table component for initial design system foundation">
      <AppTable :columns="columns" :rows="rows">
        <template #cell-type="{ value }">
          <span
            class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="value === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
          >
            {{ value }}
          </span>
        </template>
      </AppTable>
    </AppCard>

    <AppModal
      v-model="isModalOpen"
      title="Create Transaction"
      description="Modal base component ready for future transaction form wiring."
    >
      <div class="space-y-4">
        <AppInput model-value="" label="Description" placeholder="e.g. Grocery shopping" />
        <AppInput model-value="" label="Amount" type="number" placeholder="0.00" />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <AppButton variant="ghost" label="Cancel" @click="isModalOpen = false" />
          <AppButton label="Save (disabled)" :disabled="true" />
        </div>
      </template>
    </AppModal>
  </section>
</template>
