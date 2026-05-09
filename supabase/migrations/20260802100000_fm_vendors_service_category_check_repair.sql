-- Fix duplicate or mismatched CHECK constraints on fm_vendors.service_category.
-- If an earlier migration used DROP CONSTRAINT IF EXISTS with the wrong name, Postgres kept the
-- original inline CHECK (without clinical_site) and added a second one — inserts must satisfy both.
-- This drops every CHECK on fm_vendors that references service_category, then adds one canonical rule.

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname::text AS conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = 'fm_vendors'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%service_category%'
  LOOP
    EXECUTE format('ALTER TABLE public.fm_vendors DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.fm_vendors ADD CONSTRAINT fm_vendors_service_category_check CHECK (
  service_category IN (
    'cro',
    'data_management',
    'central_lab',
    'imaging',
    'monitoring',
    'etmf_ctms',
    'clinical_supplies',
    'clinical_site',
    'logistics',
    'irb_ethics',
    'regulatory',
    'patient_recruitment',
    'translation',
    'other'
  )
);
