<script setup lang="ts">
defineProps<{
  appName: string
}>()

const emit = defineEmits<{
  menu: []
}>()
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border/90 bg-background/90 backdrop-blur-md">
    <div class="mx-auto flex h-24 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
          <img src="/pwrdevs-logo.png" alt="PWRDEVS" class="h-24 w-24 rounded-xl object-contain shadow-soft" />
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
