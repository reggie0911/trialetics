-- Persist per-user guided onboarding progress (admin vs standard user flows).
-- Structure in app: { "admin": { "version", "currentStepId", "completedAt", "dismissedAt", "skipAll" }, "user": { ... } }
-- RLS: existing "Users can update own profile" allows updating own row including this column.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.onboarding_state IS
  'Client-controlled JSON for dual onboarding tours (admin/user keys). Versioned in app.';
