import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { isProtectedAdminPrincipal, requireAdmin, supabaseAdminRequest } from '../../../utils/adminAuth'

interface UpdateUserBody {
  email?: string
  password?: string
  fullName?: string
  ativo?: boolean
}

interface AdminUserDetails {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateUserBody>(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID do usuário é obrigatório.' })
  }

  const hasEmail = typeof body.email === 'string' && body.email.trim().length > 0
  const hasPassword = typeof body.password === 'string' && body.password.trim().length > 0
  const hasFullName = typeof body.fullName === 'string'
  const hasActive = typeof body.ativo === 'boolean'

  if (!hasEmail && !hasPassword && !hasFullName && !hasActive) {
    throw createError({ statusCode: 400, statusMessage: 'Informe ao menos um campo para atualizar.' })
  }

  const targetUser = await supabaseAdminRequest<AdminUserDetails>(`/auth/v1/admin/users/${id}`)
  const targetEmail = String(targetUser.email || '').toLowerCase()
  const protectedAdmin = isProtectedAdminPrincipal(targetEmail)

  if (protectedAdmin && hasActive && body.ativo === false) {
    throw createError({ statusCode: 403, statusMessage: 'Não é permitido alterar ou excluir o administrador principal.' })
  }

  if (protectedAdmin && hasEmail && String(body.email || '').trim().toLowerCase() !== targetEmail) {
    throw createError({ statusCode: 403, statusMessage: 'Não é permitido alterar ou excluir o administrador principal.' })
  }

  const authPayload: Record<string, unknown> = {}

  if (hasEmail) {
    authPayload.email = String(body.email || '').trim().toLowerCase()
  }

  if (hasPassword) {
    const password = String(body.password || '').trim()

    if (password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: 'A senha deve ter no mínimo 6 caracteres.' })
    }

    authPayload.password = password
  }

  if (hasActive) {
    authPayload.ban_duration = body.ativo ? 'none' : '876000h'
  }

  if (hasFullName) {
    authPayload.user_metadata = {
      ...(targetUser.user_metadata || {}),
      full_name: String(body.fullName || '').trim()
    }
  }

  if (Object.keys(authPayload).length > 0) {
    await supabaseAdminRequest(`/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      body: authPayload
    })
  }

  if (hasFullName) {
    await supabaseAdminRequest(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: {
        full_name: String(body.fullName || '').trim() || null
      }
    })
  }

  return {
    message: 'Usuário atualizado com sucesso.'
  }
})
