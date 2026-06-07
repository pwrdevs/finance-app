-- Migration 002 fix: grant authenticated access to core tables
-- Scope: permissions only (no schema/table structure changes)

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.people TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cards TO authenticated;

COMMIT;
