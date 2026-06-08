<script setup lang="ts">
interface SidebarLink {
  label: string
  to: string
}

const props = defineProps<{
  open: boolean
  links: SidebarLink[]
}>()

const emit = defineEmits<{
  close: []
}>()

function closeSidebar() {
  emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (process.client) {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }
  }
)

onBeforeUnmount(() => {
  if (process.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <div>
    <Transition name="fade">
      <button
        v-if="open"
        type="button"
        class="fixed inset-0 z-20 bg-foreground/40 backdrop-blur-[1px] lg:hidden"
        aria-label="Fechar menu de navegacao"
        @click="closeSidebar"
      />
    </Transition>

    <aside
      class="fixed inset-y-0 left-0 z-30 w-72 border-r border-border bg-surface shadow-panel transition-transform duration-300 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0"
      :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex h-full flex-col p-4">
        <div class="mb-5 flex justify-center">
          <img src="/pwrdevs-logo.png" alt="PWRDEVS" class="h-24 w-24 rounded-2xl object-contain shadow-soft" />
        </div>

        <nav class="space-y-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="block rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-primary-light/45"
            active-class="bg-primary-dark text-surface hover:bg-primary-dark"
            @click="closeSidebar"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
