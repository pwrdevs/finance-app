<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppErrorAlert from '~/components/common/AppErrorAlert.vue'
import AppInput from '~/components/common/AppInput.vue'
import { getFriendlyRequestError } from '~/utils/friendlyRequestError'

definePageMeta({
  middleware: 'auth',
  layout: 'auth'
})

const email = ref('')
const password = ref('')
const localError = ref('')
const isOffline = ref(false)
const isRetrying = ref(false)
const route = useRoute()

const {
  authError,
  authLoginError,
  authMessage,
  initAuthListener,
  isSubmitting,
  login
} = useAuth()

const resetMessage = ref('')
const resetError = ref<{ title: string, message: string } | null>(null)

const routeInfoMessage = computed(() => {
  if (route.query.message === 'sessao-expirada') {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }

  return ''
})

const retryDisabled = computed(() => {
  return isOffline.value || isSubmitting.value || isRetrying.value || !email.value || !password.value
})

const isServiceUnavailableError = computed(() => authLoginError.value?.type === 'service_unavailable')

const offlineAlert = computed(() => {
  if (!isOffline.value) {
    return null
  }

  return {
    title: 'Sem conexão com a internet',
    message: 'Verifique sua conexão e tente novamente.'
  }
})

function updateOfflineState() {
  if (!process.client) {
    return
  }

  isOffline.value = navigator.onLine === false
}

onMounted(() => {
  initAuthListener()
  updateOfflineState()

  if (process.client) {
    window.addEventListener('online', updateOfflineState)
    window.addEventListener('offline', updateOfflineState)
  }
})

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('online', updateOfflineState)
    window.removeEventListener('offline', updateOfflineState)
  }
})

async function onSubmit() {
  localError.value = ''
  resetMessage.value = ''
  resetError.value = null

  updateOfflineState()

  if (isOffline.value) {
    return
  }

  if (!email.value || !password.value) {
    localError.value = 'E-mail e senha são obrigatórios.'
    return
  }

  try {
    await login({
      email: email.value,
      password: password.value
    })

    await navigateTo('/dashboard')
  } catch {
    // Error message is exposed by useAuth.
  }
}

async function onRetryLogin() {
  if (retryDisabled.value) {
    return
  }

  isRetrying.value = true

  try {
    await onSubmit()
  } finally {
    isRetrying.value = false
  }
}

async function onRecoverPassword() {
  resetMessage.value = ''
  resetError.value = null

  if (!email.value) {
    resetError.value = {
      title: 'Recuperação de senha',
      message: 'Informe o e-mail para recuperar a senha.'
    }
    return
  }

  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/login`
    })

    if (error) {
      throw error
    }

    resetMessage.value = 'Enviamos um e-mail com instruções para redefinir sua senha.'
  } catch (err) {
    resetError.value = getFriendlyRequestError(
      err,
      'Recuperação de senha',
      'Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes.'
    )
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-xl space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-6 text-center shadow-panel">
      <div class="mx-auto mb-4 flex h-24 w-full max-w-[420px] items-center justify-center sm:h-28 sm:max-w-[480px]">
        <img
          src="/pwrdevs-escrito.png"
          alt="PWRDEVS"
          class="max-h-full w-auto max-w-full object-contain"
        >
      </div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Acesso</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Entrar</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted">Acesse com seu e-mail e senha para continuar.</p>
    </div>

    <AppCard title="Login" subtitle="Autenticação por e-mail e senha">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <AppInput
          v-model="email"
          label="E-mail"
          type="email"
          placeholder="you@example.com"
          required
        />

        <AppInput
          v-model="password"
          label="Senha"
          type="password"
          placeholder="Digite sua senha"
          required
        />

        <p v-if="localError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {{ localError }}
        </p>

        <p v-else-if="routeInfoMessage" class="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
          {{ routeInfoMessage }}
        </p>

        <AppErrorAlert
          v-else-if="offlineAlert"
          :title="offlineAlert.title"
          :message="offlineAlert.message"
          tone="warning"
        />

        <AppErrorAlert
          v-else-if="authLoginError"
          :title="authLoginError.title"
          :message="authLoginError.message"
          :tone="isServiceUnavailableError ? 'warning' : 'error'"
          :action-label="isServiceUnavailableError ? 'Tentar novamente' : ''"
          :action-loading="isServiceUnavailableError && (isSubmitting || isRetrying)"
          :action-disabled="retryDisabled"
          @action="onRetryLogin"
        />

        <p v-else-if="authError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {{ authError }}
        </p>

        <p v-else-if="authMessage" class="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          {{ authMessage }}
        </p>

        <AppButton
          type="submit"
          label="Entrar"
          :disabled="isSubmitting"
          block
        />

        <AppButton
          type="button"
          variant="ghost"
          label="Recuperar senha"
          block
          @click="onRecoverPassword"
        />
      </form>

      <AppErrorAlert
        v-if="resetError"
        class="mt-4"
        :title="resetError.title"
        :message="resetError.message"
      />

      <p v-else-if="resetMessage" class="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
        {{ resetMessage }}
      </p>
    </AppCard>
  </section>
</template>
