<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'

definePageMeta({
  middleware: 'auth'
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
    localError.value = 'Email, password and confirmation are required.'
    return
  }

  if (password.value.length < 6) {
    localError.value = 'Password must have at least 6 characters.'
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'Password confirmation does not match.'
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
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Authentication</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Create account</h2>
      <p class="mt-2 text-sm text-muted">Register using email and password.</p>
    </div>

    <AppCard title="Register" subtitle="Creates a Supabase auth user">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <AppInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
        />

        <AppInput
          v-model="password"
          label="Password"
          type="password"
          placeholder="Choose a password"
          hint="Minimum 6 characters"
          required
        />

        <AppInput
          v-model="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
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
          label="Create account"
          :disabled="isSubmitting"
          block
        />
      </form>

      <p class="mt-4 text-sm text-muted">
        Already have an account?
        <NuxtLink to="/login" class="font-semibold text-primary-dark hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </AppCard>
  </section>
</template>
