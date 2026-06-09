import { isAdmin, useAdminEmailConfig } from '~/utils/admin'

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()
  const adminEmail = useAdminEmailConfig()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return navigateTo('/login')
  }

  if (!isAdmin(data.user.email, adminEmail)) {
    return navigateTo('/dashboard')
  }
})
