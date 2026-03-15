-- =====================================================
-- Subscriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  seats_included INTEGER NOT NULL DEFAULT 3,
  seats_used INTEGER NOT NULL DEFAULT 1,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
  );
