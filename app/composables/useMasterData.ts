export const ACCOUNT_TYPES = ['checking', 'savings', 'wallet', 'investment', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const CATEGORY_TYPES = ['income', 'expense'] as const
export type CategoryType = (typeof CATEGORY_TYPES)[number]

export interface PersonRecord {
  id: string
  name: string
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface AccountRecord {
  id: string
  name: string
  type: AccountType
  initial_balance: number
  is_active: boolean
  created_at: string
}

export interface CategoryRecord {
  id: string
  name: string
  type: CategoryType
  color: string | null
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface CardRecord {
  id: string
  name: string
  person_id: string
  brand: string | null
  closing_day: number | null
  due_day: number | null
  credit_limit: number | null
  is_active: boolean
  created_at: string
}

export type PersonItem = PersonRecord
export type AccountItem = AccountRecord
export type CategoryItem = CategoryRecord
export type CardItem = CardRecord

interface PersonPayload {
  name: string
  notes?: string | null
  is_active?: boolean
}

interface AccountPayload {
  name: string
  type: AccountType
  initial_balance: number
  is_active?: boolean
}

interface CategoryPayload {
  name: string
  type: CategoryType
  color?: string | null
  icon?: string | null
  is_active?: boolean
}

interface CardPayload {
  name: string
  person_id: string
  brand?: string | null
  closing_day?: number | null
  due_day?: number | null
  credit_limit?: number | null
  is_active?: boolean
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function useMasterData() {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()

  function normalizeSupabaseError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return error
    }

    const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
    const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''

    if (code === '42501' && /permission denied/i.test(message)) {
      return new Error('Sessao invalida para acessar dados. Faca login novamente.')
    }

    return error
  }

  async function ensureAuthenticatedUserId() {
    const fromSession = session.value?.user?.id

    if (fromSession) {
      return fromSession
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      throw new Error(sessionError.message || 'Usuario autenticado obrigatorio para operacoes de dados mestres.')
    }

    if (sessionData.session?.user?.id) {
      return sessionData.session.user.id
    }

    const { data, error } = await supabase.auth.getUser()

    if (error) {
      throw new Error(error.message || 'Usuario autenticado obrigatorio para operacoes de dados mestres.')
    }

    if (!data.user?.id) {
      throw new Error('Sessao expirada. Faca login novamente.')
    }

    return data.user.id
  }

  async function getUserId() {
    return ensureAuthenticatedUserId()
  }

  async function listPeople() {
    await ensureAuthenticatedUserId()

    const { data, error } = await supabase
      .from('people')
      .select('id, name, notes, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw normalizeSupabaseError(error)
    }

    return (data ?? []) as PersonRecord[]
  }

  async function savePerson(payload: PersonPayload, id?: string) {
    const userId = await ensureAuthenticatedUserId()

    if (id) {
      const { error } = await supabase
        .from('people')
        .update({
          name: payload.name.trim(),
          notes: normalizeOptionalText(payload.notes),
          is_active: payload.is_active ?? true
        })
        .eq('user_id', userId)
        .eq('id', id)

      if (error) {
        throw normalizeSupabaseError(error)
      }

      return
    }

    const { error } = await supabase
      .from('people')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        notes: normalizeOptionalText(payload.notes),
        is_active: payload.is_active ?? true
      })

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function deactivatePerson(id: string) {
    const userId = await ensureAuthenticatedUserId()

    const { error } = await supabase
      .from('people')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('id', id)

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function listAccounts() {
    await ensureAuthenticatedUserId()

    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, type, initial_balance, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw normalizeSupabaseError(error)
    }

    return (data ?? []) as AccountRecord[]
  }

  async function saveAccount(payload: AccountPayload, id?: string) {
    const userId = await ensureAuthenticatedUserId()

    if (id) {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: payload.name.trim(),
          type: payload.type,
          initial_balance: payload.initial_balance,
          is_active: payload.is_active ?? true
        })
        .eq('user_id', userId)
        .eq('id', id)

      if (error) {
        throw normalizeSupabaseError(error)
      }

      return
    }

    const { error } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        type: payload.type,
        initial_balance: payload.initial_balance,
        is_active: payload.is_active ?? true
      })

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function deactivateAccount(id: string) {
    const userId = await ensureAuthenticatedUserId()

    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('id', id)

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function listCategories() {
    await ensureAuthenticatedUserId()

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type, color, icon, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw normalizeSupabaseError(error)
    }

    return (data ?? []) as CategoryRecord[]
  }

  async function saveCategory(payload: CategoryPayload, id?: string) {
    const userId = await ensureAuthenticatedUserId()

    if (id) {
      const { error } = await supabase
        .from('categories')
        .update({
          name: payload.name.trim(),
          type: payload.type,
          color: normalizeOptionalText(payload.color),
          icon: normalizeOptionalText(payload.icon),
          is_active: payload.is_active ?? true
        })
        .eq('user_id', userId)
        .eq('id', id)

      if (error) {
        throw normalizeSupabaseError(error)
      }

      return
    }

    const { error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        type: payload.type,
        color: normalizeOptionalText(payload.color),
        icon: normalizeOptionalText(payload.icon),
        is_active: payload.is_active ?? true
      })

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function deactivateCategory(id: string) {
    const userId = await ensureAuthenticatedUserId()

    const { error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('id', id)

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function listCards() {
    await ensureAuthenticatedUserId()

    const { data, error } = await supabase
      .from('cards')
      .select('id, name, person_id, brand, closing_day, due_day, credit_limit, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw normalizeSupabaseError(error)
    }

    return (data ?? []) as CardRecord[]
  }

  async function saveCard(payload: CardPayload, id?: string) {
    const userId = await ensureAuthenticatedUserId()

    if (id) {
      const { error } = await supabase
        .from('cards')
        .update({
          name: payload.name.trim(),
          person_id: payload.person_id,
          brand: normalizeOptionalText(payload.brand),
          closing_day: payload.closing_day ?? null,
          due_day: payload.due_day ?? null,
          credit_limit: payload.credit_limit ?? null,
          is_active: payload.is_active ?? true
        })
        .eq('user_id', userId)
        .eq('id', id)

      if (error) {
        throw normalizeSupabaseError(error)
      }

      return
    }

    const { error } = await supabase
      .from('cards')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        person_id: payload.person_id,
        brand: normalizeOptionalText(payload.brand),
        closing_day: payload.closing_day ?? null,
        due_day: payload.due_day ?? null,
        credit_limit: payload.credit_limit ?? null,
        is_active: payload.is_active ?? true
      })

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  async function deactivateCard(id: string) {
    const userId = await ensureAuthenticatedUserId()

    const { error } = await supabase
      .from('cards')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('id', id)

    if (error) {
      throw normalizeSupabaseError(error)
    }
  }

  return {
    deactivateAccount,
    deactivateCard,
    deactivateCategory,
    deactivatePerson,
    listAccounts,
    listCards,
    listCategories,
    listPeople,
    saveAccount,
    saveCard,
    saveCategory,
    savePerson,
    upsertAccount: saveAccount,
    upsertCard: saveCard,
    upsertCategory: saveCategory,
    upsertPerson: savePerson
  }
}
