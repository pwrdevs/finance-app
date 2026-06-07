<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'

definePageMeta({
  middleware: 'auth'
})

const {
  authEmail,
  authUid,
  initAuthListener,
  isSubmitting,
  logout,
  sessionStatus
} = useAuth()

const { ensureProfile, isEnsuringProfile, profileError } = useProfile()
const profileCreated = ref<boolean | null>(null)

onMounted(async () => {
  initAuthListener()

  try {
    const result = await ensureProfile()
    profileCreated.value = result.created
  } catch {
    profileCreated.value = null
  }
})

async function onLogout() {
  await logout()
}
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Authentication</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Dashboard (temporary)</h2>
      <p class="mt-2 text-sm text-muted">Protected route available only for authenticated users.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <AppCard title="Session Status">
        <p class="text-sm font-semibold text-foreground">{{ sessionStatus }}</p>
      </AppCard>

      <AppCard title="auth.uid()">
        <p class="break-all text-sm font-semibold text-foreground">{{ authUid || 'n/a' }}</p>
      </AppCard>

      <AppCard title="User Email">
        <p class="break-all text-sm font-semibold text-foreground">{{ authEmail || 'n/a' }}</p>
      </AppCard>
    </div>

    <AppCard title="Profile Bootstrap">
      <p v-if="isEnsuringProfile" class="text-sm text-muted">Ensuring profile row...</p>
      <p v-else-if="profileError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ profileError }}</p>
      <p v-else-if="profileCreated === true" class="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
        Profile row created successfully.
      </p>
      <p v-else-if="profileCreated === false" class="rounded-xl bg-primary-light/35 px-4 py-3 text-xs text-muted">
        Profile row already exists.
      </p>
      <p v-else class="rounded-xl bg-primary-light/35 px-4 py-3 text-xs text-muted">
        Profile status not available.
      </p>
    </AppCard>

    <div class="flex justify-end">
      <AppButton
        label="Logout"
        variant="danger"
        :disabled="isSubmitting"
        @click="onLogout"
      />
    </div>
  </section>
</template>
