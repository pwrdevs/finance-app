<script setup lang="ts">
const { initTheme } = useTheme()

if (process.client) {
  initTheme()
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
