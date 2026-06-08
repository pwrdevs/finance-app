<script setup lang="ts">
defineProps<{
  appName: string
}>()

const emit = defineEmits<{
  menu: []
}>()
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50 border-b border-border/90 bg-background/92 shadow-soft backdrop-blur-md">
    <div class="mx-auto flex h-[5.5rem] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-7">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground lg:hidden"
          aria-label="Abrir menu de navegacao"
          @click="emit('menu')"
        >
          <span aria-hidden="true" class="text-lg">=</span>
        </button>

        <div class="flex items-center gap-3">
          <img src="/pwrdevs-logo.png" alt="PWRDEVS" class="h-16 w-16 rounded-xl object-contain" />
          <h1 class="text-lg font-semibold text-foreground sm:text-xl">{{ appName }}</h1>
        </div>
      </div>

      <div class="hidden items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted shadow-sm sm:flex">
        <span class="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        Sistema online
      </div>
    </div>
  </header>
</template>
