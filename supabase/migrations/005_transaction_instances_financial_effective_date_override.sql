-- Migration 005: manual financial effective date override for transaction instances
-- Adds a nullable override used to move a transaction to the next card invoice manually.

BEGIN;

ALTER TABLE public.transaction_instances
  ADD COLUMN financial_effective_date_override date;

COMMENT ON COLUMN public.transaction_instances.financial_effective_date_override IS
  'Manual financial competence override for card invoice adjustments.';

COMMIT;