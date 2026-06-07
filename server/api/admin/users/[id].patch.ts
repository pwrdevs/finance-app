import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAdmin, supabaseAdminRequest } from '~~/server/utils/adminAuth'

interface UpdateUserBody {
  ativo?: boolean
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateUserBody>(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID do usuário é obrigatório.' })
  }

  if (typeof body.ativo !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Campo ativo deve ser booleano.' })
  }

  await supabaseAdminRequest(`/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    body: {
      ban_duration: body.ativo ? 'none' : '876000h'
    }
  })

  return {
    message: body.ativo ? 'Usuário ativado com sucesso.' : 'Usuário desativado com sucesso.'
  }
})
