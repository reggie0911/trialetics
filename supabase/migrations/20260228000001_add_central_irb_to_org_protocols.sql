ALTER TABLE public.organization_protocols
  ADD COLUMN IF NOT EXISTS central_irb_name TEXT;
