import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin, supabaseAdminRequest } from '../../../utils/adminAuth'

interface CreateUserBody {
  email?: string
  password?: string
  fullName?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<CreateUserBody>(event)

  const email = (body.email || '').trim().toLowerCase()
  const password = (body.password || '').trim()
  const fullName = (body.fullName || '').trim()

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'E-mail e senha são obrigatórios.' })
  }

  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'A senha deve ter no mínimo 6 caracteres.' })
  }

  const payload = await supabaseAdminRequest<{ id: string }>(
    '/auth/v1/admin/users',
    {
      method: 'POST',
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      }
    }
  )

  return {
    id: payload.id,
    message: 'Usuário criado com sucesso.'
  }
})
