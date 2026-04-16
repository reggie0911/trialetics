-- Persist geocoding coordinates for CTMS site maps.
ALTER TABLE public.study_sites
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocode_status TEXT,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_study_sites_study_geo
  ON public.study_sites(study_id, latitude, longitude);
