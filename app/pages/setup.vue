<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'

interface TableCount {
  label: string
  table: string
  count: number | null
  error: string | null
  accessState: 'idle' | 'ok' | 'auth-required' | 'error'
}

const supabase = useSupabaseClient()
const config = useRuntimeConfig()

const connectionState = ref<'idle' | 'connected' | 'error'>('idle')
const connectionMessage = ref('Checking public Supabase endpoint…')

const authState = ref<'idle' | 'authenticated' | 'anonymous' | 'error'>('idle')
const authMessage = ref('Checking current session…')

const tableAccessState = ref<'idle' | 'ok' | 'auth-required' | 'error'>('idle')
const tableAccessMessage = ref('Checking table access…')
const isRefreshing = ref(false)

const tableCounts = ref<TableCount[]>([
  { label: 'People', table: 'people', count: null, error: null, accessState: 'idle' },
  { label: 'Accounts', table: 'accounts', count: null, error: null, accessState: 'idle' },
  { label: 'Categories', table: 'categories', count: null, error: null, accessState: 'idle' },
  { label: 'Cards', table: 'cards', count: null, error: null, accessState: 'idle' }
])

function getPublicSupabaseConfig() {
  const supabaseConfig = config.public.supabase as { url?: string, key?: string } | undefined

  return {
    url: supabaseConfig?.url,
    key: supabaseConfig?.key
  }
}

function isAuthRequiredResponse(status: number, payload: unknown) {
  if (status === 401 || status === 403) {
    return true
  }

  if (!payload || typeof payload !== 'object') {
    return false
  }

  const code = 'code' in payload ? String(payload.code ?? '') : ''
  const message = 'message' in payload ? String(payload.message ?? '') : ''

  return code === '42501' || /permission denied|authenticated user|auth\.uid/i.test(message)
}

async function checkConnection() {
  const { url, key } = getPublicSupabaseConfig()

  if (!url || !key) {
    connectionState.value = 'error'
    connectionMessage.value = 'Supabase URL or publishable key is missing from runtime config.'
    return
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: key
      }
    })

    if (!response.ok) {
      connectionState.value = 'error'
      connectionMessage.value = `Public auth settings endpoint returned ${response.status}.`
      return
    }

    connectionState.value = 'connected'
    connectionMessage.value = 'Supabase connected'
  } catch (err) {
    connectionState.value = 'error'
    connectionMessage.value = err instanceof Error ? err.message : 'Unknown error'
  }
}

async function checkAuthStatus() {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error && error.message !== 'Auth session missing!') {
      authState.value = 'error'
      authMessage.value = error.message
      return
    }

    if (data.user) {
      authState.value = 'authenticated'
      authMessage.value = `Authenticated as ${data.user.email || data.user.id}`
      return
    }

    authState.value = 'anonymous'
    authMessage.value = 'No authenticated user'
  } catch (err) {
    authState.value = 'error'
    authMessage.value = err instanceof Error ? err.message : 'Unknown error'
  }
}

async function fetchCounts() {
  const { url, key } = getPublicSupabaseConfig()

  if (!url || !key) {
    tableAccessState.value = 'error'
    tableAccessMessage.value = 'Supabase URL or publishable key is missing from runtime config.'
    return
  }

  const results = await Promise.all(
    tableCounts.value.map(async (entry) => {
      try {
        const response = await fetch(`${url}/rest/v1/${entry.table}?select=id`, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Prefer: 'count=exact'
          }
        })

        const payload = await response.json().catch(() => null)

        if (response.ok) {
          const countHeader = response.headers.get('content-range')
          const count = countHeader?.split('/').at(1)

          entry.count = count ? Number(count) : 0
          entry.error = null
          entry.accessState = 'ok'
          return
        }

        if (isAuthRequiredResponse(response.status, payload)) {
          entry.count = null
          entry.error = 'Database access requires authenticated user or table grants'
          entry.accessState = 'auth-required'
          return
        }

        entry.count = null
        entry.error = typeof payload === 'object' && payload && 'message' in payload
          ? String(payload.message ?? 'Unexpected table access error')
          : `Unexpected table access error (${response.status})`
        entry.accessState = 'error'
      } catch (err) {
        entry.count = null
        entry.error = err instanceof Error ? err.message : 'Unknown error'
        entry.accessState = 'error'
      }
    })
  )

  if (results.every(() => true)) {
    const states = tableCounts.value.map(entry => entry.accessState)

    if (states.every(state => state === 'ok')) {
      tableAccessState.value = 'ok'
      tableAccessMessage.value = 'Database tables are reachable with the current client session.'
      return
    }

    if (states.some(state => state === 'auth-required') && !states.some(state => state === 'error')) {
      tableAccessState.value = 'auth-required'
      tableAccessMessage.value = 'Database access requires authenticated user or table grants'
      return
    }

    tableAccessState.value = 'error'
    tableAccessMessage.value = 'Unexpected database table access error'
  }
}

