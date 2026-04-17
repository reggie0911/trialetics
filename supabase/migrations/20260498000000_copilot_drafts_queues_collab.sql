-- Copilot Phase 5: Drafts (versioned), Smart Work Queues, Multi-agent
-- collaboration sessions, and Personas (per-user, exportable JSON).
--
-- Tables in this migration:
--   * copilot_drafts                  -> AI-generated drafts, with status lifecycle
--   * copilot_draft_versions          -> immutable per-version snapshot + reason-for-change
--   * copilot_work_queues             -> ordered queues of items needing user attention
--   * copilot_work_queue_items        -> queue items (cards, drafts, recommendations)
--   * copilot_collab_sessions         -> a "huddle" of multiple agents on a single thread
--   * copilot_collab_messages         -> ordered turns within a session (system, agent, user)
--   * copilot_personas                -> per-user persona overrides (exportable / importable)
--
-- Conventions: UUID PKs, RLS via profiles.company_id, agent_id + agent_version
-- recorded everywhere, immutable version table (BEFORE UPDATE/DELETE triggers).

------------------------------------------------------------------------------
-- 1. copilot_drafts
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Logical kind so the UI knows how to render the draft body.
  kind TEXT NOT NULL CHECK (kind IN ('email', 'memo', 'narrative', 'report', 'document', 'message', 'other')),
  title TEXT NOT NULL,
  -- Optional scope: which study, site, subject, etc. this draft belongs to.
  scope_kind TEXT NULL,
  scope_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'signed', 'rejected', 'discarded')),
  current_version INTEGER NOT NULL DEFAULT 1,
  -- Free-form metadata: recipients, subject, tags, originating prompt, etc.
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ NULL,
  signed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_meta JSONB NULL  -- e.g. { method:'password', sha256:'...' } for 21 CFR Part 11
);

CREATE INDEX IF NOT EXISTS copilot_drafts_user_idx
  ON public.copilot_drafts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS copilot_drafts_company_status_idx
  ON public.copilot_drafts (company_id, status, updated_at DESC);

CREATE TRIGGER copilot_drafts_set_updated_at
  BEFORE UPDATE ON public.copilot_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_drafts_select" ON public.copilot_drafts;
CREATE POLICY "copilot_drafts_select" ON public.copilot_drafts
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'admin' OR p.is_platform_admin = true))
    )
  );

DROP POLICY IF EXISTS "copilot_drafts_insert" ON public.copilot_drafts;
CREATE POLICY "copilot_drafts_insert" ON public.copilot_drafts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_drafts_update" ON public.copilot_drafts;
CREATE POLICY "copilot_drafts_update" ON public.copilot_drafts
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_drafts_delete" ON public.copilot_drafts;
CREATE POLICY "copilot_drafts_delete" ON public.copilot_drafts
  FOR DELETE USING (user_id = auth.uid());

------------------------------------------------------------------------------
-- 2. copilot_draft_versions  (immutable history)
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_draft_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.copilot_drafts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  body TEXT NOT NULL,
  -- 21 CFR Part 11: every meaningful change carries a reason.
  reason TEXT NULL,
  -- Optional structured diff vs. prior version (text/JSON).
  diff JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id TEXT NULL,
  agent_version TEXT NULL,
  UNIQUE (draft_id, version)
);

CREATE INDEX IF NOT EXISTS copilot_draft_versions_draft_idx
  ON public.copilot_draft_versions (draft_id, version DESC);

ALTER TABLE public.copilot_draft_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_draft_versions_select" ON public.copilot_draft_versions;
CREATE POLICY "copilot_draft_versions_select" ON public.copilot_draft_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.copilot_drafts d
      WHERE d.id = draft_id
        AND (d.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND (p.role = 'admin' OR p.is_platform_admin = true)
            AND p.company_id = d.company_id
        ))
    )
  );

DROP POLICY IF EXISTS "copilot_draft_versions_insert" ON public.copilot_draft_versions;
CREATE POLICY "copilot_draft_versions_insert" ON public.copilot_draft_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.copilot_drafts d WHERE d.id = draft_id AND d.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.copilot_draft_versions_block_mutate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'copilot_draft_versions is append-only';
END;
$$;

