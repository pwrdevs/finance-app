<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const config = useRuntimeConfig()
const { authEmail, logout } = useAuth()
const { isAdmin } = useAccess()
const { applyTheme, selectedTheme } = useTheme()

const profileLoading = ref(false)
const profileSaving = ref(false)
const profileError = ref('')
const profileMessage = ref('')

const fullName = ref('')
const avatarUrl = ref('')

const appVersion = 'MVP 0.1.0'
const currentEnvironment = computed(() => config.public.appEnv || 'development')

const profileEmail = computed(() => user.value?.email || authEmail.value || 'Não disponível')

const profileName = computed(() => {
  const dbName = fullName.value.trim()

  if (dbName) {
    return dbName
  }

  const metadata = user.value?.user_metadata as { full_name?: string, name?: string, avatar_url?: string } | undefined
  const metadataName = String(metadata?.full_name || metadata?.name || '').trim()

  if (metadataName) {
    return metadataName
  }

  const email = profileEmail.value

  if (email && email !== 'Não disponível') {
    return email.split('@')[0]
  }

  return 'Usuário'
})

const profileAvatar = computed(() => {
  const dbAvatar = avatarUrl.value.trim()

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

async function loadProfile() {
  profileLoading.value = true
  profileError.value = ''

  try {
    const userId = user.value?.id

    if (!userId) {
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    fullName.value = String(data?.full_name || '')
    avatarUrl.value = String(data?.avatar_url || '')
  } catch (err) {
    profileError.value = err instanceof Error ? err.message : 'Não foi possível carregar o perfil.'
  } finally {
    profileLoading.value = false
  }
}

async function saveProfile() {
  profileSaving.value = true
  profileError.value = ''
  profileMessage.value = ''

  try {
    const userId = user.value?.id

    if (!userId) {
      throw new Error('Usuário não autenticado.')
    }

    const payload = {
      user_id: userId,
      full_name: fullName.value.trim() || null,
      avatar_url: avatarUrl.value.trim() || null
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      throw error
    }

    profileMessage.value = 'Perfil atualizado com sucesso.'
  } catch (err) {
    profileError.value = err instanceof Error ? err.message : 'Não foi possível salvar o perfil.'
  } finally {
    profileSaving.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Configurações</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Preferências do aplicativo</h2>
      <p class="mt-2 text-sm text-muted">Gerencie perfil, aparência e opções do sistema.</p>
    </div>

    <AppCard title="Perfil" subtitle="Informações da conta autenticada.">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-light/35 text-xl font-semibold text-foreground">
          <img v-if="profileAvatar" :src="profileAvatar" alt="Avatar" class="h-full w-full object-cover">
          <span v-else>{{ profileInitials }}</span>
        </div>
        <div class="space-y-1 md:col-span-2">
          <p class="text-xs uppercase tracking-[0.12em] text-muted">Nome</p>
          <p class="text-sm font-semibold text-foreground">{{ profileName }}</p>
          <p class="text-xs uppercase tracking-[0.12em] text-muted">E-mail</p>
          <p class="text-sm text-foreground">{{ profileEmail }}</p>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <AppInput v-model="fullName" label="Nome completo" placeholder="Seu nome" />
        <AppInput v-model="avatarUrl" label="URL do avatar" placeholder="https://..." hint="Upload de foto sera adicionado em uma proxima etapa." />
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton :label="profileSaving ? 'Salvando...' : 'Salvar perfil'" :disabled="profileSaving || profileLoading" @click="saveProfile" />
      </div>

      <p v-if="profileError" class="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ profileError }}</p>
      <p v-else-if="profileMessage" class="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{{ profileMessage }}</p>
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
