export interface FriendlyRequestError {
  title: string
  message: string
}

interface ErrorDetails {
  message: string
  code: string
  name: string
  status: number | null
}

const SERVICE_UNAVAILABLE_ERROR: FriendlyRequestError = {
  title: 'Servidor temporariamente indisponível',
  message: 'Não foi possível conectar ao sistema. O banco de dados pode estar pausado ou em manutenção. Aguarde alguns minutos e tente novamente.'
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
    message: typeof raw.message === 'string' ? raw.message : '',
    code: typeof raw.code === 'string' ? raw.code : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    status: typeof raw.status === 'number' ? raw.status : null
  }
}

function isServiceUnavailable(details: ErrorDetails) {
  if (details.status === 502 || details.status === 503 || details.status === 504) {
    return true
  }

  const text = `${details.message} ${details.code} ${details.name}`.toLowerCase()

  return /(load failed|failed to fetch|networkerror|network request failed|fetch failed|timeout|timed out)/i.test(text)
}

function getSafeMessage(error: unknown, fallbackMessage: string) {
  if (!error || typeof error !== 'object') {
    return fallbackMessage
  }

  const raw = error as Record<string, unknown>
  const message = typeof raw.message === 'string' ? raw.message.trim() : ''

  if (!message) {
    return fallbackMessage
  }

  if (/(load failed|failed to fetch|networkerror|network request failed|fetch failed|timeout|timed out)/i.test(message)) {
    return fallbackMessage
  }

  return message
}

export function getFriendlyRequestError(
  error: unknown,
  fallbackTitle: string,
  fallbackMessage: string
): FriendlyRequestError {
  const details = extractErrorDetails(error)

  if (isServiceUnavailable(details)) {
    return SERVICE_UNAVAILABLE_ERROR
  }

  return {
    title: fallbackTitle,
    message: getSafeMessage(error, fallbackMessage)
  }
}