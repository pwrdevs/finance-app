<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    padded?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    padded: true
  }
)
</script>

<template>
  <article class="rounded-2xl border border-border bg-surface shadow-panel">
    <header v-if="title || subtitle" class="border-b border-border px-5 py-4">
      <h3 v-if="title" class="text-base font-semibold text-foreground">{{ title }}</h3>
      <p v-if="subtitle" class="mt-1 text-sm text-muted">{{ subtitle }}</p>
    </header>

    <div :class="padded ? 'p-5' : ''">
      <slot />
    </div>
  </article>
</template>
