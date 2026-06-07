-- Migration 003: transactions, recurrence_rules and transaction_instances
-- Scope: physical schema creation only (no execution in this step).
-- Structure prepared for future calendar-style edit flows and instance generation in application logic.

BEGIN;

CREATE TABLE public.recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency text NOT NULL,
  interval_count integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  occurrences_limit integer,
  edit_scope_default text NOT NULL DEFAULT 'series',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurrence_rules_frequency_check CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  CONSTRAINT recurrence_rules_interval_count_check CHECK (interval_count >= 1),
  CONSTRAINT recurrence_rules_end_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT recurrence_rules_occurrences_limit_check CHECK (occurrences_limit IS NULL OR occurrences_limit >= 1),
  CONSTRAINT recurrence_rules_edit_scope_default_check CHECK (edit_scope_default IN ('single', 'future', 'series'))
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  origin_type text NOT NULL,
  title text NOT NULL,
  description text,
  expected_value numeric(14,2) NOT NULL,
  real_value numeric(14,2),
  due_date date NOT NULL,
  paid_at date,
  is_checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  recurrence_rule_id uuid REFERENCES public.recurrence_rules(id) ON DELETE RESTRICT,
  installment_group_id uuid,
  installment_number integer,
  installment_total integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense')),
  CONSTRAINT transactions_origin_type_check CHECK (origin_type IN ('single', 'recurring', 'installment')),
  CONSTRAINT transactions_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT transactions_checked_at_check CHECK (
    (is_checked = false AND checked_at IS NULL)
    OR
    (is_checked = true AND checked_at IS NOT NULL)
  ),
  CONSTRAINT transactions_recurrence_rule_id_check CHECK (
    (origin_type = 'recurring' AND recurrence_rule_id IS NOT NULL)
    OR
    (origin_type <> 'recurring' AND recurrence_rule_id IS NULL)
  ),
  CONSTRAINT transactions_installment_group_check CHECK (
    (
      installment_group_id IS NULL
      AND installment_number IS NULL
      AND installment_total IS NULL
    )
    OR
    (
      installment_group_id IS NOT NULL
      AND installment_number IS NOT NULL
      AND installment_total IS NOT NULL
      AND installment_number >= 1
      AND installment_total >= 1
      AND installment_number <= installment_total
    )
  )
);

CREATE TABLE public.transaction_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurrence_rule_id uuid REFERENCES public.recurrence_rules(id) ON DELETE RESTRICT,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE RESTRICT,
  instance_date date NOT NULL,
  expected_value numeric(14,2) NOT NULL,
  real_value numeric(14,2),
  is_checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_instances_status_check CHECK (status IN ('pending', 'paid', 'skipped', 'canceled')),
  CONSTRAINT transaction_instances_checked_at_check CHECK (
    (is_checked = false AND checked_at IS NULL)
    OR
    (is_checked = true AND checked_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.transactions IS
  'MVP parent/template records. Future recurrence editing will use split recurrence_rules behavior in application logic.';

COMMENT ON TABLE public.transaction_instances IS
  'Concrete occurrences for projections and future financial views. Instance generation is handled later in application logic.';

-- updated_at triggers
CREATE TRIGGER trg_recurrence_rules_set_updated_at
BEFORE UPDATE ON public.recurrence_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transactions_set_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transaction_instances_set_updated_at
BEFORE UPDATE ON public.transaction_instances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Basic indexes and uniqueness helpers
CREATE INDEX idx_recurrence_rules_user_id ON public.recurrence_rules(user_id);
CREATE INDEX idx_recurrence_rules_user_active ON public.recurrence_rules(user_id, is_active);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_user_due_date ON public.transactions(user_id, due_date);
CREATE INDEX idx_transactions_recurrence_rule_id ON public.transactions(recurrence_rule_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);

CREATE INDEX idx_transaction_instances_user_id ON public.transaction_instances(user_id);
CREATE INDEX idx_transaction_instances_user_instance_date ON public.transaction_instances(user_id, instance_date);
CREATE INDEX idx_transaction_instances_recurrence_rule_id ON public.transaction_instances(recurrence_rule_id);
CREATE INDEX idx_transaction_instances_source_transaction_id ON public.transaction_instances(source_transaction_id);
CREATE INDEX idx_transaction_instances_account_id ON public.transaction_instances(account_id);

CREATE UNIQUE INDEX uq_transaction_instances_user_recurrence_instance_date
  ON public.transaction_instances(user_id, recurrence_rule_id, instance_date)
  WHERE recurrence_rule_id IS NOT NULL;

-- RLS enablement
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_instances ENABLE ROW LEVEL SECURITY;

-- recurrence_rules policies
CREATE POLICY recurrence_rules_select_own ON public.recurrence_rules
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY recurrence_rules_insert_own ON public.recurrence_rules
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY recurrence_rules_update_own ON public.recurrence_rules
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY recurrence_rules_delete_own ON public.recurrence_rules
  FOR DELETE USING (user_id = auth.uid());

-- transactions policies
CREATE POLICY transactions_select_own ON public.transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY transactions_insert_own ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY transactions_update_own ON public.transactions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY transactions_delete_own ON public.transactions
  FOR DELETE USING (user_id = auth.uid());

-- transaction_instances policies
CREATE POLICY transaction_instances_select_own ON public.transaction_instances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY transaction_instances_insert_own ON public.transaction_instances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY transaction_instances_update_own ON public.transaction_instances
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY transaction_instances_delete_own ON public.transaction_instances
  FOR DELETE USING (user_id = auth.uid());

-- Grants: authenticated only
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE ALL ON TABLE public.recurrence_rules FROM anon;
REVOKE ALL ON TABLE public.transactions FROM anon;
REVOKE ALL ON TABLE public.transaction_instances FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurrence_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_instances TO authenticated;

COMMIT;