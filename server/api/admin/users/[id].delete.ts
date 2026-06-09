import { createError, defineEventHandler, getRouterParam } from 'h3'
import { isProtectedAdminPrincipal, requireAdmin, supabaseAdminRequest } from '../../../utils/adminAuth'

interface AdminUserDetails {
  id: string
  email?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID do usuário é obrigatório.' })
  }

  const targetUser = await supabaseAdminRequest<AdminUserDetails>(`/auth/v1/admin/users/${id}`)

  if (isProtectedAdminPrincipal(targetUser.email)) {
    throw createError({ statusCode: 403, statusMessage: 'Não é permitido alterar ou excluir o administrador principal.' })
  }

  await supabaseAdminRequest(`/auth/v1/admin/users/${id}`, {
    method: 'DELETE'
  })

  return {
    message: 'Usuário excluído com sucesso.'
  }
})