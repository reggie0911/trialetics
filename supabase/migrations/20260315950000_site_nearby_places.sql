ALTER TABLE public.study_sites
  ADD COLUMN IF NOT EXISTS nearest_airport_place_id TEXT,
  ADD COLUMN IF NOT EXISTS nearest_airport_name TEXT,
  ADD COLUMN IF NOT EXISTS nearest_airport_address TEXT,
  ADD COLUMN IF NOT EXISTS nearest_hotel_place_id TEXT,
  ADD COLUMN IF NOT EXISTS nearest_hotel_name TEXT,
  ADD COLUMN IF NOT EXISTS nearest_hotel_address TEXT,
  ADD COLUMN IF NOT EXISTS travel_notes TEXT;
