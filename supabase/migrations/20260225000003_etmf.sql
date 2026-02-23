-- eTMF (Electronic Trial Master File) Module
-- DIA TMF Reference Model structure: zones, sections, artifacts, files, completeness checks

-- =====================================================
-- 1. tmf_zones
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tmf_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  zone_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tmf_zones_company_id ON public.tmf_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_tmf_zones_sort_order ON public.tmf_zones(company_id, sort_order);

DROP TRIGGER IF EXISTS update_tmf_zones_updated_at ON public.tmf_zones;
CREATE TRIGGER update_tmf_zones_updated_at
  BEFORE UPDATE ON public.tmf_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tmf_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tmf_zones in their company"
  ON public.tmf_zones FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tmf_zones in their company"
  ON public.tmf_zones FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 2. tmf_sections
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tmf_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.tmf_zones(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  section_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tmf_sections_zone_id ON public.tmf_sections(zone_id);
CREATE INDEX IF NOT EXISTS idx_tmf_sections_company_id ON public.tmf_sections(company_id);
CREATE INDEX IF NOT EXISTS idx_tmf_sections_sort_order ON public.tmf_sections(zone_id, sort_order);

DROP TRIGGER IF EXISTS update_tmf_sections_updated_at ON public.tmf_sections;
CREATE TRIGGER update_tmf_sections_updated_at
  BEFORE UPDATE ON public.tmf_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tmf_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tmf_sections in their company"
  ON public.tmf_sections FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tmf_sections in their company"
  ON public.tmf_sections FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 3. tmf_artifacts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tmf_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.tmf_sections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  artifact_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_country_specific BOOLEAN NOT NULL DEFAULT false,
  is_site_specific BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'not_applicable')),
  responsible_role TEXT,
  target_date DATE,
  completion_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tmf_artifacts_section_id ON public.tmf_artifacts(section_id);
CREATE INDEX IF NOT EXISTS idx_tmf_artifacts_company_id ON public.tmf_artifacts(company_id);
CREATE INDEX IF NOT EXISTS idx_tmf_artifacts_protocol_id ON public.tmf_artifacts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_tmf_artifacts_status ON public.tmf_artifacts(status);

DROP TRIGGER IF EXISTS update_tmf_artifacts_updated_at ON public.tmf_artifacts;
CREATE TRIGGER update_tmf_artifacts_updated_at
  BEFORE UPDATE ON public.tmf_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tmf_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tmf_artifacts in their company"
  ON public.tmf_artifacts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tmf_artifacts in their company"
  ON public.tmf_artifacts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 4. tmf_artifact_files
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tmf_artifact_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.tmf_artifacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_upload_id UUID REFERENCES public.document_uploads(id) ON DELETE SET NULL,
  file_name TEXT,
  file_path TEXT,
  version TEXT,
  uploaded_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tmf_artifact_files_artifact_id ON public.tmf_artifact_files(artifact_id);
CREATE INDEX IF NOT EXISTS idx_tmf_artifact_files_company_id ON public.tmf_artifact_files(company_id);

DROP TRIGGER IF EXISTS update_tmf_artifact_files_updated_at ON public.tmf_artifact_files;
CREATE TRIGGER update_tmf_artifact_files_updated_at
  BEFORE UPDATE ON public.tmf_artifact_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tmf_artifact_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tmf_artifact_files in their company"
  ON public.tmf_artifact_files FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tmf_artifact_files in their company"
  ON public.tmf_artifact_files FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 5. tmf_completeness_checks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tmf_completeness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  checked_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_artifacts INTEGER NOT NULL,
  completed_artifacts INTEGER NOT NULL,
  not_applicable_artifacts INTEGER NOT NULL DEFAULT 0,
  completeness_percentage NUMERIC(5,2) NOT NULL,
  notes TEXT,
  zone_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tmf_completeness_checks_company_id ON public.tmf_completeness_checks(company_id);
CREATE INDEX IF NOT EXISTS idx_tmf_completeness_checks_protocol_id ON public.tmf_completeness_checks(protocol_id);

ALTER TABLE public.tmf_completeness_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tmf_completeness_checks in their company"
  ON public.tmf_completeness_checks FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tmf_completeness_checks in their company"
  ON public.tmf_completeness_checks FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 6. DIA TMF Reference Model seed data (Zone 1-9)
-- Only insert if no zones exist (by checking count)
-- =====================================================
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.tmf_zones) = 0 THEN
    INSERT INTO public.tmf_zones (company_id, zone_number, name, description, sort_order)
    SELECT c.id, z.zone_number, z.name, z.description, z.sort_order
    FROM public.companies c
    CROSS JOIN (VALUES
      (1, 'Trial Management', 'Documents related to trial management and oversight', 1),
      (2, 'Central Trial Documents', 'Essential trial documents held centrally', 2),
      (3, 'Regulatory', 'Regulatory submissions and correspondence', 3),
      (4, 'IRB/IEC', 'IRB/IEC approvals and correspondence', 4),
      (5, 'Site Management', 'Site selection, initiation, and management documents', 5),
      (6, 'IP and Trial Supplies', 'Investigational product and trial supplies documentation', 6),
      (7, 'Safety Reporting', 'Safety reports and pharmacovigilance documents', 7),
      (8, 'Central and Local Testing', 'Laboratory and testing documentation', 8),
      (9, 'Statistics', 'Statistical analysis plans and reports', 9)
    ) AS z(zone_number, name, description, sort_order);
  END IF;
END $$;
