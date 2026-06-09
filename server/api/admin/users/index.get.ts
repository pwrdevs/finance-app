import { defineEventHandler } from 'h3'
import { isProtectedAdminPrincipal, requireAdmin, supabaseAdminRequest } from '../../../utils/adminAuth'

interface AdminUserResponse {
  users: Array<{
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
    created_at?: string
    banned_until?: string | null
    last_sign_in_at?: string | null
  }>
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const data = await supabaseAdminRequest<AdminUserResponse>('/auth/v1/admin/users')

  return {
    users: (data.users || []).map(user => ({
      id: user.id,
      email: user.email || '',
      nome: String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim(),
      criadoEm: user.created_at || null,
      ultimoLogin: user.last_sign_in_at || null,
      ativo: !Boolean(user.banned_until),
      isProtected: isProtectedAdminPrincipal(user.email)
    }))
  }
})
