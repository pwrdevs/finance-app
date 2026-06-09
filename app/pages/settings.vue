<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const config = useRuntimeConfig()
const { authEmail, logout } = useAuth()
const { isAdmin } = useAccess()
const { applyTheme, selectedTheme } = useTheme()
const { loadProfile, profileAvatarUrl, profileFullName, setProfile } = useProfile()

const profileLoading = ref(false)
const profileSaving = ref(false)
const profileError = ref('')
const profileMessage = ref('')

const selectedAvatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const captureInput = ref<HTMLInputElement | null>(null)

const appVersion = 'MVP 0.1.0'
const currentEnvironment = computed(() => config.public.appEnv || 'development')
const appVersionUpdatedAt = computed(() => {
  const rawTimestamp = String(config.public.appBuildTimestamp || '').trim()

  if (!rawTimestamp) {
    return 'Não disponível'
  }

  const parsed = new Date(rawTimestamp)

  if (Number.isNaN(parsed.getTime())) {
    return rawTimestamp
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
})

const profileEmail = computed(() => user.value?.email || authEmail.value || 'Não disponível')

const profileName = computed(() => {
  const dbName = profileFullName.value.trim()

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
  if (avatarPreviewUrl.value) {
    return avatarPreviewUrl.value
  }

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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result)
    }

    reader.onerror = () => {
      reject(new Error('Não foi possível ler o arquivo de imagem.'))
    }

    reader.readAsDataURL(file)
  })
}

async function resolveAuthenticatedUserId() {
  const fromUser = user.value?.id

  if (fromUser) {
    return fromUser
  }

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session?.user?.id || null
}

function resetSelectedAvatar() {
  selectedAvatarFile.value = null
  avatarPreviewUrl.value = ''

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  if (captureInput.value) {
    captureInput.value.value = ''
  }
}

async function selectAvatar(file: File | null) {
  if (!file) {
    return
  }

  const maxSizeInBytes = 2 * 1024 * 1024

  if (file.size > maxSizeInBytes) {
    profileError.value = 'A imagem deve ter no máximo 2 MB.'
    return
  }

  profileError.value = ''
  selectedAvatarFile.value = file
  avatarPreviewUrl.value = await readFileAsDataUrl(file)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  void selectAvatar(file)
}

function onCaptureChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  void selectAvatar(file)
}

function openFilePicker() {
  fileInput.value?.click()
}

function openCameraCapture() {
  captureInput.value?.click()
}

function removeAvatar() {
  resetSelectedAvatar()
  profileAvatarUrl.value = ''
}

async function persistAvatar(userId: string) {
  if (!selectedAvatarFile.value) {
    return profileAvatarUrl.value.trim() || null
  }

  const avatarFile = selectedAvatarFile.value
  const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg'
  const filePath = `${userId}/avatar-${Date.now()}.${safeExtension}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, avatarFile, {
      upsert: true,
      contentType: avatarFile.type || 'image/jpeg'
    })

  if (!uploadError) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return data.publicUrl || null
  }

  const dataUrl = await readFileAsDataUrl(avatarFile)

  if (dataUrl.length > 700_000) {
    throw new Error('Não foi possível enviar para o Storage e a imagem está grande para fallback local. Use uma imagem menor.')
  }

  return dataUrl
}

async function refreshProfile() {
  profileLoading.value = true
  profileError.value = ''

  try {
    const userId = await resolveAuthenticatedUserId()

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

    setProfile({
      fullName: String(data?.full_name || ''),
      avatarUrl: String(data?.avatar_url || '')
    })
    resetSelectedAvatar()
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
    const userId = await resolveAuthenticatedUserId()

    if (!userId) {
      await navigateTo('/login?message=sessao-expirada')
      return
    }

    const persistedAvatar = await persistAvatar(userId)

    const payload = {
      user_id: userId,
      full_name: profileFullName.value.trim() || null,
      avatar_url: persistedAvatar
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      throw error
    }

    setProfile({
      fullName: profileFullName.value,
      avatarUrl: persistedAvatar || ''
    })
    resetSelectedAvatar()
    profileMessage.value = 'Perfil atualizado com sucesso.'
  } catch (err) {
    profileError.value = err instanceof Error ? err.message : 'Não foi possível salvar o perfil.'
  } finally {
    profileSaving.value = false
  }
}

onMounted(() => {
  void refreshProfile()
})

watch(
  () => user.value?.id,
  () => {
    void refreshProfile()
  }
)
</script>

<template>
  <section class="space-y-6">
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
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-foreground">Nome completo</label>
          <input
            v-model="profileFullName"
            type="text"
            class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
            placeholder="Seu nome"
          >
        </div>

        <div class="space-y-2 md:col-span-2">
          <p class="text-sm font-medium text-foreground">Foto de perfil</p>
          <p class="text-xs text-muted">Você pode enviar uma imagem da galeria ou capturar pela câmera.</p>

          <div class="flex flex-wrap gap-2">
            <AppButton label="Enviar foto" variant="secondary" @click="openFilePicker" />
            <AppButton label="Capturar foto" variant="secondary" @click="openCameraCapture" />
            <AppButton label="Remover foto" variant="ghost" @click="removeAvatar" />
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileChange"
          >

          <input
            ref="captureInput"
            type="file"
            accept="image/*"
            capture="user"
            class="hidden"
            @change="onCaptureChange"
          >
        </div>
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
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-xl border border-border bg-background px-4 py-3">
          <p class="text-xs uppercase tracking-[0.12em] text-muted">Versão</p>
          <p class="mt-1 text-sm font-semibold text-foreground">{{ appVersion }}</p>
        </div>

        <div class="rounded-xl border border-border bg-background px-4 py-3">
          <p class="text-xs uppercase tracking-[0.12em] text-muted">Atualizada em</p>
          <p class="mt-1 text-sm font-semibold text-foreground">{{ appVersionUpdatedAt }}</p>
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
