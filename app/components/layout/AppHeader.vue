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

const emit = defineEmits<{
  menu: []
}>()

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
  <header class="h-28 shrink-0 border-b border-border/90 bg-background/95 shadow-soft backdrop-blur-sm">
    <div class="mx-auto flex h-full w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground lg:hidden"
          aria-label="Abrir menu de navegacao"
          @click="emit('menu')"
        >
          <span aria-hidden="true" class="text-lg">=</span>
        </button>

        <div class="flex items-center gap-3">
          <img src="/pwrdevs-logo.png" alt="PWRDEVS" class="h-20 w-20 rounded-xl object-contain" />
          <div>
            <h1 class="text-base font-semibold text-foreground sm:text-lg">{{ appName }}</h1>
            <p class="text-xs text-muted">Financeiro Pessoal</p>
          </div>
        </div>
      </div>

      <nav class="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
        <NuxtLink
          v-for="link in topLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-primary-light/30 hover:text-foreground"
          :class="route.path === link.to ? 'bg-primary-light/45 text-foreground' : ''"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-3">
        <div class="hidden items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted shadow-sm sm:flex">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Sistema online
        </div>

        <NuxtLink to="/settings" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 shadow-sm transition hover:border-primary hover:bg-primary-light/25">
          <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-light/35 text-xs font-semibold text-foreground">
            <img v-if="profileAvatar" :src="profileAvatar" alt="Avatar" class="h-full w-full object-cover" />
            <span v-else>{{ profileInitials }}</span>
          </div>
          <span class="hidden max-w-[120px] truncate text-xs font-medium text-foreground md:inline">{{ profileName }}</span>
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
