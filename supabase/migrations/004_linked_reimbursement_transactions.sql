-- Migration 004: linked reimbursement transactions
-- Adds structural link fields for paired expense/income records.

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN reimbursement_group_id uuid,
  ADD COLUMN reimbursement_role text;

ALTER TABLE public.transaction_instances
  ADD COLUMN reimbursement_group_id uuid,
  ADD COLUMN reimbursement_role text;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reimbursement_role_check
  CHECK (
    reimbursement_role IS NULL
    OR reimbursement_role IN ('original', 'reimbursement')
  );

ALTER TABLE public.transaction_instances
  ADD CONSTRAINT transaction_instances_reimbursement_role_check
  CHECK (
    reimbursement_role IS NULL
    OR reimbursement_role IN ('original', 'reimbursement')
  );

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reimbursement_pair_check
  CHECK (
    (reimbursement_group_id IS NULL AND reimbursement_role IS NULL)
    OR
    (reimbursement_group_id IS NOT NULL AND reimbursement_role IS NOT NULL)
  );

ALTER TABLE public.transaction_instances
  ADD CONSTRAINT transaction_instances_reimbursement_pair_check
  CHECK (
    (reimbursement_group_id IS NULL AND reimbursement_role IS NULL)
    OR
    (reimbursement_group_id IS NOT NULL AND reimbursement_role IS NOT NULL)
  );

CREATE INDEX idx_transactions_user_reimbursement_group_id
  ON public.transactions(user_id, reimbursement_group_id);

CREATE INDEX idx_transaction_instances_user_reimbursement_group_id
  ON public.transaction_instances(user_id, reimbursement_group_id);

COMMIT;
