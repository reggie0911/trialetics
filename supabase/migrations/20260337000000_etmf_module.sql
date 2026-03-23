-- =====================================================
-- eTMF Module: Tables, RLS, Indexes, Storage, RPCs
-- CDISC TMF Reference Model v3.3.1 Compliant
-- =====================================================

-- =====================================================
-- 1. TMF Reference Model (immutable seed data)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tmf_reference_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_number INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  section_number TEXT NOT NULL,
  section_name TEXT NOT NULL,
  artifact_number TEXT NOT NULL,
  artifact_name TEXT NOT NULL,
  definition_purpose TEXT,
  recommended_sub_artifact TEXT,
  core_or_recommended TEXT CHECK (core_or_recommended IN ('Core', 'Recommended', 'Core ', NULL)),
  ich_code BOOLEAN DEFAULT false,
  iso_14155 BOOLEAN DEFAULT false,
  trial_level_document BOOLEAN DEFAULT false,
  trial_level_milestone TEXT,
  country_level_document BOOLEAN DEFAULT false,
  country_level_milestone TEXT,
  site_level_document BOOLEAN DEFAULT false,
  dating_convention TEXT,
  process_number INTEGER,
  process_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tmf_ref_zone ON public.tmf_reference_model(zone_number);
CREATE INDEX IF NOT EXISTS idx_tmf_ref_section ON public.tmf_reference_model(section_number);
CREATE INDEX IF NOT EXISTS idx_tmf_ref_artifact ON public.tmf_reference_model(artifact_number);

-- TMF Reference is read-only for all authenticated users (no company scope)
ALTER TABLE public.tmf_reference_model ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tmf_reference_model_select" ON public.tmf_reference_model
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. Expected Document List (EDL) - per study
-- =====================================================
CREATE TABLE IF NOT EXISTS public.etmf_expected_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  tmf_ref_id UUID NOT NULL REFERENCES public.tmf_reference_model(id) ON DELETE CASCADE,
  edl_yes BOOLEAN NOT NULL DEFAULT true,
  site_level_yes BOOLEAN NOT NULL DEFAULT false,
  country_level_yes BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_id, tmf_ref_id)
);

CREATE INDEX IF NOT EXISTS idx_etmf_edl_company ON public.etmf_expected_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_etmf_edl_study ON public.etmf_expected_documents(study_id);
CREATE INDEX IF NOT EXISTS idx_etmf_edl_tmf_ref ON public.etmf_expected_documents(tmf_ref_id);

