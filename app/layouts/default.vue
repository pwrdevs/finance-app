<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'

const isSidebarOpen = ref(false)
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

  links.push({ label: 'Configurações', to: '/settings' })

  return links
})

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="h-screen overflow-hidden bg-background text-foreground">
    <AppHeader app-name="Financeiro Pessoal" @menu="toggleSidebar" />

    <div class="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-[1440px] overflow-hidden lg:items-start">
      <AppSidebar :open="isSidebarOpen" :links="sidebarLinks" @close="closeSidebar" />

      <main class="w-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
