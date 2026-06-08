const ADMIN_EMAIL = 'diego05.almeida@gmail.com'

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return navigateTo('/login')
  }

  if (data.user.email.toLowerCase() !== ADMIN_EMAIL) {
    return navigateTo('/dashboard')
  }
})
