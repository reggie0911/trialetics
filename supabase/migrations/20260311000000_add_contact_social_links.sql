-- Add social media URL columns to contacts table
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS x_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS substack_url TEXT;

COMMENT ON COLUMN public.contacts.youtube_url IS 'YouTube channel or video URL';
COMMENT ON COLUMN public.contacts.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.contacts.x_url IS 'X (Twitter) profile URL';
COMMENT ON COLUMN public.contacts.facebook_url IS 'Facebook profile or page URL';
COMMENT ON COLUMN public.contacts.substack_url IS 'Substack newsletter URL';
