-- Add deactivated_at column to profiles for tracking when a user was deactivated
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.deactivated_at IS 'When the user was deactivated; NULL if active';
