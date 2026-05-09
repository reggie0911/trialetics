-- Subscription enforcement helpers: checkout rate limiting, onboarding, trial tracking,
-- and syncing company module flags from the subscriptions row.

-- ---------------------------------------------------------------------------
-- 1. Checkout attempt log (service role writes from Next.js API)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_checkout_attempts_user_created
  ON public.stripe_checkout_attempts (user_id, created_at DESC);

ALTER TABLE public.stripe_checkout_attempts ENABLE ROW LEVEL SECURITY;

-- No user-facing policies; API uses service role.

COMMENT ON TABLE public.stripe_checkout_attempts IS
  'Rate-limit Stripe Checkout creation per auth user (written from /api/stripe/checkout via service role).';

-- ---------------------------------------------------------------------------
-- 2. Profile / company columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_trial_used_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.stripe_trial_used_at IS
  'Set when a Stripe subscription leaves trialing for active (one self-serve trial per org policy).';

COMMENT ON COLUMN public.companies.onboarding_completed_at IS
  'First-run onboarding dismissed after successful subscription.';

-- ---------------------------------------------------------------------------
-- 3. Grandfather: companies without a subscription row get a placeholder row
--    so existing tenants keep access after enforcement ships.
-- ---------------------------------------------------------------------------
INSERT INTO public.subscriptions (company_id, plan, status, seats_included, seats_used)
SELECT c.id, 'launch', 'trialing', 10, 1
FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.company_id = c.id)
ON CONFLICT (company_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Keep company module flags aligned with paid subscription tier
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_company_modules_from_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective BOOLEAN;
  p TEXT;
BEGIN
  effective := NEW.status IN ('active', 'trialing', 'past_due')
    OR (
      NEW.status = 'cancelled'
      AND NEW.current_period_end IS NOT NULL
      AND NEW.current_period_end > NOW()
    );

  IF NOT effective THEN
    UPDATE public.companies
    SET
      has_ctms_access = FALSE,
      has_tracker_access = FALSE,
      has_etmf_access = FALSE,
      has_eisf_access = FALSE,
      has_brandforge_access = FALSE
    WHERE id = NEW.company_id;
    RETURN NEW;
  END IF;

  p := LOWER(COALESCE(NEW.plan, 'launch'));
  IF p = 'basic' THEN
    p := 'independent_consultant';
  ELSIF p = 'pro' THEN
    p := 'professional';
  END IF;

  IF p = 'independent_consultant' THEN
    UPDATE public.companies
    SET
      has_ctms_access = FALSE,
      has_tracker_access = FALSE,
      has_etmf_access = FALSE,
      has_eisf_access = FALSE,
      has_brandforge_access = FALSE
    WHERE id = NEW.company_id;
  ELSIF p = 'launch' THEN
    UPDATE public.companies
    SET
      has_ctms_access = TRUE,
      has_tracker_access = FALSE,
      has_etmf_access = FALSE,
      has_eisf_access = TRUE,
      has_brandforge_access = FALSE
    WHERE id = NEW.company_id;
  ELSIF p = 'core' THEN
    UPDATE public.companies
    SET
      has_ctms_access = TRUE,
      has_tracker_access = FALSE,
      has_etmf_access = TRUE,
      has_eisf_access = TRUE,
      has_brandforge_access = FALSE
    WHERE id = NEW.company_id;
  ELSIF p IN ('professional', 'enterprise') THEN
    UPDATE public.companies
    SET
      has_ctms_access = TRUE,
      has_tracker_access = TRUE,
      has_etmf_access = TRUE,
      has_eisf_access = TRUE,
      has_brandforge_access = TRUE
    WHERE id = NEW.company_id;
  ELSE
    UPDATE public.companies
    SET
      has_ctms_access = TRUE,
      has_tracker_access = FALSE,
      has_etmf_access = FALSE,
      has_eisf_access = TRUE,
      has_brandforge_access = FALSE
    WHERE id = NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_modules_from_subscription ON public.subscriptions;
CREATE TRIGGER trg_sync_company_modules_from_subscription
  AFTER INSERT OR UPDATE
  ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_company_modules_from_subscription();

-- One-time: align all existing companies with current subscription rows.
UPDATE public.subscriptions
SET updated_at = NOW();
