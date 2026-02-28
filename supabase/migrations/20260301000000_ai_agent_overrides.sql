CREATE TABLE IF NOT EXISTS ai_agent_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  persona TEXT,
  task_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

ALTER TABLE ai_agent_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own agent overrides"
  ON ai_agent_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_agent_overrides_user ON ai_agent_overrides(user_id);
