export default defineNuxtRouteMiddleware(() => {
  const session = useSupabaseSession()
  const { isAdmin } = useAccess()

  if (!session.value) {
    return navigateTo('/login')
  }

  if (!isAdmin.value) {
    return navigateTo('/dashboard')
  }
})
