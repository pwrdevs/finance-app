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
  <div class="relative min-h-screen h-screen overflow-hidden bg-background text-foreground">
    <AppHeader app-name="Financeiro Pessoal" @menu="toggleSidebar" />

    <div class="mx-auto flex h-full w-full max-w-[1600px] overflow-hidden pt-[5.5rem] lg:items-start">
      <AppSidebar :open="isSidebarOpen" :links="sidebarLinks" @close="closeSidebar" />

      <main class="min-h-0 min-w-0 w-full flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-7 lg:py-7">
        <div class="mx-auto w-full max-w-[1400px]">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
