-- RLS DELETE policies for BrandForge child tables so ON DELETE CASCADE from bf_projects
-- succeeds when a user deletes a study brand project.

CREATE POLICY "bf_brand_inputs_company_delete" ON bf_brand_inputs
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_kits_company_delete" ON bf_brand_kits
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_exports_company_delete" ON bf_exports
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_directions_company_delete" ON bf_brand_directions
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_recruitment_kits_company_delete" ON bf_recruitment_kits
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_material_themes_company_delete" ON bf_material_themes
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_kit_versions_company_delete" ON bf_brand_kit_versions
  FOR DELETE USING (
    brand_kit_id IN (
      SELECT bk.id FROM bf_brand_kits bk
      JOIN bf_projects bp ON bp.id = bk.project_id
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_share_links_company_delete" ON bf_share_links
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );
