<script setup lang="ts">
const isSidebarOpen = ref(false)

const sidebarLinks = [
  { label: 'Dashboard', to: '/' },
  { label: 'Transactions', to: '#' },
  { label: 'Cards', to: '#' },
  { label: 'People', to: '#' },
  { label: 'Categories', to: '#' },
  { label: 'Reports', to: '#' }
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
    <AppHeader app-name="Finance App" @menu="toggleSidebar" />

    <div class="mx-auto flex w-full max-w-[1440px] lg:items-start">
      <AppSidebar :open="isSidebarOpen" :links="sidebarLinks" @close="closeSidebar" />

      <main class="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
