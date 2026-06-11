<script setup lang="ts">
const route = useRoute()
const session = useSupabaseSession()
const openTransactionModalSignal = useState<number>('transactions-open-modal-signal', () => 0)

const hiddenRoutes = new Set(['/login', '/register'])

const shouldShowFab = computed(() => {
  if (!session.value?.user?.id) {
    return false
  }

  return !hiddenRoutes.has(route.path)
})

async function handleClick() {
  openTransactionModalSignal.value = Date.now()
}
</script>

<template>
  <button
    v-if="shouldShowFab"
    type="button"
    class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-dark text-surface shadow-panel transition hover:-translate-y-0.5 hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    aria-label="Novo lançamento"
    title="Novo lançamento"
    @click="handleClick"
  >
    <span class="text-2xl font-semibold leading-none sm:text-[1.9rem]">+</span>
  </button>
</template>
