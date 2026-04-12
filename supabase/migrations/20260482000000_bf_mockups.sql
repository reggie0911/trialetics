-- bf_mockups: generated study material mockup images.

CREATE TABLE bf_mockups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  mockup_type text NOT NULL,
  storage_path text NOT NULL,
  prompt text,
  custom_hint text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_mockups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_mockups_company_read" ON bf_mockups
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_mockups_company_insert" ON bf_mockups
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_mockups_company_update" ON bf_mockups
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_mockups_company_delete" ON bf_mockups
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE INDEX idx_bf_mockups_project_id ON bf_mockups(project_id);
