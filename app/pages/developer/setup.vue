<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'

definePageMeta({
  middleware: 'admin'
})

interface TableCount {
  label: string
  table: string
  count: number | null
  error: string | null
  accessState: 'idle' | 'ok' | 'auth-required' | 'error'
}

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const user = useSupabaseUser()
const session = useSupabaseSession()

const connectionState = ref<'idle' | 'connected' | 'error'>('idle')
const connectionMessage = ref('Verificando endpoint publico do Supabase...')

const authState = ref<'idle' | 'authenticated' | 'anonymous' | 'error'>('idle')
const authMessage = ref('Verificando sessao atual...')

const tableAccessState = ref<'idle' | 'ok' | 'auth-required' | 'error'>('idle')
const tableAccessMessage = ref('Verificando acesso as tabelas...')
const isRefreshing = ref(false)

const authUid = computed(() => user.value?.id ?? null)
const authEmail = computed(() => user.value?.email ?? null)
const sessionSummary = computed(() => {
  if (!session.value) {
    return 'Nenhuma sessao ativa'
  }

  const expiresAt = session.value.expires_at

  if (!expiresAt) {
    return 'Sessao ativa (sem informacao de expiracao)'
  }

  const expiryIso = new Date(expiresAt * 1000).toISOString()

  return `Sessao ativa ate ${expiryIso}`
})

const tableCounts = ref<TableCount[]>([
  { label: 'Pessoas', table: 'people', count: null, error: null, accessState: 'idle' },
  { label: 'Contas', table: 'accounts', count: null, error: null, accessState: 'idle' },
  { label: 'Categorias', table: 'categories', count: null, error: null, accessState: 'idle' },
  { label: 'Cartoes', table: 'cards', count: null, error: null, accessState: 'idle' }
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

function isAuthRequiredError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = 'code' in error ? String(error.code ?? '') : ''
  const message = 'message' in error ? String(error.message ?? '') : ''

  return code === '42501' || /permission denied|authenticated user|auth\.uid/i.test(message)
}

async function checkConnection() {
  const { url, key } = getPublicSupabaseConfig()

  if (!url || !key) {
    connectionState.value = 'error'
    connectionMessage.value = 'URL ou chave publica do Supabase ausente na configuracao de runtime.'
    return
  }

  connectionState.value = 'connected'
  connectionMessage.value = 'Supabase conectado'
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
      authMessage.value = `Autenticado como ${data.user.email || data.user.id}`
      return
    }

    authState.value = 'anonymous'
    authMessage.value = 'Nenhum usuario autenticado'
  } catch (err) {
    authState.value = 'error'
    authMessage.value = err instanceof Error ? err.message : 'Erro desconhecido'
  }
}

async function fetchCounts() {
  await Promise.all(
    tableCounts.value.map(async (entry) => {
      try {
        const { count, error, status } = await supabase
          .from(entry.table)
          .select('id', { count: 'exact', head: true })

        if (!error) {
          entry.count = count ?? 0
          entry.error = null
          entry.accessState = 'ok'
          return
        }

        if (status === 401 || status === 403 || isAuthRequiredError(error)) {
          entry.count = null
          entry.error = 'O acesso ao banco exige usuario autenticado ou grants nas tabelas'
          entry.accessState = 'auth-required'
          return
        }

        entry.count = null
        entry.error = 'message' in error ? String(error.message ?? 'Erro inesperado ao acessar tabela') : 'Erro inesperado ao acessar tabela'
        entry.accessState = 'error'
      } catch (err) {
        entry.count = null
        entry.error = err instanceof Error ? err.message : 'Erro desconhecido'
        entry.accessState = 'error'
      }
    })
  )

  const states = tableCounts.value.map(entry => entry.accessState)

  if (states.every(state => state === 'ok')) {
    tableAccessState.value = 'ok'
    tableAccessMessage.value = 'As tabelas do banco estao acessiveis com a sessao atual.'
    return
  }

  if (states.some(state => state === 'auth-required') && !states.some(state => state === 'error')) {
    tableAccessState.value = 'auth-required'
    tableAccessMessage.value = 'O acesso ao banco exige usuario autenticado ou grants nas tabelas'
    return
  }

  tableAccessState.value = 'error'
  tableAccessMessage.value = 'Erro inesperado ao acessar tabelas do banco'
}

