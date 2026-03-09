-- Add planned start/end date columns to clinical_regions
-- to support per-country date tracking in project forms.

ALTER TABLE public.clinical_regions
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE;