CREATE TRIGGER update_etmf_expected_documents_updated_at
  BEFORE UPDATE ON public.etmf_expected_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.etmf_expected_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etmf_edl_select" ON public.etmf_expected_documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_edl_insert" ON public.etmf_expected_documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_edl_update" ON public.etmf_expected_documents
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_edl_delete" ON public.etmf_expected_documents
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- 3. Staff Expected Document List - per site, per role
-- =====================================================
CREATE TABLE IF NOT EXISTS public.etmf_staff_expected_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  tmf_ref_id UUID NOT NULL REFERENCES public.tmf_reference_model(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, tmf_ref_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_etmf_staff_edl_company ON public.etmf_staff_expected_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_etmf_staff_edl_study ON public.etmf_staff_expected_documents(study_id);
CREATE INDEX IF NOT EXISTS idx_etmf_staff_edl_site ON public.etmf_staff_expected_documents(site_id);
CREATE INDEX IF NOT EXISTS idx_etmf_staff_edl_tmf_ref ON public.etmf_staff_expected_documents(tmf_ref_id);
CREATE INDEX IF NOT EXISTS idx_etmf_staff_edl_role ON public.etmf_staff_expected_documents(role_name);

CREATE TRIGGER update_etmf_staff_expected_documents_updated_at
  BEFORE UPDATE ON public.etmf_staff_expected_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.etmf_staff_expected_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etmf_staff_edl_select" ON public.etmf_staff_expected_documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_staff_edl_insert" ON public.etmf_staff_expected_documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_staff_edl_update" ON public.etmf_staff_expected_documents
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_staff_edl_delete" ON public.etmf_staff_expected_documents
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. eTMF Documents
-- =====================================================
CREATE TYPE etmf_document_status AS ENUM ('placeholder', 'qc_review', 'rejected', 'approved');

CREATE TABLE IF NOT EXISTS public.etmf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  study_country_id UUID REFERENCES public.study_countries(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  staff_member_id UUID REFERENCES public.study_team_members(id) ON DELETE SET NULL,
  tmf_ref_id UUID REFERENCES public.tmf_reference_model(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_status etmf_document_status NOT NULL DEFAULT 'placeholder',
  storage_path TEXT,
  file_name TEXT,
  file_format TEXT,
  file_size_bytes BIGINT,
  version TEXT,
  version_type TEXT,
  language TEXT DEFAULT 'English',
  document_date DATE,
  document_signed_date DATE,
  approval_date DATE,
  expiration_date DATE,
  version_date DATE,
  submitter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  qc_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  qc_review_date DATE,
  rejection_reason TEXT,
  initial_submission_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etmf_docs_company ON public.etmf_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_etmf_docs_study ON public.etmf_documents(study_id);
CREATE INDEX IF NOT EXISTS idx_etmf_docs_country ON public.etmf_documents(study_country_id);
CREATE INDEX IF NOT EXISTS idx_etmf_docs_site ON public.etmf_documents(site_id);
CREATE INDEX IF NOT EXISTS idx_etmf_docs_staff ON public.etmf_documents(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_etmf_docs_tmf_ref ON public.etmf_documents(tmf_ref_id);
CREATE INDEX IF NOT EXISTS idx_etmf_docs_status ON public.etmf_documents(document_status);

CREATE TRIGGER update_etmf_documents_updated_at
  BEFORE UPDATE ON public.etmf_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.etmf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etmf_docs_select" ON public.etmf_documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_docs_insert" ON public.etmf_documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_docs_update" ON public.etmf_documents
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_docs_delete" ON public.etmf_documents
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. eTMF Audit Log
-- =====================================================
CREATE TABLE IF NOT EXISTS public.etmf_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  etmf_document_id UUID NOT NULL REFERENCES public.etmf_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('upload', 'edit', 'status_change', 'delete')),
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etmf_audit_company ON public.etmf_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_etmf_audit_document ON public.etmf_audit_log(etmf_document_id);
CREATE INDEX IF NOT EXISTS idx_etmf_audit_action ON public.etmf_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_etmf_audit_performed_at ON public.etmf_audit_log(performed_at);

ALTER TABLE public.etmf_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etmf_audit_select" ON public.etmf_audit_log
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "etmf_audit_insert" ON public.etmf_audit_log
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- 6. Storage Bucket: etmf-documents
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'etmf-documents',
  'etmf-documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for etmf-documents bucket
CREATE POLICY "etmf_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'etmf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "etmf_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'etmf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "etmf_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'etmf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "etmf_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'etmf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. RPCs: Overview Stats & Completeness
-- =====================================================

-- Get overview stats for a study (aggregated by country/site/staff)
CREATE OR REPLACE FUNCTION public.etmf_get_overview_stats(p_study_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_result JSONB;
BEGIN
  -- Verify access
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.studies
    WHERE id = p_study_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied or study not found';
  END IF;

  SELECT jsonb_build_object(
    'total_documents', (
      SELECT COUNT(*) FROM public.etmf_documents WHERE study_id = p_study_id
    ),
    'placeholders', (
      SELECT COUNT(*) FROM public.etmf_documents WHERE study_id = p_study_id AND document_status = 'placeholder'
    ),
    'qc_review', (
      SELECT COUNT(*) FROM public.etmf_documents WHERE study_id = p_study_id AND document_status = 'qc_review'
    ),
    'rejected', (
      SELECT COUNT(*) FROM public.etmf_documents WHERE study_id = p_study_id AND document_status = 'rejected'
    ),
    'approved', (
      SELECT COUNT(*) FROM public.etmf_documents WHERE study_id = p_study_id AND document_status = 'approved'
    ),
    'countries', (
      SELECT COALESCE(jsonb_agg(country_data ORDER BY country_data->>'country_name'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'country_id', sc.id,
          'country_name', sc.country_name,
          'country_code', sc.country_code,
          'total_documents', COALESCE(doc_counts.total, 0),
          'placeholders', COALESCE(doc_counts.placeholders, 0),
          'qc_review', COALESCE(doc_counts.qc_review, 0),
          'rejected', COALESCE(doc_counts.rejected, 0),
          'approved', COALESCE(doc_counts.approved, 0),
          'completeness_pct', CASE
            WHEN COALESCE(doc_counts.total, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(doc_counts.approved, 0)::numeric / doc_counts.total::numeric) * 100, 1)
          END,
          'sites', (
            SELECT COALESCE(jsonb_agg(site_data ORDER BY site_data->>'site_name'), '[]'::jsonb)
            FROM (
              SELECT jsonb_build_object(
                'site_id', ss.id,
                'site_name', ss.name,
                'site_number', ss.site_number,
                'total_documents', COALESCE(site_doc_counts.total, 0),
                'placeholders', COALESCE(site_doc_counts.placeholders, 0),
                'qc_review', COALESCE(site_doc_counts.qc_review, 0),
                'rejected', COALESCE(site_doc_counts.rejected, 0),
                'approved', COALESCE(site_doc_counts.approved, 0),
                'completeness_pct', CASE
                  WHEN COALESCE(site_doc_counts.total, 0) = 0 THEN 0
                  ELSE ROUND((COALESCE(site_doc_counts.approved, 0)::numeric / site_doc_counts.total::numeric) * 100, 1)
                END,
                'staff_members', (
                  SELECT COALESCE(jsonb_agg(staff_data ORDER BY staff_data->>'staff_name'), '[]'::jsonb)
                  FROM (
                    SELECT jsonb_build_object(
                      'staff_member_id', stm.id,
                      'staff_name', COALESCE(p.first_name || ' ' || p.last_name, p.email),
                      'role', stm.role,
                      'total_documents', COALESCE(staff_doc_counts.total, 0),
                      'placeholders', COALESCE(staff_doc_counts.placeholders, 0),
                      'qc_review', COALESCE(staff_doc_counts.qc_review, 0),
                      'rejected', COALESCE(staff_doc_counts.rejected, 0),
                      'approved', COALESCE(staff_doc_counts.approved, 0),
                      'completeness_pct', CASE
                        WHEN COALESCE(staff_doc_counts.total, 0) = 0 THEN 0
                        ELSE ROUND((COALESCE(staff_doc_counts.approved, 0)::numeric / staff_doc_counts.total::numeric) * 100, 1)
                      END
                    ) AS staff_data
                    FROM public.study_team_members stm
                    JOIN public.profiles p ON p.id = stm.profile_id
                    LEFT JOIN LATERAL (
                      SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE document_status = 'placeholder') AS placeholders,
                        COUNT(*) FILTER (WHERE document_status = 'qc_review') AS qc_review,
                        COUNT(*) FILTER (WHERE document_status = 'rejected') AS rejected,
                        COUNT(*) FILTER (WHERE document_status = 'approved') AS approved
                      FROM public.etmf_documents
                      WHERE staff_member_id = stm.id
                    ) staff_doc_counts ON true
                    WHERE stm.site_id = ss.id AND stm.is_active = true
                  ) staff_sub
                )
              ) AS site_data
              FROM public.study_sites ss
              LEFT JOIN LATERAL (
                SELECT
                  COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE document_status = 'placeholder') AS placeholders,
                  COUNT(*) FILTER (WHERE document_status = 'qc_review') AS qc_review,
                  COUNT(*) FILTER (WHERE document_status = 'rejected') AS rejected,
                  COUNT(*) FILTER (WHERE document_status = 'approved') AS approved
                FROM public.etmf_documents
                WHERE site_id = ss.id
              ) site_doc_counts ON true
              WHERE ss.study_country_id = sc.id
            ) site_sub
          )
        ) AS country_data
        FROM public.study_countries sc
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE document_status = 'placeholder') AS placeholders,
            COUNT(*) FILTER (WHERE document_status = 'qc_review') AS qc_review,
            COUNT(*) FILTER (WHERE document_status = 'rejected') AS rejected,
            COUNT(*) FILTER (WHERE document_status = 'approved') AS approved
          FROM public.etmf_documents
          WHERE study_country_id = sc.id
        ) doc_counts ON true
        WHERE sc.study_id = p_study_id
      ) country_sub
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Generate placeholder documents from EDL for a site
CREATE OR REPLACE FUNCTION public.etmf_generate_placeholders(
  p_study_id UUID,
  p_site_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_study_country_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Verify access
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.studies
    WHERE id = p_study_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied or study not found';
  END IF;

  -- Get the country for this site
  SELECT study_country_id INTO v_study_country_id
  FROM public.study_sites
  WHERE id = p_site_id;

  -- Insert placeholder documents for EDL items that don't already exist
  INSERT INTO public.etmf_documents (
    company_id, study_id, study_country_id, site_id, tmf_ref_id, document_name, document_status
  )
  SELECT
    v_company_id,
    p_study_id,
    v_study_country_id,
    p_site_id,
    edl.tmf_ref_id,
    tmf.recommended_sub_artifact,
    'placeholder'::etmf_document_status
  FROM public.etmf_expected_documents edl
  JOIN public.tmf_reference_model tmf ON tmf.id = edl.tmf_ref_id
  WHERE edl.study_id = p_study_id
    AND edl.site_level_yes = true
    AND NOT EXISTS (
      SELECT 1 FROM public.etmf_documents d
      WHERE d.study_id = p_study_id
        AND d.site_id = p_site_id
        AND d.tmf_ref_id = edl.tmf_ref_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Generate placeholder documents for a staff member from Staff EDL
CREATE OR REPLACE FUNCTION public.etmf_generate_staff_placeholders(
  p_study_id UUID,
  p_site_id UUID,
  p_staff_member_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_study_country_id UUID;
  v_role_name TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Verify access
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.studies
    WHERE id = p_study_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied or study not found';
  END IF;

  -- Get the country for this site
  SELECT study_country_id INTO v_study_country_id
  FROM public.study_sites
  WHERE id = p_site_id;

  -- Get the role for this staff member
  SELECT role INTO v_role_name
  FROM public.study_team_members
  WHERE id = p_staff_member_id;

  -- Insert placeholder documents for Staff EDL items that don't already exist
  INSERT INTO public.etmf_documents (
    company_id, study_id, study_country_id, site_id, staff_member_id, tmf_ref_id, document_name, document_status
  )
  SELECT
    v_company_id,
    p_study_id,
    v_study_country_id,
    p_site_id,
    p_staff_member_id,
    sedl.tmf_ref_id,
    tmf.recommended_sub_artifact,
    'placeholder'::etmf_document_status
  FROM public.etmf_staff_expected_documents sedl
  JOIN public.tmf_reference_model tmf ON tmf.id = sedl.tmf_ref_id
  WHERE sedl.site_id = p_site_id
    AND sedl.role_name = v_role_name
    AND sedl.required = true
    AND NOT EXISTS (
      SELECT 1 FROM public.etmf_documents d
      WHERE d.study_id = p_study_id
        AND d.site_id = p_site_id
        AND d.staff_member_id = p_staff_member_id
        AND d.tmf_ref_id = sedl.tmf_ref_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Initialize EDL for a study from TMF reference (called when enabling eTMF for a study)
CREATE OR REPLACE FUNCTION public.etmf_initialize_study_edl(p_study_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Verify access
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.studies
    WHERE id = p_study_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied or study not found';
  END IF;

  -- Insert EDL rows for all TMF reference items (defaults based on level flags)
  INSERT INTO public.etmf_expected_documents (
    company_id, study_id, tmf_ref_id, edl_yes, site_level_yes, country_level_yes
  )
  SELECT
    v_company_id,
    p_study_id,
    tmf.id,
    true,
    tmf.site_level_document,
    tmf.country_level_document
  FROM public.tmf_reference_model tmf
  WHERE NOT EXISTS (
    SELECT 1 FROM public.etmf_expected_documents edl
    WHERE edl.study_id = p_study_id AND edl.tmf_ref_id = tmf.id
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Get TMF reference model tree structure
CREATE OR REPLACE FUNCTION public.etmf_get_tmf_tree()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(zone_data ORDER BY zone_data->>'zone_number')
    FROM (
      SELECT jsonb_build_object(
        'zone_number', zone_number,
        'zone_name', zone_name,
        'sections', (
          SELECT jsonb_agg(section_data ORDER BY section_data->>'section_number')
          FROM (
            SELECT DISTINCT ON (section_number) jsonb_build_object(
              'section_number', section_number,
              'section_name', section_name,
              'artifacts', (
                SELECT jsonb_agg(artifact_data ORDER BY artifact_data->>'artifact_number')
                FROM (
                  SELECT DISTINCT ON (artifact_number) jsonb_build_object(
                    'artifact_number', artifact_number,
                    'artifact_name', artifact_name,
                    'sub_artifacts', (
                      SELECT jsonb_agg(DISTINCT recommended_sub_artifact)
                      FROM public.tmf_reference_model t3
                      WHERE t3.artifact_number = t2.artifact_number
                        AND t3.recommended_sub_artifact IS NOT NULL
                    )
                  ) AS artifact_data
                  FROM public.tmf_reference_model t2
                  WHERE t2.section_number = t1.section_number
                  ORDER BY artifact_number
                ) artifact_sub
              )
            ) AS section_data
            FROM public.tmf_reference_model t1
            WHERE t1.zone_number = t0.zone_number
            ORDER BY section_number
          ) section_sub
        )
      ) AS zone_data
      FROM (SELECT DISTINCT zone_number, zone_name FROM public.tmf_reference_model) t0
    ) zone_sub
  );
END;
$$;
