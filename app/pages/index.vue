<script setup lang="ts">
const session = useSupabaseSession()

if (session.value) {
  await navigateTo('/dashboard', { replace: true })
} else {
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <div class="min-h-screen" />
</template>
