<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'

const isSidebarOpen = ref(false)

const sidebarLinks = [
  { label: 'Painel', to: '/dashboard' },
  { label: 'Responsáveis', to: '/people' },
  { label: 'Contas', to: '/accounts' },
  { label: 'Categorias', to: '/categories' },
  { label: 'Cartões', to: '/cards' },
  { label: 'Lançamentos', to: '/transactions' },
  { label: 'Configurações', to: '/settings' }
]

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <AppHeader app-name="Financeiro Pessoal" @menu="toggleSidebar" />

    <div class="mx-auto flex w-full max-w-[1440px] lg:items-start">
      <AppSidebar :open="isSidebarOpen" :links="sidebarLinks" @close="closeSidebar" />

      <main class="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
