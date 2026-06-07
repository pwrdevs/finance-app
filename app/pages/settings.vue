<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'

definePageMeta({
  middleware: 'auth'
})

const config = useRuntimeConfig()
const { authEmail, logout } = useAuth()
const { isAdmin } = useAccess()

const selectedTheme = ref<'light' | 'dark' | 'system'>('system')

const appVersion = 'MVP 0.1.0'
const currentEnvironment = computed(() => config.public.appEnv || 'development')

function applyTheme(mode: 'light' | 'dark' | 'system') {
  selectedTheme.value = mode

  if (!process.client) {
    return
  }

  localStorage.setItem('pwrdevs-theme', mode)

  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
    return
  }

  root.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light')
}

onMounted(() => {
  if (!process.client) {
    return
  }

  const stored = localStorage.getItem('pwrdevs-theme') as 'light' | 'dark' | 'system' | null
  applyTheme(stored || 'system')
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Configurações</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Preferências do aplicativo</h2>
      <p class="mt-2 text-sm text-muted">Gerencie perfil, aparência e opções do sistema.</p>
    </div>

    <AppCard title="Perfil" subtitle="Informações do usuário autenticado.">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light/35 text-xl font-semibold text-foreground">
          {{ (authEmail || '?').slice(0, 1).toUpperCase() }}
        </div>
        <div class="space-y-1 md:col-span-2">
          <p class="text-xs uppercase tracking-[0.12em] text-muted">Nome</p>
          <p class="text-sm font-semibold text-foreground">{{ authEmail || 'Usuário' }}</p>
          <p class="text-xs uppercase tracking-[0.12em] text-muted">E-mail</p>
          <p class="text-sm text-foreground">{{ authEmail || 'Não disponível' }}</p>
        </div>
      </div>
    </AppCard>

    <AppCard title="Aparência" subtitle="Escolha o tema visual da interface.">
      <div class="grid gap-3 sm:grid-cols-3">
        <AppButton
          label="Claro"
          :variant="selectedTheme === 'light' ? 'primary' : 'secondary'"
          block
          @click="applyTheme('light')"
        />
        <AppButton
          label="Escuro"
          :variant="selectedTheme === 'dark' ? 'primary' : 'secondary'"
          block
          @click="applyTheme('dark')"
        />
        <AppButton
          label="Sistema"
          :variant="selectedTheme === 'system' ? 'primary' : 'secondary'"
          block
          @click="applyTheme('system')"
        />
      </div>
    </AppCard>

    <AppCard title="Sistema" subtitle="Informações técnicas e sessão atual.">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-border bg-background px-4 py-3">
          <p class="text-xs uppercase tracking-[0.12em] text-muted">Versão</p>
          <p class="mt-1 text-sm font-semibold text-foreground">{{ appVersion }}</p>
        </div>

        <div class="rounded-xl border border-border bg-background px-4 py-3">
          <p class="text-xs uppercase tracking-[0.12em] text-muted">Ambiente</p>
          <p class="mt-1 text-sm font-semibold text-foreground">{{ currentEnvironment }}</p>
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <AppButton
          v-if="isAdmin"
          label="Gerenciar usuários"
          variant="secondary"
          block
          @click="navigateTo('/developer/users')"
        />
        <AppButton label="Sair" variant="danger" block @click="logout" />
      </div>
    </AppCard>
  </section>
</template>
