const ADMIN_EMAILS = ['diego05.almeida@gmail.com']

export function useAccess() {
  const user = useSupabaseUser()

  const isAuthenticated = computed(() => Boolean(user.value?.id))
  const userEmail = computed(() => (user.value?.email || '').toLowerCase())
  const isAdmin = computed(() => ADMIN_EMAILS.includes(userEmail.value))

  return {
    isAdmin,
    isAuthenticated,
    userEmail
  }
}
