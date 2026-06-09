<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'

const { isAdmin } = useAccess()

const sidebarLinks = computed(() => {
  const links = [
    { label: 'Painel', to: '/dashboard' },
    { label: 'Responsáveis', to: '/people' },
    { label: 'Contas', to: '/accounts' },
    { label: 'Categorias', to: '/categories' },
    { label: 'Cartões', to: '/cards' },
    { label: 'Lançamentos', to: '/transactions' }
  ]

  if (isAdmin.value) {
    links.push({ label: 'Administração', to: '/developer/users' })
  }

  return links
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <AppHeader app-name="PWRDEVS Finance" :links="sidebarLinks" />

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