DROP TRIGGER IF EXISTS copilot_draft_versions_no_update ON public.copilot_draft_versions;
CREATE TRIGGER copilot_draft_versions_no_update
  BEFORE UPDATE ON public.copilot_draft_versions
  FOR EACH ROW EXECUTE FUNCTION public.copilot_draft_versions_block_mutate();

DROP TRIGGER IF EXISTS copilot_draft_versions_no_delete ON public.copilot_draft_versions;
CREATE TRIGGER copilot_draft_versions_no_delete
  BEFORE DELETE ON public.copilot_draft_versions
  FOR EACH ROW EXECUTE FUNCTION public.copilot_draft_versions_block_mutate();

------------------------------------------------------------------------------
-- 3. copilot_work_queues
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_work_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  -- Scope of work this queue covers (e.g. 'study:<uuid>', 'role:cra', 'global').
  scope TEXT NOT NULL DEFAULT 'global',
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_work_queues_user_idx
  ON public.copilot_work_queues (user_id, scope);

CREATE TRIGGER copilot_work_queues_set_updated_at
  BEFORE UPDATE ON public.copilot_work_queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_work_queues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_work_queues_all" ON public.copilot_work_queues;
CREATE POLICY "copilot_work_queues_all" ON public.copilot_work_queues
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

------------------------------------------------------------------------------
-- 4. copilot_work_queue_items
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_work_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.copilot_work_queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL CHECK (kind IN ('action', 'insight', 'recommendation', 'draft', 'playbook_step', 'custom')),
  title TEXT NOT NULL,
  body TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  agent_id TEXT NULL,
  agent_version TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'done', 'dismissed')),
  due_at TIMESTAMPTZ NULL,
  snooze_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS copilot_work_queue_items_queue_idx
  ON public.copilot_work_queue_items (queue_id, status, position);

CREATE TRIGGER copilot_work_queue_items_set_updated_at
  BEFORE UPDATE ON public.copilot_work_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_work_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_work_queue_items_all" ON public.copilot_work_queue_items;
CREATE POLICY "copilot_work_queue_items_all" ON public.copilot_work_queue_items
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

------------------------------------------------------------------------------
-- 5. copilot_collab_sessions
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_collab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  -- The agents participating in this huddle.
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  scope_kind TEXT NULL,
  scope_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS copilot_collab_sessions_user_idx
  ON public.copilot_collab_sessions (user_id, updated_at DESC);

CREATE TRIGGER copilot_collab_sessions_set_updated_at
  BEFORE UPDATE ON public.copilot_collab_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_collab_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_collab_sessions_all" ON public.copilot_collab_sessions;
CREATE POLICY "copilot_collab_sessions_all" ON public.copilot_collab_sessions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

------------------------------------------------------------------------------
-- 6. copilot_collab_messages
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_collab_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.copilot_collab_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  speaker_kind TEXT NOT NULL CHECK (speaker_kind IN ('user', 'agent', 'coordinator', 'system')),
  speaker_id TEXT NULL, -- agent_id or user_id depending on speaker_kind
  content TEXT NOT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_collab_messages_session_idx
  ON public.copilot_collab_messages (session_id, position);

ALTER TABLE public.copilot_collab_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_collab_messages_select" ON public.copilot_collab_messages;
CREATE POLICY "copilot_collab_messages_select" ON public.copilot_collab_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.copilot_collab_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_collab_messages_insert" ON public.copilot_collab_messages;
CREATE POLICY "copilot_collab_messages_insert" ON public.copilot_collab_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.copilot_collab_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

------------------------------------------------------------------------------
-- 7. copilot_personas
------------------------------------------------------------------------------
-- Per-user persona overrides on top of an agent's default systemPrompt.
-- Intended to be exportable as JSON so a customer can codify "the way our
-- team writes briefings" and import it across users / environments.

CREATE TABLE IF NOT EXISTS public.copilot_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  -- Either targets a specific agent OR is global (NULL agent_id means default
  -- voice for all agents this user runs).
  agent_id TEXT NULL,
  -- The user-editable persona JSON; the orchestrator merges this on top of
  -- the agent's defaults.
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_personas_user_idx
  ON public.copilot_personas (user_id, agent_id, is_active);

CREATE TRIGGER copilot_personas_set_updated_at
  BEFORE UPDATE ON public.copilot_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_personas_all" ON public.copilot_personas;
CREATE POLICY "copilot_personas_all" ON public.copilot_personas
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
