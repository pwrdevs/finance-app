-- Migration 001: Initial core tables (profiles, accounts, people, cards, categories)
-- Scope: physical schema creation only (no execution in this step).
-- MVP multi-tenant decision: use standard foreign keys + RLS by user_id.
-- cards.person_id -> people.id tenant ownership consistency is protected by RLS in MVP.
-- Future hardening may adopt trigger/composite FK if needed.
-- This migration assumes Supabase standard grants/default privileges for anon/authenticated roles.
-- Future service-role operations must validate user_id in backend flows when writing cross-table references such as cards.person_id.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared trigger function for updated_at maintenance.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  default_currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT people_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  initial_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT accounts_type_check CHECK (type IN ('checking', 'savings', 'wallet', 'investment', 'other'))
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  color text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense'))
);

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  brand text,
  closing_day smallint,
  due_day smallint,
  credit_limit numeric(14,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cards_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT cards_closing_day_check CHECK (closing_day IS NULL OR (closing_day BETWEEN 1 AND 31)),
  CONSTRAINT cards_due_day_check CHECK (due_day IS NULL OR (due_day BETWEEN 1 AND 31)),
  CONSTRAINT cards_credit_limit_non_negative CHECK (credit_limit IS NULL OR credit_limit >= 0)
);

COMMENT ON COLUMN public.cards.person_id IS
  'MVP: FK to people.id. Tenant ownership consistency between cards.user_id and people.user_id is enforced by RLS (user_id = auth.uid()). Future trigger/composite FK hardening may be evaluated.';

-- updated_at triggers
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_people_set_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_accounts_set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cards_set_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Basic indexes and uniqueness helpers
CREATE INDEX idx_people_user_id ON public.people(user_id);
CREATE INDEX idx_people_user_active ON public.people(user_id, is_active);
CREATE UNIQUE INDEX uq_people_user_name_norm ON public.people(user_id, lower(name));

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_user_active ON public.accounts(user_id, is_active);
CREATE UNIQUE INDEX uq_accounts_user_name_norm ON public.accounts(user_id, lower(name));

CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_user_active ON public.categories(user_id, is_active);
CREATE UNIQUE INDEX uq_categories_user_type_name_norm ON public.categories(user_id, type, lower(name));

CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_cards_person_id ON public.cards(person_id);
CREATE INDEX idx_cards_user_active ON public.cards(user_id, is_active);
CREATE UNIQUE INDEX uq_cards_user_person_name_norm ON public.cards(user_id, person_id, lower(name));

-- RLS enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING (user_id = auth.uid());

-- people policies
CREATE POLICY people_select_own ON public.people
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY people_insert_own ON public.people
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY people_update_own ON public.people
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY people_delete_own ON public.people
  FOR DELETE USING (user_id = auth.uid());

-- accounts policies
CREATE POLICY accounts_select_own ON public.accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY accounts_insert_own ON public.accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY accounts_update_own ON public.accounts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY accounts_delete_own ON public.accounts
  FOR DELETE USING (user_id = auth.uid());

-- categories policies
CREATE POLICY categories_select_own ON public.categories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY categories_insert_own ON public.categories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_update_own ON public.categories
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_delete_own ON public.categories
  FOR DELETE USING (user_id = auth.uid());

-- cards policies
CREATE POLICY cards_select_own ON public.cards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY cards_insert_own ON public.cards
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY cards_update_own ON public.cards
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY cards_delete_own ON public.cards
  FOR DELETE USING (user_id = auth.uid());

COMMIT;