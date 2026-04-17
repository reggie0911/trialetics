-- Short / display name for a study (distinct from full protocol title).
ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS study_name TEXT;

COMMENT ON COLUMN public.studies.study_name IS 'Short or display name; full official title remains in title.';
