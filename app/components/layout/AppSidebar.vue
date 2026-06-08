<script setup lang="ts">
interface SidebarLink {
  label: string
  to: string
}

const user = useSupabaseUser()
const { loadProfile: refreshProfile, profileAvatarUrl, profileFullName } = useProfile()

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

const profileName = computed(() => {
  const dbName = profileFullName.value.trim()

  if (dbName) {
    return dbName
  }

  const metadata = user.value?.user_metadata as { full_name?: string, name?: string } | undefined
  const metadataName = String(metadata?.full_name || metadata?.name || '').trim()

  if (metadataName) {
    return metadataName
  }

  const email = String(user.value?.email || '').trim()

  if (email) {
    return email.split('@')[0]
  }

  return 'Usuario'
})

const profileAvatar = computed(() => {
  const dbAvatar = profileAvatarUrl.value.trim()

  if (dbAvatar) {
    return dbAvatar
  }

  const metadata = user.value?.user_metadata as { avatar_url?: string } | undefined
  return String(metadata?.avatar_url || '').trim()
})

const profileInitials = computed(() => {
  const tokens = profileName.value
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (!tokens.length) {
    return 'U'
  }

  return tokens.map(token => token[0]?.toUpperCase() || '').join('')
})

async function refreshSidebarProfile() {
  await refreshProfile(user.value?.id)
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

onMounted(async () => {
  await refreshSidebarProfile()
})

watch(
  () => user.value?.id,
  async () => {
    await refreshSidebarProfile()
  }
)
</script>

<template>
  <div>
    <Transition name="fade">
      <button
        v-if="open"
        type="button"
        class="fixed inset-x-0 bottom-0 top-24 z-20 bg-foreground/40 backdrop-blur-[1px] lg:hidden"
        aria-label="Fechar menu de navegacao"
        @click="closeSidebar"
      />
    </Transition>

    <aside
      class="fixed bottom-0 left-0 top-24 z-30 w-72 border-r border-border bg-surface shadow-panel transition-transform duration-300 lg:sticky lg:top-24 lg:z-10 lg:h-[calc(100dvh-6rem)] lg:translate-x-0"
      :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex h-full flex-col overflow-y-auto p-4">
        <div class="mb-5 rounded-2xl border border-border bg-background p-3">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-light/35 text-sm font-semibold text-foreground">
              <img v-if="profileAvatar" :src="profileAvatar" alt="Foto do usuario" class="h-full w-full object-cover" />
              <span v-else>{{ profileInitials }}</span>
            </div>

            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-foreground">{{ profileName }}</p>
              <p class="text-xs text-muted">Usuario logado</p>
            </div>
          </div>
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
