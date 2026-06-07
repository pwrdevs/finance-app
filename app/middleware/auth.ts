const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/setup'])

export default defineNuxtRouteMiddleware((to) => {
  const session = useSupabaseSession()

  const isPublicRoute = PUBLIC_ROUTES.has(to.path)
  const isAuthenticated = Boolean(session.value)

  if (!isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  if (isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/dashboard')
  }
})