function resetSetupState() {
  connectionState.value = 'idle'
  connectionMessage.value = 'Verificando endpoint publico do Supabase...'

  authState.value = 'idle'
  authMessage.value = 'Verificando sessao atual...'

  tableAccessState.value = 'idle'
  tableAccessMessage.value = 'Verificando acesso as tabelas...'

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
    tableAccessMessage.value = 'Etapa ignorada porque a conexao publica com o Supabase falhou.'
  }

  isRefreshing.value = false
}

onMounted(async () => {
  await refreshSetupState()
})
</script>

<template>
  <section class="space-y-6">
    <AppCard title="Conexao Supabase">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
        <template v-if="connectionState === 'idle'">
          <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-muted" />
          <span class="text-sm text-muted">Verificando conexao...</span>
        </template>

        <template v-else-if="connectionState === 'connected'">
          <span class="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span class="text-sm font-semibold text-emerald-700">Supabase conectado</span>
        </template>

        <template v-else>
          <span class="inline-block h-3 w-3 rounded-full bg-rose-500" />
          <span class="text-sm font-semibold text-rose-700">Falha na verificacao da conexao</span>
        </template>
        </div>

        <AppButton
          label="Atualizar status"
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

    <AppCard title="Status de autenticacao">
      <div class="flex items-center gap-3">
        <template v-if="authState === 'idle'">
          <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-muted" />
          <span class="text-sm text-muted">Verificando sessao atual...</span>
        </template>

        <template v-else-if="authState === 'authenticated'">
          <span class="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span class="text-sm font-semibold text-emerald-700">Usuario autenticado detectado</span>
        </template>

        <template v-else-if="authState === 'anonymous'">
          <span class="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span class="text-sm font-semibold text-amber-700">Nenhum usuario autenticado</span>
        </template>

        <template v-else>
          <span class="inline-block h-3 w-3 rounded-full bg-rose-500" />
          <span class="text-sm font-semibold text-rose-700">Falha na verificacao de autenticacao</span>
        </template>
      </div>

      <p class="mt-3 rounded-xl px-4 py-3 text-xs" :class="authState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-primary-light/35 text-muted'">
        {{ authMessage }}
      </p>

      <dl class="mt-3 grid gap-2 rounded-xl border border-border bg-background px-4 py-3 text-xs">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <dt class="font-semibold uppercase tracking-wide text-muted">auth.uid()</dt>
          <dd class="break-all text-foreground">{{ authUid || 'null' }}</dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <dt class="font-semibold uppercase tracking-wide text-muted">Email do usuario</dt>
          <dd class="break-all text-foreground">{{ authEmail || 'null' }}</dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <dt class="font-semibold uppercase tracking-wide text-muted">Status da sessao</dt>
          <dd class="break-all text-foreground">{{ sessionSummary }}</dd>
        </div>
      </dl>
    </AppCard>

    <AppCard title="Acesso as tabelas" subtitle="Valida a visibilidade atual do cliente para pessoas, contas, categorias e cartoes.">
      <div class="flex items-center gap-3">
        <template v-if="tableAccessState === 'idle'">
          <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-muted" />
          <span class="text-sm text-muted">Verificando acesso as tabelas...</span>
        </template>

        <template v-else-if="tableAccessState === 'ok'">
          <span class="inline-block h-3 w-3 rounded-full bg-emerald-500" />
          <span class="text-sm font-semibold text-emerald-700">Tabelas acessiveis</span>
        </template>

        <template v-else-if="tableAccessState === 'auth-required'">
          <span class="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span class="text-sm font-semibold text-amber-700">Acesso exige usuario autenticado ou grants</span>
        </template>

        <template v-else>
          <span class="inline-block h-3 w-3 rounded-full bg-rose-500" />
          <span class="text-sm font-semibold text-rose-700">Falha na verificacao de acesso as tabelas</span>
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
            <p class="text-xs text-amber-700">Autenticacao ou grants necessarios</p>
          </template>

          <template v-else-if="entry.error">
            <p class="text-xs text-rose-600">{{ entry.error }}</p>
          </template>

          <template v-else-if="entry.count === null">
            <p class="h-8 w-12 animate-pulse rounded bg-primary-light/50" />
          </template>

          <template v-else>
            <p class="text-2xl font-semibold text-foreground">{{ entry.count }}</p>
            <p class="text-xs text-muted">registro{{ entry.count !== 1 ? 's' : '' }}</p>
          </template>
        </div>
      </div>
    </AppCard>
  </section>
</template>
