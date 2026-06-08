const PUBLIC_ROUTES = new Set(['/', '/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  let currentSession = session.value

  if (!currentSession) {
    const { data, error } = await supabase.auth.getSession()

    if (!error) {
      currentSession = data.session
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.has(to.path)
  const isAuthenticated = Boolean(currentSession)

  if (!isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  if (isAuthenticated && (to.path === '/login' || to.path === '/')) {
    return navigateTo('/dashboard')
  }
})
