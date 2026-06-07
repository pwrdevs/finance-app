interface ProfileBootstrapResult {
  created: boolean
  profileId: string | null
}

export function useProfile() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isEnsuringProfile = useState('profile:isEnsuringProfile', () => false)
  const profileError = useState<string | null>('profile:error', () => null)

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
    isEnsuringProfile,
    profileError
  }
}
