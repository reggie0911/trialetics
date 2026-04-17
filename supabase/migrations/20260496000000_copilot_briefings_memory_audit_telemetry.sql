-- Copilot Phase 3: Command Center, Morning Briefing, Memory, Audit, Telemetry.
--
-- Tables in this migration:
--   * copilot_briefings + copilot_briefing_items  -> daily morning briefing
--   * copilot_memory                              -> per-user/per-scope key/value
--   * copilot_audit_log                           -> append-only audit (GxP)
--   * copilot_telemetry                           -> usage events (anonymous-ish)
--
-- Notes:
--   * `copilot_audit_log` has a BEFORE UPDATE/DELETE trigger that raises an
--     exception so the row store is genuinely append-only at the database
--     layer (defense-in-depth alongside RLS).
--   * RLS uses the standard pattern in this codebase:
--       company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
--   * Every table records `agent_id` + `agent_version` so an inspector can ask
--     "what produced this six months ago?" and we can answer.

------------------------------------------------------------------------------
-- 1. copilot_briefings
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  agent_id TEXT NOT NULL DEFAULT 'briefing-curator',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS copilot_briefings_user_date_uq
  ON public.copilot_briefings (user_id, briefing_date);

CREATE INDEX IF NOT EXISTS copilot_briefings_company_idx
  ON public.copilot_briefings (company_id, briefing_date DESC);

CREATE TRIGGER copilot_briefings_set_updated_at
  BEFORE UPDATE ON public.copilot_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_briefings_select" ON public.copilot_briefings;
CREATE POLICY "copilot_briefings_select" ON public.copilot_briefings
  FOR SELECT USING (
    user_id = auth.uid()
    AND company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_briefings_insert" ON public.copilot_briefings;
CREATE POLICY "copilot_briefings_insert" ON public.copilot_briefings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_briefings_update" ON public.copilot_briefings;
CREATE POLICY "copilot_briefings_update" ON public.copilot_briefings
  FOR UPDATE USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "copilot_briefings_delete" ON public.copilot_briefings;
CREATE POLICY "copilot_briefings_delete" ON public.copilot_briefings
  FOR DELETE USING (
    user_id = auth.uid()
  );

------------------------------------------------------------------------------
-- 2. copilot_briefing_items
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_briefing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID NOT NULL REFERENCES public.copilot_briefings(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('insight', 'action', 'recommendation')),
  payload JSONB NOT NULL,
  acted_at TIMESTAMPTZ NULL,
  dismissed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_briefing_items_briefing_idx
  ON public.copilot_briefing_items (briefing_id, position);

ALTER TABLE public.copilot_briefing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_briefing_items_select" ON public.copilot_briefing_items;
CREATE POLICY "copilot_briefing_items_select" ON public.copilot_briefing_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.copilot_briefings b
      WHERE b.id = briefing_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "copilot_briefing_items_insert" ON public.copilot_briefing_items;
CREATE POLICY "copilot_briefing_items_insert" ON public.copilot_briefing_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.copilot_briefings b
      WHERE b.id = briefing_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "copilot_briefing_items_update" ON public.copilot_briefing_items;
CREATE POLICY "copilot_briefing_items_update" ON public.copilot_briefing_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.copilot_briefings b
      WHERE b.id = briefing_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "copilot_briefing_items_delete" ON public.copilot_briefing_items;
CREATE POLICY "copilot_briefing_items_delete" ON public.copilot_briefing_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.copilot_briefings b
      WHERE b.id = briefing_id AND b.user_id = auth.uid()
    )
  );

------------------------------------------------------------------------------
-- 3. copilot_memory
------------------------------------------------------------------------------
--
-- Memory is *per user* by design. Even though we record `company_id` for
-- analytics + RLS, the unique key is `(user_id, scope, key)`. Scopes are
-- arbitrary strings (`global`, `study:<id>`, `site:<id>`, ...).

CREATE TABLE IF NOT EXISTS public.copilot_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'global',
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'agent' CHECK (source IN ('agent', 'user')),
  agent_id TEXT NULL,
  agent_version TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scope, key)
);

