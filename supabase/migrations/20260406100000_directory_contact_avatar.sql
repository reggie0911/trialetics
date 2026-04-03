-- Optional profile image URL for directory contacts.
-- Images use the public `avatars` bucket: directory-contacts/{company_id}/{filename}
-- Apply migration 20260406200000_avatars_directory_contacts_storage_rls.sql for Storage RLS (required for uploads).

ALTER TABLE public.directory_contacts
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.directory_contacts.avatar_url IS 'Public URL for contact profile photo (optional).';
