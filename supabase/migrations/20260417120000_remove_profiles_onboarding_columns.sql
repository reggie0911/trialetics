-- Retire guided onboarding: drop columns no longer used by the app.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS onboarding_state,
  DROP COLUMN IF EXISTS onboarding_completed_at;
