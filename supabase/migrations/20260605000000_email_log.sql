-- =====================================================
-- email_log: audit trail for every transactional email send
-- =====================================================
--
-- Records every attempt sendEmail (lib/email/send.ts) makes - successful,
-- skipped (no API key / no recipients), or failed. Used for the 21 CFR
-- Part 11 "did the system send X notification?" question and for debugging
-- bounces with a sponsor.
--
-- Writes are performed by the server-side admin client only; no client RLS
-- exposure today. A future read policy (e.g. "company admins can see their
-- own sends") can be added as a separate migration once we surface the log
-- in the UI.

CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (
    category IN (
      'invite',
      'invite-resend',
      'report-submitted',
      'report-returned',
      'report-approved',
      'reviewer-assigned'
    )
  ),
  to_addresses TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bcc_addresses TEXT[],
  reply_to TEXT,
  subject TEXT NOT NULL,
  resend_message_id TEXT,
  idempotency_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON public.email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_category_status ON public.email_log(category, status);
CREATE INDEX IF NOT EXISTS idx_email_log_idempotency_key
  ON public.email_log(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies are defined yet.
-- All writes go through the service-role admin client in lib/email/send.ts,
-- which bypasses RLS. End users have no access.
