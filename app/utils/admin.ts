function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase()
}

export function useAdminEmailConfig() {
  const config = useRuntimeConfig()
  return normalizeEmail(String(config.public.adminEmail || ''))
}

export function isAdmin(email?: string | null, adminEmail?: string | null) {
  const normalizedAdminEmail = normalizeEmail(adminEmail)
  const normalizedEmail = normalizeEmail(email)
  return Boolean(normalizedEmail && normalizedAdminEmail && normalizedEmail === normalizedAdminEmail)
}

export function isProtectedAdminPrincipal(email?: string | null) {
  return isAdmin(email, useAdminEmailConfig())
}
