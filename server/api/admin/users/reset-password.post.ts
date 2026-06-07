import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin, supabaseAdminRequest } from '~~/server/utils/adminAuth'

interface ResetPasswordBody {
  email?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<ResetPasswordBody>(event)
  const email = (body.email || '').trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Informe o e-mail do usuário.' })
  }

  await supabaseAdminRequest('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: {
      type: 'recovery',
      email
    }
  })

  return {
    message: 'Fluxo de redefinição de senha gerado com sucesso.'
  }
})
