<script setup lang="ts">
const config = useRuntimeConfig()
const currentEnvironment = computed(() => config.public.appEnv || 'development')
</script>

<template>
  <section class="space-y-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Finance App</p>
    <h1 class="text-3xl font-bold">Finance App</h1>
    <p class="text-sm text-gray-600">
      Current environment:
      <span class="font-semibold text-gray-900">{{ currentEnvironment }}</span>
    </p>
  </section>
</template>
