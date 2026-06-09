import { createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase()
}

function getRequiredAdminEnv() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL)
  const url = String(process.env.NUXT_PUBLIC_SUPABASE_URL || '').trim()
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!adminEmail || !url || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Configuracao admin indisponivel. Defina ADMIN_EMAIL, NUXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    })
  }

  return { adminEmail, url, serviceKey }
}

export function getAdminEmail() {
  return getRequiredAdminEnv().adminEmail
}

export function isAdmin(email?: string | null) {
  const adminEmail = getAdminEmail()
  return Boolean(normalizeEmail(email) && normalizeEmail(email) === adminEmail)
}

export function isProtectedAdminPrincipal(email?: string | null) {
  return isAdmin(email)
}

export async function requireAdmin(event: Parameters<typeof serverSupabaseUser>[0]) {
  const user = await serverSupabaseUser(event)
  const userEmail = normalizeEmail(user?.email)

  if (!userEmail) {
    console.warn('Admin access denied:', userEmail || 'anonymous')
    throw createError({ statusCode: 401, statusMessage: 'Usuário não autenticado.' })
  }

  if (!isAdmin(userEmail)) {
    console.warn('Admin access denied:', userEmail)
    throw createError({ statusCode: 403, statusMessage: 'Acesso permitido apenas para administradores.' })
  }

  console.info('Admin access granted:', userEmail)

  return user
}

export function getSupabaseAdminConfig() {
  const { url, serviceKey } = getRequiredAdminEnv()

  return { url, serviceKey }
}

export async function supabaseAdminRequest<T>(path: string, options?: {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
}) {
  const { url, serviceKey } = getSupabaseAdminConfig()
  const response = await fetch(`${url}${path}`, {
    method: options?.method || 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = (payload && typeof payload === 'object' && 'msg' in payload)
      ? String(payload.msg)
      : (payload && typeof payload === 'object' && 'message' in payload)
        ? String(payload.message)
        : 'Erro inesperado na operação administrativa.'

    throw createError({ statusCode: response.status, statusMessage: message })
  }

  return payload as T
}
