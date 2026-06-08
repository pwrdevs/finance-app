import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAdmin, supabaseAdminRequest } from '../../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID do usuário é obrigatório.' })
  }

  await supabaseAdminRequest(`/auth/v1/admin/users/${id}`, {
    method: 'DELETE'
  })

  return {
    message: 'Usuário excluído com sucesso.'
  }
})