function resetSetupState() {
  connectionState.value = 'idle'
  connectionMessage.value = 'Checking public Supabase endpoint…'

  authState.value = 'idle'
  authMessage.value = 'Checking current session…'

  tableAccessState.value = 'idle'
  tableAccessMessage.value = 'Checking table access…'

  tableCounts.value.forEach((entry) => {
    entry.count = null
    entry.error = null
    entry.accessState = 'idle'
  })
}

async function refreshSetupState() {
  isRefreshing.value = true
  resetSetupState()

  await checkConnection()
  await checkAuthStatus()

  if (connectionState.value === 'connected') {
    await fetchCounts()
  } else {
    tableAccessState.value = 'error'
    tableAccessMessage.value = 'Skipped because Supabase public connection check failed.'
  }

  isRefreshing.value = false
}

onMounted(async () => {
  await refreshSetupState()
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">PWRDEVS / Finance OS</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">System Setup</h2>
      <p class="mt-2 text-sm text-muted">
        Temporary page to validate database connectivity and current core-table visibility.
      </p>
    </div>

    <AppCard title="Supabase Connection">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
        <template v-if="connectionState === 'idle'">
          <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-muted" />
          <span class="text-sm text-muted">Checking connection…</span>
        </template>

        <template v-else-if="connectionState === 'connected'">
          <span class="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span class="text-sm font-semibold text-emerald-700">Supabase connected</span>
        </template>

        <template v-else>
          <span class="inline-block h-3 w-3 rounded-full bg-rose-500" />
          <span class="text-sm font-semibold text-rose-700">Connection check failed</span>
        </template>
        </div>

        <AppButton
          label="Refresh status"
          variant="secondary"
          size="sm"
          :disabled="isRefreshing"
          @click="refreshSetupState"
        />
      </div>

      <p class="mt-3 rounded-xl px-4 py-3 text-xs" :class="connectionState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-primary-light/35 text-muted'">
        {{ connectionMessage }}
      </p>
    </AppCard>

    <AppCard title="Auth Status">
      <div class="flex items-center gap-3">
        <template v-if="authState === 'idle'">
          <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-muted" />
          <span class="text-sm text-muted">Checking current session…</span>
        </template>

        <template v-else-if="authState === 'authenticated'">
          <span class="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span class="text-sm font-semibold text-emerald-700">Authenticated user detected</span>
        </template>

        <template v-else-if="authState === 'anonymous'">
          <span class="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span class="text-sm font-semibold text-amber-700">No authenticated user</span>
        </template>

        <template v-else>
          <span class="inline-block h-3 w-3 rounded-full bg-rose-500" />
          <span class="text-sm font-semibold text-rose-700">Auth status check failed</span>
        </template>
      </div>

      <p class="mt-3 rounded-xl px-4 py-3 text-xs" :class="authState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-primary-light/35 text-muted'">
        {{ authMessage }}
      </p>
    </AppCard>

    <AppCard title="Database Table Access" subtitle="Checks current client visibility for people, accounts, categories and cards.">
      <div class="flex items-center gap-3">
        <template v-if="tableAccessState === 'idle'">
          <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-muted" />
          <span class="text-sm text-muted">Checking table access…</span>
        </template>

        <template v-else-if="tableAccessState === 'ok'">
          <span class="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span class="text-sm font-semibold text-emerald-700">Database tables reachable</span>
        </template>

        <template v-else-if="tableAccessState === 'auth-required'">
          <span class="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span class="text-sm font-semibold text-amber-700">Database access requires authenticated user or table grants</span>
        </template>

        <template v-else>
          <span class="inline-block h-3 w-3 rounded-full bg-rose-500" />
          <span class="text-sm font-semibold text-rose-700">Database table access check failed</span>
        </template>
      </div>

      <p class="mt-3 rounded-xl px-4 py-3 text-xs" :class="tableAccessState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-primary-light/35 text-muted'">
        {{ tableAccessMessage }}
      </p>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="entry in tableCounts"
          :key="entry.table"
          class="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ entry.label }}</p>

          <template v-if="entry.accessState === 'auth-required'">
            <p class="text-xs text-amber-700">Auth or grants required</p>
          </template>

          <template v-else-if="entry.error">
            <p class="text-xs text-rose-600">{{ entry.error }}</p>
          </template>

          <template v-else-if="entry.count === null">
            <p class="h-8 w-12 animate-pulse rounded bg-primary-light/50" />
          </template>

          <template v-else>
            <p class="text-2xl font-semibold text-foreground">{{ entry.count }}</p>
            <p class="text-xs text-muted">record{{ entry.count !== 1 ? 's' : '' }}</p>
          </template>
        </div>
      </div>
    </AppCard>
  </section>
</template>
