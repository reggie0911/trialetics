ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS notes TEXT;
