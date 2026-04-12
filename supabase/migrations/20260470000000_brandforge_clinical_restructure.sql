-- BrandForge Clinical Restructure: expand bf_brand_inputs with clinical trial
-- fields and add new tables for brand directions, recruitment kits, material
-- themes, version history, and share links.

-----------------------------------------------------------------------
-- 1. Extend bf_brand_inputs with clinical trial columns
-----------------------------------------------------------------------

-- Study basics
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS study_name text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS protocol_number text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS sponsor text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS cro text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS phase text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS trial_type text;

-- Medical context
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS therapeutic_area text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS indication text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS patient_population text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS device_or_drug text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS severity text;
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS countries text[] DEFAULT '{}';

-- Communication goals
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS communication_goals text[] DEFAULT '{}';
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{}';
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS is_patient_facing boolean DEFAULT false;

-- Brand direction
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS brand_direction text[] DEFAULT '{}';
ALTER TABLE bf_brand_inputs ADD COLUMN IF NOT EXISTS visual_preference text;

-----------------------------------------------------------------------
-- 2. bf_brand_directions – AI-generated brand strategy output
-----------------------------------------------------------------------

CREATE TABLE bf_brand_directions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  mood text,
  visual_direction text,
  color_palette jsonb DEFAULT '[]',
  typography_recommendations jsonb DEFAULT '{}',
  icon_style text,
  imagery_direction text,
  logo_directions jsonb DEFAULT '[]',
  tagline_options text[] DEFAULT '{}',
  patient_communication_style text,
  tone_variants jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_brand_directions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_brand_directions_company_read" ON bf_brand_directions
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_directions_company_insert" ON bf_brand_directions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_directions_company_update" ON bf_brand_directions
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE INDEX idx_bf_brand_directions_project_id ON bf_brand_directions(project_id);

-----------------------------------------------------------------------
-- 3. bf_recruitment_kits – recruitment creative kit data
-----------------------------------------------------------------------

CREATE TABLE bf_recruitment_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  campaign_palette jsonb DEFAULT '[]',
  headline_styles jsonb DEFAULT '[]',
  brochure_tone text,
  social_ad_direction text,
  diversity_imagery_guidance text,
  cta_styles jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_recruitment_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_recruitment_kits_company_read" ON bf_recruitment_kits
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_recruitment_kits_company_insert" ON bf_recruitment_kits
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_recruitment_kits_company_update" ON bf_recruitment_kits
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE INDEX idx_bf_recruitment_kits_project_id ON bf_recruitment_kits(project_id);

-----------------------------------------------------------------------
-- 4. bf_material_themes – trial materials theme builder output
-----------------------------------------------------------------------

CREATE TABLE bf_material_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  siv_deck_styling jsonb DEFAULT '{}',
  monitoring_visit_styling jsonb DEFAULT '{}',
  newsletter_styling jsonb DEFAULT '{}',
  training_manual_styling jsonb DEFAULT '{}',
  powerpoint_theme jsonb DEFAULT '{}',
  pdf_styling jsonb DEFAULT '{}',
  one_pager_layout jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_material_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_material_themes_company_read" ON bf_material_themes
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_material_themes_company_insert" ON bf_material_themes
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_material_themes_company_update" ON bf_material_themes
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE INDEX idx_bf_material_themes_project_id ON bf_material_themes(project_id);

-----------------------------------------------------------------------
-- 5. bf_brand_kit_versions – version history for brand kits
-----------------------------------------------------------------------

CREATE TABLE bf_brand_kit_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL REFERENCES bf_brand_kits(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_brand_kit_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_brand_kit_versions_company_read" ON bf_brand_kit_versions
  FOR SELECT USING (
    brand_kit_id IN (
      SELECT bk.id FROM bf_brand_kits bk
      JOIN bf_projects bp ON bp.id = bk.project_id
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_kit_versions_company_insert" ON bf_brand_kit_versions
  FOR INSERT WITH CHECK (
    brand_kit_id IN (
      SELECT bk.id FROM bf_brand_kits bk
      JOIN bf_projects bp ON bp.id = bk.project_id
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE INDEX idx_bf_brand_kit_versions_kit_id ON bf_brand_kit_versions(brand_kit_id);

-----------------------------------------------------------------------
-- 6. bf_share_links – read-only share tokens for external review
-----------------------------------------------------------------------

CREATE TABLE bf_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_share_links_company_read" ON bf_share_links
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_share_links_company_insert" ON bf_share_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_share_links_company_update" ON bf_share_links
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_share_links_public_read" ON bf_share_links
  FOR SELECT USING (
    revoked = false AND expires_at > now()
  );

CREATE INDEX idx_bf_share_links_project_id ON bf_share_links(project_id);
CREATE INDEX idx_bf_share_links_token ON bf_share_links(token);
