-- Optional mailing address on directory contacts + manual vs linked study site address.

ALTER TABLE public.directory_contacts
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.directory_contacts
  ADD COLUMN IF NOT EXISTS contact_address_source text DEFAULT 'manual';

UPDATE public.directory_contacts
SET contact_address_source = 'manual'
WHERE contact_address_source IS NULL;

ALTER TABLE public.directory_contacts
  ALTER COLUMN contact_address_source SET NOT NULL,
  ALTER COLUMN contact_address_source SET DEFAULT 'manual';

ALTER TABLE public.directory_contacts
  DROP CONSTRAINT IF EXISTS directory_contacts_contact_address_source_check;

ALTER TABLE public.directory_contacts
  ADD CONSTRAINT directory_contacts_contact_address_source_check
  CHECK (contact_address_source IN ('manual', 'site'));

ALTER TABLE public.directory_contacts
  ADD COLUMN IF NOT EXISTS contact_address_study_site_id uuid REFERENCES public.study_sites (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_directory_contacts_address_study_site
  ON public.directory_contacts (contact_address_study_site_id)
  WHERE contact_address_study_site_id IS NOT NULL;
