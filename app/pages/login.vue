<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'

definePageMeta({
  middleware: 'auth'
})

const email = ref('')
const password = ref('')
const localError = ref('')

const {
  authError,
  authMessage,
  initAuthListener,
  isSubmitting,
  login
} = useAuth()

onMounted(() => {
  initAuthListener()
})

async function onSubmit() {
  localError.value = ''

  if (!email.value || !password.value) {
    localError.value = 'Email and password are required.'
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
</script>

<template>
  <section class="mx-auto w-full max-w-xl space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Authentication</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Sign in</h2>
      <p class="mt-2 text-sm text-muted">Use your account email and password to continue.</p>
    </div>

    <AppCard title="Login" subtitle="Supabase email/password authentication">
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
          placeholder="Enter your password"
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
          label="Sign in"
          :disabled="isSubmitting"
          block
        />
      </form>

      <p class="mt-4 text-sm text-muted">
        No account yet?
        <NuxtLink to="/register" class="font-semibold text-primary-dark hover:underline">
          Create one
        </NuxtLink>
      </p>
    </AppCard>
  </section>
</template>
