-- Add onboarding tracking to profiles
-- NULL = onboarding not completed, non-null = completed at that timestamp

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'When the admin completed the onboarding wizard; NULL means not yet completed';
