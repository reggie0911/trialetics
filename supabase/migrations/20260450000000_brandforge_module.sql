-- BrandForge module: access flag, tables, storage bucket, and RLS policies.

-- 1. Module access flag on companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_brandforge_access boolean NOT NULL DEFAULT false;

-- 2. Projects table
CREATE TABLE bf_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_projects_company_read" ON bf_projects
  FOR SELECT USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_projects_company_insert" ON bf_projects
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_projects_company_update" ON bf_projects
  FOR UPDATE USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_projects_company_delete" ON bf_projects
  FOR DELETE USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

-- 3. Brand inputs table
CREATE TABLE bf_brand_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  brand_name text,
  tagline text,
  industry text,
  keywords text[] DEFAULT '{}',
  preferred_colors text[] DEFAULT '{}',
  style_preset text,
  icon_preference text,
  typography_preference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_brand_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_brand_inputs_company_read" ON bf_brand_inputs
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_inputs_company_insert" ON bf_brand_inputs
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_inputs_company_update" ON bf_brand_inputs
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 4. Logo concepts table
CREATE TABLE bf_logo_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  prompt text,
  svg_storage_path text,
  png_storage_path text,
  thumbnail_url text,
  is_favorite boolean NOT NULL DEFAULT false,
  is_selected boolean NOT NULL DEFAULT false,
  generation_metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_logo_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_logo_concepts_company_read" ON bf_logo_concepts
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_logo_concepts_company_insert" ON bf_logo_concepts
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_logo_concepts_company_update" ON bf_logo_concepts
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_logo_concepts_company_delete" ON bf_logo_concepts
  FOR DELETE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 5. Brand kits table
CREATE TABLE bf_brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  primary_logo_concept_id uuid REFERENCES bf_logo_concepts(id) ON DELETE SET NULL,
  secondary_logo_concept_id uuid REFERENCES bf_logo_concepts(id) ON DELETE SET NULL,
  icon_mark_concept_id uuid REFERENCES bf_logo_concepts(id) ON DELETE SET NULL,
  color_palette jsonb DEFAULT '[]',
  font_pairing jsonb DEFAULT '{}',
  brand_voice_summary text DEFAULT '',
  usage_guidance text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_brand_kits_company_read" ON bf_brand_kits
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_kits_company_insert" ON bf_brand_kits
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_brand_kits_company_update" ON bf_brand_kits
  FOR UPDATE USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 6. Exports table
CREATE TABLE bf_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES bf_projects(id) ON DELETE CASCADE,
  brand_kit_id uuid REFERENCES bf_brand_kits(id) ON DELETE SET NULL,
  export_type text NOT NULL CHECK (export_type IN ('svg', 'png', 'favicon', 'zip')),
  storage_path text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bf_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_exports_company_read" ON bf_exports
  FOR SELECT USING (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "bf_exports_company_insert" ON bf_exports
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT bp.id FROM bf_projects bp
      JOIN profiles p ON p.company_id = bp.company_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 7. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brandforge-assets',
  'brandforge-assets',
  false,
  52428800,
  ARRAY['image/svg+xml', 'image/png', 'application/zip', 'image/x-icon']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/svg+xml', 'image/png', 'application/zip', 'image/x-icon']::text[];

CREATE POLICY "bf_storage_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brandforge-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "bf_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brandforge-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "bf_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'brandforge-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "bf_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brandforge-assets'
    AND auth.uid() IS NOT NULL
  );

-- 8. Indexes
CREATE INDEX idx_bf_projects_company_id ON bf_projects(company_id);
CREATE INDEX idx_bf_brand_inputs_project_id ON bf_brand_inputs(project_id);
CREATE INDEX idx_bf_logo_concepts_project_id ON bf_logo_concepts(project_id);
CREATE INDEX idx_bf_brand_kits_project_id ON bf_brand_kits(project_id);
CREATE INDEX idx_bf_exports_project_id ON bf_exports(project_id);
