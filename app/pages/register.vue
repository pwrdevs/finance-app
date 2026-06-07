<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'

definePageMeta({
  middleware: 'admin',
  layout: 'auth'
})

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref('')

const {
  authError,
  authMessage,
  initAuthListener,
  isSubmitting,
  register
} = useAuth()

onMounted(() => {
  initAuthListener()
})

async function onSubmit() {
  localError.value = ''

  if (!email.value || !password.value || !confirmPassword.value) {
    localError.value = 'E-mail, senha e confirmação são obrigatórios.'
    return
  }

  if (password.value.length < 6) {
    localError.value = 'A senha deve ter pelo menos 6 caracteres.'
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'A confirmação da senha não confere.'
    return
  }

  try {
    const result = await register({
      email: email.value,
      password: password.value
    })

    if (!result.needsEmailConfirmation) {
      await navigateTo('/dashboard')
    }
  } catch {
    // Error message is exposed by useAuth.
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-xl space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Administração</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Criar usuário</h2>
      <p class="mt-2 text-sm text-muted">Cadastro restrito a administradores.</p>
    </div>

    <AppCard title="Novo usuário" subtitle="Cria um usuário de autenticação">
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
          placeholder="Defina uma senha"
          hint="Mínimo de 6 caracteres"
          required
        />

        <AppInput
          v-model="confirmPassword"
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          required
        />

        <p v-if="localError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {{ localError }}
        </p>

        <p v-else-if="authError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {{ authError }}
        </p>

        <p v-else-if="authMessage" class="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          {{ authMessage }}
        </p>

        <AppButton
          type="submit"
          label="Criar usuário"
          :disabled="isSubmitting"
          block
        />
      </form>
    </AppCard>
  </section>
</template>
