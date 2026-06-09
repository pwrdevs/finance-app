import { isAdmin, useAdminEmailConfig } from '~/utils/admin'

export function useAccess() {
  const user = useSupabaseUser()
  const adminEmail = useAdminEmailConfig()

  const isAuthenticated = computed(() => Boolean(user.value?.id))
  const userEmail = computed(() => (user.value?.email || '').toLowerCase())
  const hasAdminAccess = computed(() => isAdmin(userEmail.value, adminEmail))

  return {
    isAdmin: hasAdminAccess,
    isAuthenticated,
    userEmail
  }
}
