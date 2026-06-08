import { createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

export const ADMIN_PRINCIPAL_EMAIL = 'diego05.almeida@gmail.com'
const ADMIN_EMAILS = [ADMIN_PRINCIPAL_EMAIL]

export function isProtectedAdminPrincipal(email?: string | null) {
  return String(email || '').toLowerCase() === ADMIN_PRINCIPAL_EMAIL
}

export async function requireAdmin(event: Parameters<typeof serverSupabaseUser>[0]) {
  const user = await serverSupabaseUser(event)

  if (!user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Usuário não autenticado.' })
  }

  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso permitido apenas para administradores.' })
  }

  return user
}

export function getSupabaseAdminConfig() {
  const url = process.env.NUXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NUXT_SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Configuração admin indisponível. Defina NUXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    })
  }

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
