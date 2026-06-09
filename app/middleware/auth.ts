const PUBLIC_ROUTES = new Set(['/', '/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()
  const session = useSupabaseSession()
  let currentSession = session.value

  if (!currentSession) {
    const { data, error } = await supabase.auth.getSession()

    if (!error) {
      currentSession = data.session
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.has(to.path)
  let isAuthenticated = Boolean(currentSession)

  if (process.client && isAuthenticated) {
    const inactivityDaysRaw = Number(config.public.sessionInactivityDays)
    const inactivityDays = Number.isFinite(inactivityDaysRaw) && inactivityDaysRaw > 0
      ? inactivityDaysRaw
      : 7
    const inactivityLimitMs = getInactivityLimitMs(inactivityDays)

    if (isSessionInactive(inactivityLimitMs)) {
      await supabase.auth.signOut()
      clearLastActivity()
      isAuthenticated = false
      currentSession = null
    } else {
      touchLastActivity()
    }
  }

  if (!isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  if (isAuthenticated && (to.path === '/login' || to.path === '/')) {
    return navigateTo('/dashboard')
  }
})
