-- Migration: Drop deprecated primary_directory_role_id and primary_institution_id columns
-- These columns are now derived from assignment tables:
--   - Role: First directory_role_id from directory_contact_study or directory_contact_study_site
--   - Primary Institution: directory_contact_institution where is_primary = true

-- Drop foreign key constraints first
ALTER TABLE directory_contacts
  DROP CONSTRAINT IF EXISTS directory_contacts_primary_directory_role_id_fkey;

ALTER TABLE directory_contacts
  DROP CONSTRAINT IF EXISTS directory_contacts_primary_institution_id_fkey;

-- Drop the columns
ALTER TABLE directory_contacts
  DROP COLUMN IF EXISTS primary_directory_role_id;

ALTER TABLE directory_contacts
  DROP COLUMN IF EXISTS primary_institution_id;
