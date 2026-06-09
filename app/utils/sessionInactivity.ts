const STORAGE_KEY = 'finance:last-active-at'

export function getInactivityLimitMs(days: number) {
  return days * 24 * 60 * 60 * 1000
}

export function getLastActivityAt() {
  if (!process.client) {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function touchLastActivity(now = Date.now()) {
  if (!process.client) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, String(now))
}

export function clearLastActivity() {
  if (!process.client) {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export function isSessionInactive(limitMs: number, now = Date.now()) {
  const lastActivityAt = getLastActivityAt()

  if (!lastActivityAt) {
    return false
  }

  return now - lastActivityAt > limitMs
}
