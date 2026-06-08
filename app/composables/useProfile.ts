interface ProfileBootstrapResult {
  created: boolean
  profileId: string | null
}

interface ProfileData {
  fullName: string
  avatarUrl: string
}

export function useProfile() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isEnsuringProfile = useState('profile:isEnsuringProfile', () => false)
  const profileError = useState<string | null>('profile:error', () => null)
  const profileFullName = useState('profile:fullName', () => '')
  const profileAvatarUrl = useState('profile:avatarUrl', () => '')
  const isLoadingProfile = useState('profile:isLoadingProfile', () => false)

  function setProfile(profile: Partial<ProfileData>) {
    if (typeof profile.fullName === 'string') {
      profileFullName.value = profile.fullName
    }

    if (typeof profile.avatarUrl === 'string') {
      profileAvatarUrl.value = profile.avatarUrl
    }
  }

  async function resolveProfileUserId(targetUserId?: string | null) {
    if (targetUserId) {
      return targetUserId
    }

    if (user.value?.id) {
      return user.value.id
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (!sessionError && sessionData.session?.user?.id) {
      return sessionData.session.user.id
    }

    const { data, error } = await supabase.auth.getUser()

    if (!error && data.user?.id) {
      return data.user.id
    }

    return null
  }

  async function loadProfile(targetUserId = user.value?.id) {
    const resolvedUserId = await resolveProfileUserId(targetUserId)

    if (!resolvedUserId) {
      profileFullName.value = ''
      profileAvatarUrl.value = ''
      return null
    }

    isLoadingProfile.value = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', resolvedUserId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      profileFullName.value = String(data?.full_name || '')
      profileAvatarUrl.value = String(data?.avatar_url || '')

      return {
        fullName: profileFullName.value,
        avatarUrl: profileAvatarUrl.value
      }
    } finally {
      isLoadingProfile.value = false
    }
  }

  async function ensureProfile(targetUserId = user.value?.id): Promise<ProfileBootstrapResult> {
    if (!targetUserId) {
      throw new Error('Cannot ensure profile without an authenticated user.')
    }

    isEnsuringProfile.value = true
    profileError.value = null

    try {
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      if (existingProfile?.id) {
        return {
          created: false,
          profileId: existingProfile.id
        }
      }

      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: targetUserId
        })
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      return {
        created: true,
        profileId: createdProfile.id
      }
    } catch (err) {
      profileError.value = err instanceof Error ? err.message : 'Unknown profile error'
      throw err
    } finally {
      isEnsuringProfile.value = false
    }
  }

  return {
    ensureProfile,
    isLoadingProfile,
    isEnsuringProfile,
    loadProfile,
    profileAvatarUrl,
    profileError,
    profileFullName,
    setProfile
  }
}
