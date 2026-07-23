import type { FriendlyAuthError } from '~/utils/authError'
import { getFriendlyAuthError } from '~/utils/authError'

interface AuthCredentials {
  email: string
  password: string
}

interface RegisterResult {
  needsEmailConfirmation: boolean
}

export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const session = useSupabaseSession()

  const isSubmitting = useState('auth:isSubmitting', () => false)
  const authError = useState<string | null>('auth:error', () => null)
  const authMessage = useState<string | null>('auth:message', () => null)
  const authLoginError = useState<FriendlyAuthError | null>('auth:loginError', () => null)
  const listenerInitialized = useState('auth:listenerInitialized', () => false)

  const { ensureProfile } = useProfile()

  const sessionStatus = computed(() => (session.value ? 'authenticated' : 'anonymous'))
  const authUid = computed(() => user.value?.id ?? null)
  const authEmail = computed(() => user.value?.email ?? null)

  async function ensureProfileIfAuthenticated(targetUserId?: string) {
    const currentUserId = targetUserId ?? user.value?.id

    if (!currentUserId) {
      return
    }

    try {
      await ensureProfile(currentUserId)
    } catch {
      // Profile bootstrap errors should not block auth flow.
    }
  }

  function initAuthListener() {
    if (listenerInitialized.value) {
      return
    }

    listenerInitialized.value = true

    if (user.value?.id) {
      void ensureProfileIfAuthenticated(user.value.id)
    }

    supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (currentSession?.user?.id) {
          void ensureProfileIfAuthenticated(currentSession.user.id)
        }
      }
    })
  }

  async function register(credentials: AuthCredentials): Promise<RegisterResult> {
    isSubmitting.value = true
    authError.value = null
    authMessage.value = null
    authLoginError.value = null

    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password
      })

      if (error) {
        throw error
      }

      if (data.session?.user?.id) {
        await ensureProfileIfAuthenticated(data.session.user.id)
      }

      const needsEmailConfirmation = !data.session

      authMessage.value = needsEmailConfirmation
        ? 'Account created. Check your email to confirm your account before logging in.'
        : 'Account created and authenticated successfully.'

      return { needsEmailConfirmation }
    } catch (err) {
      authError.value = err instanceof Error ? err.message : 'Unknown sign up error'
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  async function login(credentials: AuthCredentials) {
    isSubmitting.value = true
    authError.value = null
    authMessage.value = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) {
        throw error
      }

      if (data.user?.id) {
        await ensureProfileIfAuthenticated(data.user.id)
      }

      authLoginError.value = null
      touchLastActivity()

      authMessage.value = 'Logged in successfully.'
    } catch (err) {
      const friendlyError = getFriendlyAuthError(err)

      authLoginError.value = friendlyError
      authError.value = friendlyError.message
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  async function logout() {
    isSubmitting.value = true
    authError.value = null
    authMessage.value = null
    authLoginError.value = null

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      clearLastActivity()
      authMessage.value = 'Logged out successfully.'
      await navigateTo('/login')
    } catch (err) {
      authError.value = err instanceof Error ? err.message : 'Unknown logout error'
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    authEmail,
    authError,
    authLoginError,
    authMessage,
    authUid,
    initAuthListener,
    isSubmitting,
    login,
    logout,
    register,
    session,
    sessionStatus,
    user
  }
}
