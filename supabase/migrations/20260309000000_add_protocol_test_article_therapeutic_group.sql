-- Ensure test_article and therapeutic_group exist on clinical_protocols
-- (Required for Edit Protocol form; fixes "Could not find the 'test_article' column" error)

ALTER TABLE public.clinical_protocols
  ADD COLUMN IF NOT EXISTS test_article TEXT,
  ADD COLUMN IF NOT EXISTS therapeutic_group TEXT;
