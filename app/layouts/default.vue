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
    <AppHeader app-name="Financeiro Pessoal" class="h-24 shrink-0" @menu="toggleSidebar" />

    <div class="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-[1600px] overflow-hidden">
      <AppSidebar :open="isSidebarOpen" :links="sidebarLinks" @close="closeSidebar" />

      <main class="min-w-0 flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-6 lg:py-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
