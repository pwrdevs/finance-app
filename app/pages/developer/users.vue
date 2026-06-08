<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppCard from '~/components/common/AppCard.vue'
import AppInput from '~/components/common/AppInput.vue'

definePageMeta({
  middleware: 'admin'
})

interface AdminUser {
  id: string
  email: string
  nome: string
  criadoEm: string | null
  ultimoLogin: string | null
  ativo: boolean
}

const loading = ref(false)
const submitting = ref(false)
const pageError = ref('')
const pageMessage = ref('')

const email = ref('')
const password = ref('')
const fullName = ref('')

const users = ref<AdminUser[]>([])

async function fetchUsers() {
  loading.value = true
  pageError.value = ''

  try {
    const data = await $fetch<{ users: AdminUser[] }>('/api/admin/users')
    users.value = data.users
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível carregar os usuários.'
  } finally {
    loading.value = false
  }
}

async function createUser() {
  pageError.value = ''
  pageMessage.value = ''

  if (!email.value || !password.value) {
    pageError.value = 'E-mail e senha temporária são obrigatórios.'
    return
  }

  submitting.value = true

  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        fullName: fullName.value
      }
    })

    pageMessage.value = 'Usuário criado com sucesso.'
    email.value = ''
    password.value = ''
    fullName.value = ''
    await fetchUsers()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível criar usuário.'
  } finally {
    submitting.value = false
  }
}

async function toggleUser(user: AdminUser) {
  pageError.value = ''
  pageMessage.value = ''

  try {
    await $fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: {
        ativo: !user.ativo
      }
    })

    pageMessage.value = user.ativo ? 'Usuário desativado.' : 'Usuário ativado.'
    await fetchUsers()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível atualizar usuário.'
  }
}

async function resetPassword(user: AdminUser) {
  pageError.value = ''
  pageMessage.value = ''

  try {
    await $fetch('/api/admin/users/reset-password', {
      method: 'POST',
      body: {
        email: user.email
      }
    })

    pageMessage.value = `Reset de senha solicitado para ${user.email}.`
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível gerar reset de senha.'
  }
}

async function deleteUser(user: AdminUser) {
  pageError.value = ''
  pageMessage.value = ''

  const confirmed = window.confirm(`Deseja excluir o usuário ${user.email}? Esta ação não pode ser desfeita.`)

  if (!confirmed) {
    return
  }

  try {
    await $fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE'
    })

    pageMessage.value = 'Usuário excluído com sucesso.'
    await fetchUsers()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Não foi possível excluir usuário.'
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('pt-BR')
}

onMounted(async () => {
  await fetchUsers()
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Administração</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Gerenciar usuários</h2>
      <p class="mt-2 text-sm text-muted">Criar usuários, resetar senha, ativar/desativar e excluir acesso.</p>
    </div>

    <AppCard title="Novo usuário">
      <div class="grid gap-3 md:grid-cols-3">
        <AppInput v-model="fullName" label="Nome" placeholder="Nome completo" />
        <AppInput v-model="email" label="E-mail" type="email" placeholder="email@dominio.com" />
        <AppInput v-model="password" label="Senha temporária" type="password" placeholder="Mínimo 6 caracteres" />
      </div>

      <div class="mt-4">
        <AppButton label="Criar usuário" :disabled="submitting" block @click="createUser" />
      </div>
    </AppCard>

    <p v-if="pageError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ pageError }}</p>
    <p v-else-if="pageMessage" class="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{{ pageMessage }}</p>

    <AppCard title="Usuários" :subtitle="loading ? 'Carregando...' : `${users.length} usuário(s)`">
      <div class="space-y-3">
        <article v-for="user in users" :key="user.id" class="rounded-2xl border border-border bg-background px-4 py-3">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm font-semibold text-foreground">{{ user.nome || user.email }}</p>
              <p class="text-xs text-muted">{{ user.email }}</p>
              <p class="mt-1 text-[11px] text-muted">Criado em: {{ formatDate(user.criadoEm) }} · Último login: {{ formatDate(user.ultimoLogin) }}</p>
            </div>

            <div class="flex flex-wrap gap-2">
              <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="user.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                {{ user.ativo ? 'Ativo' : 'Inativo' }}
              </span>
              <AppButton size="sm" variant="secondary" label="Resetar senha" @click="resetPassword(user)" />
              <AppButton
                size="sm"
                :variant="user.ativo ? 'danger' : 'primary'"
                :label="user.ativo ? 'Desativar' : 'Ativar'"
                @click="toggleUser(user)"
              />
              <AppButton size="sm" variant="danger" label="Excluir" @click="deleteUser(user)" />
            </div>
          </div>
        </article>
      </div>
    </AppCard>
  </section>
</template>
