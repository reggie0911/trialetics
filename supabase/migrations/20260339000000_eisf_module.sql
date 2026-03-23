-- =====================================================
-- eISF (Electronic Investigator Site Folder) module
-- =====================================================

-- 1. Company flag
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS has_eisf_access BOOLEAN NOT NULL DEFAULT false;

-- 2. Replace platform RPC (signature adds p_has_eisf_access)
DROP FUNCTION IF EXISTS public.set_company_module_access(uuid, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.set_company_module_access(
  p_company_id uuid,
  p_has_ctms_access boolean,
  p_has_etmf_access boolean,
  p_has_tracker_access boolean,
  p_has_eisf_access boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_old jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT jsonb_build_object(
    'has_ctms_access', has_ctms_access,
    'has_etmf_access', has_etmf_access,
    'has_tracker_access', has_tracker_access,
    'has_eisf_access', has_eisf_access
  )
  INTO v_old
  FROM public.companies WHERE id = p_company_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  UPDATE public.companies
  SET
    has_ctms_access = p_has_ctms_access,
    has_etmf_access = p_has_etmf_access,
    has_tracker_access = p_has_tracker_access,
    has_eisf_access = p_has_eisf_access,
    updated_at = NOW()
  WHERE id = p_company_id;

  INSERT INTO public.company_module_audit (company_id, changed_by, old_values, new_values)
  VALUES (
    p_company_id,
    v_profile_id,
    COALESCE(v_old, '{}'::jsonb),
    jsonb_build_object(
      'has_ctms_access', p_has_ctms_access,
      'has_etmf_access', p_has_etmf_access,
      'has_tracker_access', p_has_tracker_access,
      'has_eisf_access', p_has_eisf_access
    )
  );
END;
$$;

-- 3. Document categories (company-scoped labels)
CREATE TABLE IF NOT EXISTS public.eisf_document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_eisf_categories_company ON public.eisf_document_categories(company_id);

ALTER TABLE public.eisf_document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_categories_select" ON public.eisf_document_categories
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_categories_insert" ON public.eisf_document_categories
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_categories_update" ON public.eisf_document_categories
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_categories_delete" ON public.eisf_document_categories
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 4. Site folders (one per study site)
CREATE TABLE IF NOT EXISTS public.eisf_site_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  study_site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  study_country_id UUID NOT NULL REFERENCES public.study_countries(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_site_id)
);

CREATE INDEX IF NOT EXISTS idx_eisf_folders_company ON public.eisf_site_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_eisf_folders_study ON public.eisf_site_folders(study_id);
CREATE INDEX IF NOT EXISTS idx_eisf_folders_site ON public.eisf_site_folders(study_site_id);

CREATE TRIGGER update_eisf_site_folders_updated_at
  BEFORE UPDATE ON public.eisf_site_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.eisf_site_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_folders_select" ON public.eisf_site_folders
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_folders_insert" ON public.eisf_site_folders
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_folders_update" ON public.eisf_site_folders
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_folders_delete" ON public.eisf_site_folders
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 5. Document status enum
DO $$ BEGIN
  CREATE TYPE public.eisf_document_status AS ENUM (
    'missing', 'uploaded', 'under_review', 'approved', 'rejected', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Logical documents
CREATE TABLE IF NOT EXISTS public.eisf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.eisf_site_folders(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.eisf_document_categories(id) ON DELETE SET NULL,
  tmf_ref_id UUID REFERENCES public.tmf_reference_model(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status public.eisf_document_status NOT NULL DEFAULT 'missing',
  primary_staff_member_id UUID REFERENCES public.study_team_members(id) ON DELETE SET NULL,
  primary_site_contact_id UUID REFERENCES public.site_contacts(id) ON DELETE SET NULL,
  expires_on DATE,
  current_version_id UUID,
  etmf_document_id UUID REFERENCES public.etmf_documents(id) ON DELETE SET NULL,
  source_request_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT eisf_documents_one_staff_source CHECK (
    NOT (primary_staff_member_id IS NOT NULL AND primary_site_contact_id IS NOT NULL)
  )
);

-- FK for source_request added after requests table exists (see below)

CREATE INDEX IF NOT EXISTS idx_eisf_docs_company ON public.eisf_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_eisf_docs_folder ON public.eisf_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_eisf_docs_study ON public.eisf_documents(study_id);
CREATE INDEX IF NOT EXISTS idx_eisf_docs_status ON public.eisf_documents(status);
CREATE INDEX IF NOT EXISTS idx_eisf_docs_expires ON public.eisf_documents(expires_on);

CREATE TRIGGER update_eisf_documents_updated_at
  BEFORE UPDATE ON public.eisf_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.eisf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_docs_select" ON public.eisf_documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_docs_insert" ON public.eisf_documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_docs_update" ON public.eisf_documents
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_docs_delete" ON public.eisf_documents
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 7. Versions
CREATE TABLE IF NOT EXISTS public.eisf_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.eisf_documents(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL DEFAULT '1.0',
  storage_path TEXT,
  file_name TEXT,
  file_format TEXT,
  file_size_bytes BIGINT,
  effective_date DATE,
  expiration_date DATE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eisf_versions_doc ON public.eisf_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_eisf_versions_company ON public.eisf_document_versions(company_id);

ALTER TABLE public.eisf_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_versions_select" ON public.eisf_document_versions
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_versions_insert" ON public.eisf_document_versions
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_versions_update" ON public.eisf_document_versions
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_versions_delete" ON public.eisf_document_versions
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

ALTER TABLE public.eisf_documents
  ADD CONSTRAINT eisf_documents_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.eisf_document_versions(id) ON DELETE SET NULL;

-- 8. Required document rules
CREATE TABLE IF NOT EXISTS public.eisf_required_document_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  study_site_id UUID REFERENCES public.study_sites(id) ON DELETE CASCADE,
  role_name TEXT,
  category_id UUID REFERENCES public.eisf_document_categories(id) ON DELETE SET NULL,
  tmf_ref_id UUID REFERENCES public.tmf_reference_model(id) ON DELETE SET NULL,
  rule_label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eisf_rules_company ON public.eisf_required_document_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_eisf_rules_study ON public.eisf_required_document_rules(study_id);

CREATE TRIGGER update_eisf_required_document_rules_updated_at
  BEFORE UPDATE ON public.eisf_required_document_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.eisf_required_document_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_rules_select" ON public.eisf_required_document_rules
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_rules_insert" ON public.eisf_required_document_rules
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_rules_update" ON public.eisf_required_document_rules
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_rules_delete" ON public.eisf_required_document_rules
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 9. Document requests
DO $$ BEGIN
  CREATE TYPE public.eisf_request_status AS ENUM (
    'open', 'in_progress', 'fulfilled', 'cancelled', 'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.eisf_request_priority AS ENUM ('low', 'normal', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.eisf_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.eisf_site_folders(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.eisf_document_categories(id) ON DELETE SET NULL,
  tmf_ref_id UUID REFERENCES public.tmf_reference_model(id) ON DELETE SET NULL,
  due_date DATE,
  priority public.eisf_request_priority NOT NULL DEFAULT 'normal',
  status public.eisf_request_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fulfilled_document_id UUID REFERENCES public.eisf_documents(id) ON DELETE SET NULL,
  fulfilled_version_id UUID REFERENCES public.eisf_document_versions(id) ON DELETE SET NULL,
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_eisf_req_company ON public.eisf_document_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_eisf_req_folder ON public.eisf_document_requests(folder_id);
CREATE INDEX IF NOT EXISTS idx_eisf_req_status ON public.eisf_document_requests(status);

CREATE TRIGGER update_eisf_document_requests_updated_at
  BEFORE UPDATE ON public.eisf_document_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.eisf_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_req_select" ON public.eisf_document_requests
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_req_insert" ON public.eisf_document_requests
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_req_update" ON public.eisf_document_requests
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_req_delete" ON public.eisf_document_requests
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

ALTER TABLE public.eisf_documents
  ADD CONSTRAINT eisf_documents_source_request_fk
  FOREIGN KEY (source_request_id) REFERENCES public.eisf_document_requests(id) ON DELETE SET NULL;

-- 10. Request comments
CREATE TABLE IF NOT EXISTS public.eisf_document_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.eisf_document_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eisf_req_comments_req ON public.eisf_document_request_comments(request_id);

ALTER TABLE public.eisf_document_request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_req_comments_select" ON public.eisf_document_request_comments
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_req_comments_insert" ON public.eisf_document_request_comments
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 11. Review events
DO $$ BEGIN
  CREATE TYPE public.eisf_review_decision AS ENUM ('approved', 'rejected', 'request_changes');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.eisf_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.eisf_documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.eisf_document_versions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision public.eisf_review_decision NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eisf_reviews_doc ON public.eisf_review_events(document_id);
CREATE INDEX IF NOT EXISTS idx_eisf_reviews_version ON public.eisf_review_events(version_id);

ALTER TABLE public.eisf_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_reviews_select" ON public.eisf_review_events
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_reviews_insert" ON public.eisf_review_events
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 12. Audit log
CREATE TABLE IF NOT EXISTS public.eisf_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  eisf_document_id UUID REFERENCES public.eisf_documents(id) ON DELETE CASCADE,
  eisf_document_version_id UUID REFERENCES public.eisf_document_versions(id) ON DELETE CASCADE,
  eisf_document_request_id UUID REFERENCES public.eisf_document_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eisf_audit_company ON public.eisf_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_eisf_audit_doc ON public.eisf_audit_log(eisf_document_id);
CREATE INDEX IF NOT EXISTS idx_eisf_audit_req ON public.eisf_audit_log(eisf_document_request_id);

ALTER TABLE public.eisf_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eisf_audit_select" ON public.eisf_audit_log
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "eisf_audit_insert" ON public.eisf_audit_log
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 13. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'eisf-documents',
  'eisf-documents',
  false,
  52428800,
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

CREATE POLICY "eisf_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'eisf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "eisf_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'eisf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "eisf_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'eisf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "eisf_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'eisf-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- 14. Chart aggregates RPC
CREATE OR REPLACE FUNCTION public.eisf_get_dashboard_stats(p_study_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_study_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.studies WHERE id = p_study_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Study not found';
  END IF;

  RETURN jsonb_build_object(
    'by_status', (
      SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
      FROM (
        SELECT d.status, COUNT(*)::bigint AS cnt
        FROM public.eisf_documents d
        WHERE d.company_id = v_company_id
          AND (p_study_id IS NULL OR d.study_id = p_study_id)
        GROUP BY d.status
      ) s
    ),
    'by_site', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          f.id AS folder_id,
          ss.id AS site_id,
          ss.name AS site_name,
          ss.site_number,
          COUNT(d.id) AS total_docs,
          COUNT(d.id) FILTER (WHERE d.status = 'approved') AS approved_docs,
          CASE WHEN COUNT(d.id) = 0 THEN 0::numeric
            ELSE ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.status = 'approved') / COUNT(d.id), 1)
          END AS completeness_pct
        FROM public.eisf_site_folders f
        JOIN public.study_sites ss ON ss.id = f.study_site_id
        LEFT JOIN public.eisf_documents d ON d.folder_id = f.id
        WHERE f.company_id = v_company_id
          AND (p_study_id IS NULL OR f.study_id = p_study_id)
        GROUP BY f.id, ss.id, ss.name, ss.site_number
        ORDER BY ss.site_number
      ) t
    ),
    'requests', (
      SELECT jsonb_build_object(
        'open', COUNT(*) FILTER (WHERE r.status IN ('open', 'in_progress')),
        'fulfilled', COUNT(*) FILTER (WHERE r.status = 'fulfilled'),
        'overdue', COUNT(*) FILTER (
          WHERE r.status IN ('open', 'in_progress') AND r.due_date IS NOT NULL AND r.due_date < CURRENT_DATE
        )
      )
      FROM public.eisf_document_requests r
      WHERE r.company_id = v_company_id
        AND (p_study_id IS NULL OR r.study_id = p_study_id)
    ),
    'expiring_buckets', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      FROM (
        SELECT
          CASE
            WHEN d.expires_on IS NULL THEN 'none'
            WHEN d.expires_on < CURRENT_DATE THEN 'expired'
            WHEN d.expires_on <= CURRENT_DATE + 30 THEN 'd30'
            WHEN d.expires_on <= CURRENT_DATE + 60 THEN 'd60'
            WHEN d.expires_on <= CURRENT_DATE + 90 THEN 'd90'
            ELSE 'later'
          END AS bucket,
          COUNT(*)::bigint AS cnt
        FROM public.eisf_documents d
        WHERE d.company_id = v_company_id
          AND (p_study_id IS NULL OR d.study_id = p_study_id)
        GROUP BY 1
      ) x
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_company_module_access(uuid, boolean, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eisf_get_dashboard_stats(UUID) TO authenticated;
