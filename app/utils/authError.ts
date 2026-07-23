export type FriendlyAuthErrorType =
  | 'invalid_credentials'
  | 'email_unconfirmed'
  | 'unauthorized'
  | 'service_unavailable'
  | 'unknown'

export interface FriendlyAuthError {
  type: FriendlyAuthErrorType
  title: string
  message: string
}

interface ErrorDetails {
  message: string
  code: string
  name: string
  status: number | null
}

const INVALID_CREDENTIALS_ERROR: FriendlyAuthError = {
  type: 'invalid_credentials',
  title: 'Falha no login',
  message: 'E-mail ou senha inválidos.'
}

const EMAIL_UNCONFIRMED_ERROR: FriendlyAuthError = {
  type: 'email_unconfirmed',
  title: 'E-mail não confirmado',
  message: 'Seu e-mail ainda não foi confirmado.'
}

const UNAUTHORIZED_ERROR: FriendlyAuthError = {
  type: 'unauthorized',
  title: 'Acesso não autorizado',
  message: 'Seu acesso não está autorizado.'
}

const SERVICE_UNAVAILABLE_ERROR: FriendlyAuthError = {
  type: 'service_unavailable',
  title: 'Servidor temporariamente indisponível',
  message: 'Não foi possível conectar ao sistema. O banco de dados pode estar pausado ou em manutenção. Aguarde alguns minutos e tente novamente.'
}

const UNKNOWN_ERROR: FriendlyAuthError = {
  type: 'unknown',
  title: 'Não foi possível entrar',
  message: 'Tente novamente em instantes.'
}

function extractErrorDetails(error: unknown): ErrorDetails {
  if (!error || typeof error !== 'object') {
    return {
      message: '',
      code: '',
      name: '',
      status: null
    }
  }

  const raw = error as Record<string, unknown>

  return {
    message: typeof raw.message === 'string' ? raw.message.toLowerCase() : '',
    code: typeof raw.code === 'string' ? raw.code.toLowerCase() : '',
    name: typeof raw.name === 'string' ? raw.name.toLowerCase() : '',
    status: typeof raw.status === 'number' ? raw.status : null
  }
}

function isServiceUnavailable(details: ErrorDetails) {
  if (details.status === 502 || details.status === 503 || details.status === 504) {
    return true
  }

  const hasNetworkMessage = /(load failed|failed to fetch|networkerror|network request failed|fetch failed|timeout|timed out)/i.test(
    `${details.message} ${details.code}`
  )

  if (hasNetworkMessage) {
    return true
  }

  return details.name === 'typeerror' && /(fetch|network)/i.test(details.message)
}

export function getFriendlyAuthError(error: unknown): FriendlyAuthError {
  const details = extractErrorDetails(error)
  const text = `${details.message} ${details.code}`

  if (/(invalid login credentials|invalid credentials|email or password is incorrect)/i.test(text) || details.code === 'invalid_credentials') {
    return INVALID_CREDENTIALS_ERROR
  }

  if (/(email not confirmed|email unconfirmed|confirm your email)/i.test(text) || details.code === 'email_not_confirmed') {
    return EMAIL_UNCONFIRMED_ERROR
  }

  if (/(not authorized|not allowed|access denied|forbidden|blocked|banned|suspended|disabled)/i.test(text) || details.status === 401 || details.status === 403) {
    return UNAUTHORIZED_ERROR
  }

  if (isServiceUnavailable(details)) {
    return SERVICE_UNAVAILABLE_ERROR
  }

  return UNKNOWN_ERROR
}