CREATE INDEX IF NOT EXISTS copilot_memory_user_scope_idx
  ON public.copilot_memory (user_id, scope);

CREATE INDEX IF NOT EXISTS copilot_memory_company_idx
  ON public.copilot_memory (company_id);

CREATE TRIGGER copilot_memory_set_updated_at
  BEFORE UPDATE ON public.copilot_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_memory_select" ON public.copilot_memory;
CREATE POLICY "copilot_memory_select" ON public.copilot_memory
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_memory_insert" ON public.copilot_memory;
CREATE POLICY "copilot_memory_insert" ON public.copilot_memory
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_memory_update" ON public.copilot_memory;
CREATE POLICY "copilot_memory_update" ON public.copilot_memory
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_memory_delete" ON public.copilot_memory;
CREATE POLICY "copilot_memory_delete" ON public.copilot_memory
  FOR DELETE USING (user_id = auth.uid());

------------------------------------------------------------------------------
-- 4. copilot_audit_log  (append-only, GxP)
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  action TEXT NOT NULL,
  tool_name TEXT NULL,
  resource_kind TEXT NULL,
  resource_id TEXT NULL,
  reason TEXT NULL,
  details JSONB NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_audit_log_company_idx
  ON public.copilot_audit_log (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS copilot_audit_log_user_idx
  ON public.copilot_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS copilot_audit_log_agent_idx
  ON public.copilot_audit_log (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS copilot_audit_log_resource_idx
  ON public.copilot_audit_log (resource_kind, resource_id);

CREATE OR REPLACE FUNCTION public.copilot_audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'copilot_audit_log is append-only; % is not permitted', TG_OP
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS copilot_audit_log_no_update ON public.copilot_audit_log;
CREATE TRIGGER copilot_audit_log_no_update
  BEFORE UPDATE ON public.copilot_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.copilot_audit_log_append_only();

DROP TRIGGER IF EXISTS copilot_audit_log_no_delete ON public.copilot_audit_log;
CREATE TRIGGER copilot_audit_log_no_delete
  BEFORE DELETE ON public.copilot_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.copilot_audit_log_append_only();

ALTER TABLE public.copilot_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit reads are restricted to admins of the same company. Inserts must come
-- from the authenticated user themselves (server actions use this user).
DROP POLICY IF EXISTS "copilot_audit_log_select" ON public.copilot_audit_log;
CREATE POLICY "copilot_audit_log_select" ON public.copilot_audit_log
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND (p.role = 'admin' OR p.is_platform_admin = true)
      )
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "copilot_audit_log_insert" ON public.copilot_audit_log;
CREATE POLICY "copilot_audit_log_insert" ON public.copilot_audit_log
  FOR INSERT WITH CHECK (
    -- Allow either authenticated user inserts on their own behalf, or
    -- service-role inserts (auth.uid() is null when service key is in use).
    (auth.uid() IS NULL)
    OR (user_id = auth.uid())
  );

------------------------------------------------------------------------------
-- 5. copilot_telemetry
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  agent_id TEXT NULL,
  agent_version TEXT NULL,
  module TEXT NULL,
  pathname TEXT NULL,
  card_id TEXT NULL,
  duration_ms INTEGER NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_telemetry_company_idx
  ON public.copilot_telemetry (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS copilot_telemetry_event_idx
  ON public.copilot_telemetry (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS copilot_telemetry_agent_idx
  ON public.copilot_telemetry (agent_id, created_at DESC);

ALTER TABLE public.copilot_telemetry ENABLE ROW LEVEL SECURITY;

-- Telemetry is write-mostly. Users can insert their own events; reads are
-- restricted to admins (telemetry dashboard is built in Phase 5).
DROP POLICY IF EXISTS "copilot_telemetry_select" ON public.copilot_telemetry;
CREATE POLICY "copilot_telemetry_select" ON public.copilot_telemetry
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.role = 'admin' OR p.is_platform_admin = true)
    )
  );

DROP POLICY IF EXISTS "copilot_telemetry_insert" ON public.copilot_telemetry;
CREATE POLICY "copilot_telemetry_insert" ON public.copilot_telemetry
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );
