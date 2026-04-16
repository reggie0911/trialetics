-- =====================================================
-- 1. Fix subscriptions.plan CHECK constraint
-- =====================================================
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN (
    'independent_consultant', 'launch', 'core', 'professional', 'enterprise',
    'basic', 'pro'
  ));

-- =====================================================
-- 2. Transactions table (Stripe webhook event log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  stripe_event_type TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_company ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_event ON public.transactions(stripe_event_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Service-role inserts only (webhook handler uses admin client)

-- =====================================================
-- 3. Add subscription_status to profiles
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Separate named constraint so future migrations can drop it cleanly
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete', 'none'));
