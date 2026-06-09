<script setup lang="ts">
interface HeaderLink {
  label: string
  to: string
}

const user = useSupabaseUser()
const route = useRoute()
const { loadProfile, profileAvatarUrl, profileFullName } = useProfile()

const props = withDefaults(defineProps<{
  appName: string
  links?: HeaderLink[]
}>(), {
  links: () => []
})

const profileName = computed(() => {
  const dbName = profileFullName.value.trim()

  if (dbName) {
    return dbName
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
  const parts = profileName.value
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) {
    return 'U'
  }

  return parts.map(part => part[0]?.toUpperCase() || '').join('')
})

const topLinks = computed(() => props.links)

async function refreshHeaderProfile() {
  await loadProfile()
}

onMounted(async () => {
  await refreshHeaderProfile()
})

watch(
  () => user.value?.id,
  async () => {
    await refreshHeaderProfile()
  }
)
</script>

<template>
  <header class="shrink-0 border-b border-border/90 bg-background/95 shadow-soft backdrop-blur-sm">
    <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between gap-3">
        <div class="pointer-events-none flex min-w-0 items-center gap-0">
          <div class="relative h-14 w-28 shrink-0 overflow-visible pl-6 sm:h-16 sm:w-32 sm:pl-7">
            <img src="/pwrdevs-logo.png" alt="PWRDEVS" class="absolute left-6 top-1/2 h-14 w-14 -translate-y-1/2 scale-[3] object-contain sm:left-7 sm:h-16 sm:w-16" />
          </div>
          <div class="-ml-10 min-w-0 sm:-ml-11">
            <h1 class="truncate text-base font-semibold text-foreground sm:text-lg">{{ appName }}</h1>
            <p class="truncate text-sm text-muted">Financeiro Pessoal</p>
          </div>
        </div>

        <div class="ml-auto flex shrink-0 items-center self-center">
          <NuxtLink to="/settings" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 shadow-sm transition hover:border-primary hover:bg-primary-light/25">
            <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-light/35 text-xs font-semibold text-foreground">
              <img v-if="profileAvatar" :src="profileAvatar" alt="Avatar" class="h-full w-full object-cover" />
              <span v-else>{{ profileInitials }}</span>
            </div>
            <span class="hidden max-w-[120px] truncate text-xs font-medium text-foreground md:inline">{{ profileName }}</span>
          </NuxtLink>
        </div>
      </div>

      <nav class="relative z-10 -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
        <NuxtLink
          v-for="link in topLinks"
          :key="link.to"
          :to="link.to"
          class="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-primary-light/30 hover:text-foreground sm:text-sm"
          :class="route.path === link.to ? 'bg-primary-light/45 text-foreground' : ''"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
