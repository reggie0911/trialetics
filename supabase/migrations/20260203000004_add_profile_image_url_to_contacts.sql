-- Add profile_image_url column to contacts table
-- This column stores the URL of the contact's profile image

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.profile_image_url IS 'URL to the contact profile image stored in storage';
