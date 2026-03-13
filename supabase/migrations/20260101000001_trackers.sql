-- =====================================================
-- TRACKERS - AE, Patients, ECRF, VW, MC, SDV
-- =====================================================
-- Consolidated migration for the six tracker modules.
-- All tables are company-scoped. Patients use company_id (not project_id).

-- =====================================================
-- STORAGE: avatars bucket (for company logos)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']::text[];

-- =====================================================
-- STORAGE: csv-uploads bucket
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csv-uploads',
  'csv-uploads',
  false,
  104857600,
  ARRAY['text/csv', 'application/csv', 'text/plain']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['text/csv', 'application/csv', 'text/plain']::text[];

DROP POLICY IF EXISTS "Users can upload CSV files" ON storage.objects;
CREATE POLICY "Users can upload CSV files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'csv-uploads' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view CSV files" ON storage.objects;
CREATE POLICY "Users can view CSV files" ON storage.objects
  FOR SELECT USING (bucket_id = 'csv-uploads' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own CSV files" ON storage.objects;
CREATE POLICY "Users can delete own CSV files" ON storage.objects
  FOR DELETE USING (bucket_id = 'csv-uploads' AND auth.uid() IS NOT NULL);

-- =====================================================
-- AE (Adverse Events) Tracker
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ae_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(company_id, original_header)
);
CREATE INDEX IF NOT EXISTS idx_ae_header_mappings_company_id ON public.ae_header_mappings(company_id);
CREATE TRIGGER set_updated_at_ae_header_mappings BEFORE UPDATE ON public.ae_header_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ae_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ae_uploads_company_id ON public.ae_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_ae_uploads_created_at ON public.ae_uploads(created_at DESC);
CREATE TRIGGER set_updated_at_ae_uploads BEFORE UPDATE ON public.ae_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ae_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ae_uploads(id) ON DELETE CASCADE,
  site_name TEXT, subject_id TEXT, aedecod TEXT, aeser TEXT, aeout TEXT, aesercat1 TEXT,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ae_records_upload_id ON public.ae_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_ae_records_extra_fields_gin ON public.ae_records USING GIN(extra_fields);

CREATE TABLE IF NOT EXISTS public.ae_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ae_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL, label TEXT NOT NULL, visible BOOLEAN NOT NULL DEFAULT true, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, column_id)
);
CREATE TRIGGER set_updated_at_ae_column_configs BEFORE UPDATE ON public.ae_column_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ae_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ae_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ae_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ae_column_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ae_hm_select" ON public.ae_header_mappings FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ae_hm_insert" ON public.ae_header_mappings FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ae_hm_update" ON public.ae_header_mappings FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ae_hm_delete" ON public.ae_header_mappings FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "ae_up_select" ON public.ae_uploads FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ae_up_insert" ON public.ae_uploads FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ae_up_update" ON public.ae_uploads FOR UPDATE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ae_up_delete" ON public.ae_uploads FOR DELETE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "ae_rec_select" ON public.ae_records FOR SELECT USING (upload_id IN (SELECT id FROM public.ae_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ae_rec_insert" ON public.ae_records FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.ae_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ae_rec_update" ON public.ae_records FOR UPDATE USING (upload_id IN (SELECT id FROM public.ae_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ae_rec_delete" ON public.ae_records FOR DELETE USING (upload_id IN (SELECT id FROM public.ae_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "ae_cc_select" ON public.ae_column_configs FOR SELECT USING (upload_id IN (SELECT id FROM public.ae_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ae_cc_insert" ON public.ae_column_configs FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.ae_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ae_cc_update" ON public.ae_column_configs FOR UPDATE USING (upload_id IN (SELECT id FROM public.ae_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ae_cc_delete" ON public.ae_column_configs FOR DELETE USING (upload_id IN (SELECT id FROM public.ae_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- =====================================================
-- Patients Tracker (company-scoped from start)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.patient_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_uploads_company_id ON public.patient_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_patient_uploads_created_at ON public.patient_uploads(created_at DESC);
CREATE TRIGGER set_updated_at_patient_uploads BEFORE UPDATE ON public.patient_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.patient_uploads(id) ON DELETE CASCADE,
  subject_id TEXT, sex TEXT, age TEXT, site_name TEXT,
  demographics JSONB DEFAULT '{}'::jsonb, visits JSONB DEFAULT '{}'::jsonb,
  measurements JSONB DEFAULT '{}'::jsonb, adverse_events JSONB DEFAULT '{}'::jsonb, extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_upload_id ON public.patients(upload_id);
CREATE INDEX IF NOT EXISTS idx_patients_demographics_gin ON public.patients USING GIN(demographics);
CREATE INDEX IF NOT EXISTS idx_patients_visits_gin ON public.patients USING GIN(visits);

CREATE TABLE IF NOT EXISTS public.column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.patient_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL, label TEXT NOT NULL, original_label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  data_type TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'categorical')),
  category TEXT CHECK (category IN ('demographics', 'visits', 'measurements', 'adverse_events', 'other')),
  visit_group TEXT, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, column_id)
);
CREATE TRIGGER set_updated_at_column_configs BEFORE UPDATE ON public.column_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL, customized_header TEXT NOT NULL, visit_group TEXT, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, original_header)
);
CREATE INDEX IF NOT EXISTS idx_header_mappings_company_id ON public.header_mappings(company_id);
CREATE TRIGGER set_updated_at_header_mappings BEFORE UPDATE ON public.header_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.patient_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.header_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pu_select" ON public.patient_uploads FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "pu_insert" ON public.patient_uploads FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "pu_update" ON public.patient_uploads FOR UPDATE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "pu_delete" ON public.patient_uploads FOR DELETE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "pat_select" ON public.patients FOR SELECT USING (upload_id IN (SELECT id FROM public.patient_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "pat_insert" ON public.patients FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.patient_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "pat_update" ON public.patients FOR UPDATE USING (upload_id IN (SELECT id FROM public.patient_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "pat_delete" ON public.patients FOR DELETE USING (upload_id IN (SELECT id FROM public.patient_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "cc_select" ON public.column_configs FOR SELECT USING (upload_id IN (SELECT id FROM public.patient_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "cc_insert" ON public.column_configs FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.patient_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "cc_update" ON public.column_configs FOR UPDATE USING (upload_id IN (SELECT id FROM public.patient_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "cc_delete" ON public.column_configs FOR DELETE USING (upload_id IN (SELECT id FROM public.patient_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "hm_select" ON public.header_mappings FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "hm_insert" ON public.header_mappings FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "hm_update" ON public.header_mappings FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "hm_delete" ON public.header_mappings FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- ECRF Query Tracker
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ecrf_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL, customized_header TEXT NOT NULL, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, original_header)
);
CREATE INDEX IF NOT EXISTS idx_ecrf_header_mappings_company_id ON public.ecrf_header_mappings(company_id);
CREATE TRIGGER set_updated_at_ecrf_header_mappings BEFORE UPDATE ON public.ecrf_header_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ecrf_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ecrf_uploads_company_id ON public.ecrf_uploads(company_id);
CREATE TRIGGER set_updated_at_ecrf_uploads BEFORE UPDATE ON public.ecrf_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ecrf_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ecrf_uploads(id) ON DELETE CASCADE,
  site_name TEXT, subject_id TEXT, event_name TEXT, event_date TEXT, form_name TEXT,
  query_type TEXT, query_text TEXT, query_state TEXT, query_resolution TEXT,
  user_name TEXT, date_time TEXT, user_role TEXT, query_raised_by_role TEXT,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ecrf_records_upload_id ON public.ecrf_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_ecrf_records_extra_fields_gin ON public.ecrf_records USING GIN(extra_fields);

CREATE TABLE IF NOT EXISTS public.ecrf_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ecrf_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL, label TEXT NOT NULL, visible BOOLEAN NOT NULL DEFAULT true, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, column_id)
);
CREATE TRIGGER set_updated_at_ecrf_column_configs BEFORE UPDATE ON public.ecrf_column_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ecrf_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecrf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecrf_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecrf_column_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecrf_hm_select" ON public.ecrf_header_mappings FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ecrf_hm_insert" ON public.ecrf_header_mappings FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ecrf_hm_update" ON public.ecrf_header_mappings FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ecrf_hm_delete" ON public.ecrf_header_mappings FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "ecrf_up_select" ON public.ecrf_uploads FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ecrf_up_insert" ON public.ecrf_uploads FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ecrf_up_update" ON public.ecrf_uploads FOR UPDATE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ecrf_up_delete" ON public.ecrf_uploads FOR DELETE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "ecrf_rec_select" ON public.ecrf_records FOR SELECT USING (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ecrf_rec_insert" ON public.ecrf_records FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ecrf_rec_update" ON public.ecrf_records FOR UPDATE USING (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ecrf_rec_delete" ON public.ecrf_records FOR DELETE USING (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "ecrf_cc_select" ON public.ecrf_column_configs FOR SELECT USING (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ecrf_cc_insert" ON public.ecrf_column_configs FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ecrf_cc_update" ON public.ecrf_column_configs FOR UPDATE USING (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "ecrf_cc_delete" ON public.ecrf_column_configs FOR DELETE USING (upload_id IN (SELECT id FROM public.ecrf_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- =====================================================
-- VW (Visit Window) Tracker
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vw_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL, customized_header TEXT NOT NULL, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, original_header)
);
CREATE INDEX IF NOT EXISTS idx_vw_header_mappings_company_id ON public.vw_header_mappings(company_id);
CREATE TRIGGER set_updated_at_vw_header_mappings BEFORE UPDATE ON public.vw_header_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vw_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vw_uploads_company_id ON public.vw_uploads(company_id);
CREATE TRIGGER set_updated_at_vw_uploads BEFORE UPDATE ON public.vw_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vw_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.vw_uploads(id) ON DELETE CASCADE,
  site_name TEXT, subject_id TEXT, event_name TEXT, event_status TEXT,
  procedure_date TEXT, death_date TEXT, event_date TEXT, planned_date TEXT, proposed_date TEXT,
  window_start_date TEXT, window_end_date TEXT, alert_status TEXT,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vw_records_upload_id ON public.vw_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_vw_records_extra_fields_gin ON public.vw_records USING GIN(extra_fields);

CREATE TABLE IF NOT EXISTS public.vw_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.vw_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL, label TEXT NOT NULL, visible BOOLEAN NOT NULL DEFAULT true, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, column_id)
);
CREATE TRIGGER set_updated_at_vw_column_configs BEFORE UPDATE ON public.vw_column_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vw_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_column_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vw_hm_select" ON public.vw_header_mappings FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "vw_hm_insert" ON public.vw_header_mappings FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "vw_hm_update" ON public.vw_header_mappings FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "vw_hm_delete" ON public.vw_header_mappings FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "vw_up_select" ON public.vw_uploads FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "vw_up_insert" ON public.vw_uploads FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "vw_up_update" ON public.vw_uploads FOR UPDATE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "vw_up_delete" ON public.vw_uploads FOR DELETE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "vw_rec_select" ON public.vw_records FOR SELECT USING (upload_id IN (SELECT id FROM public.vw_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "vw_rec_insert" ON public.vw_records FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.vw_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "vw_rec_update" ON public.vw_records FOR UPDATE USING (upload_id IN (SELECT id FROM public.vw_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "vw_rec_delete" ON public.vw_records FOR DELETE USING (upload_id IN (SELECT id FROM public.vw_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "vw_cc_select" ON public.vw_column_configs FOR SELECT USING (upload_id IN (SELECT id FROM public.vw_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "vw_cc_insert" ON public.vw_column_configs FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.vw_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "vw_cc_update" ON public.vw_column_configs FOR UPDATE USING (upload_id IN (SELECT id FROM public.vw_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "vw_cc_delete" ON public.vw_column_configs FOR DELETE USING (upload_id IN (SELECT id FROM public.vw_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- =====================================================
-- MC (Medication Compliance) Tracker
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mc_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL, customized_header TEXT NOT NULL, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, original_header)
);
CREATE INDEX IF NOT EXISTS idx_mc_header_mappings_company_id ON public.mc_header_mappings(company_id);
CREATE TRIGGER set_updated_at_mc_header_mappings BEFORE UPDATE ON public.mc_header_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.mc_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mc_uploads_company_id ON public.mc_uploads(company_id);
CREATE TRIGGER set_updated_at_mc_uploads BEFORE UPDATE ON public.mc_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.mc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.mc_uploads(id) ON DELETE CASCADE,
  site_name TEXT, subject_id TEXT, event_name TEXT, medication_name TEXT, start_date TEXT, stop_date TEXT,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mc_records_upload_id ON public.mc_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_mc_records_extra_fields_gin ON public.mc_records USING GIN(extra_fields);

CREATE TABLE IF NOT EXISTS public.mc_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.mc_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL, label TEXT NOT NULL, visible BOOLEAN NOT NULL DEFAULT true, table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, column_id)
);
CREATE TRIGGER set_updated_at_mc_column_configs BEFORE UPDATE ON public.mc_column_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mc_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_column_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mc_hm_select" ON public.mc_header_mappings FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "mc_hm_insert" ON public.mc_header_mappings FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "mc_hm_update" ON public.mc_header_mappings FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "mc_hm_delete" ON public.mc_header_mappings FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "mc_up_select" ON public.mc_uploads FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "mc_up_insert" ON public.mc_uploads FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "mc_up_update" ON public.mc_uploads FOR UPDATE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "mc_up_delete" ON public.mc_uploads FOR DELETE USING (uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "mc_rec_select" ON public.mc_records FOR SELECT USING (upload_id IN (SELECT id FROM public.mc_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "mc_rec_insert" ON public.mc_records FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.mc_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "mc_rec_update" ON public.mc_records FOR UPDATE USING (upload_id IN (SELECT id FROM public.mc_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "mc_rec_delete" ON public.mc_records FOR DELETE USING (upload_id IN (SELECT id FROM public.mc_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "mc_cc_select" ON public.mc_column_configs FOR SELECT USING (upload_id IN (SELECT id FROM public.mc_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "mc_cc_insert" ON public.mc_column_configs FOR INSERT WITH CHECK (upload_id IN (SELECT id FROM public.mc_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "mc_cc_update" ON public.mc_column_configs FOR UPDATE USING (upload_id IN (SELECT id FROM public.mc_uploads WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "mc_cc_delete" ON public.mc_column_configs FOR DELETE USING (upload_id IN (SELECT id FROM public.mc_uploads WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- =====================================================
-- SDV (Source Data Verification) Tracker
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sdv_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  site_data_upload_id UUID,
  sdv_data_upload_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdv_reports_company ON public.sdv_reports(company_id);
CREATE TRIGGER set_updated_at_sdv_reports BEFORE UPDATE ON public.sdv_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sdv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_id UUID REFERENCES public.sdv_reports(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('site_data_entry', 'sdv_data')),
  file_name TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'uploading', 'queued', 'cancelled')),
  error_message TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_company ON public.sdv_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_report ON public.sdv_uploads(report_id);
CREATE TRIGGER set_updated_at_sdv_uploads BEFORE UPDATE ON public.sdv_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sdv_reports ADD CONSTRAINT sdv_reports_site_upload_fk FOREIGN KEY (site_data_upload_id) REFERENCES public.sdv_uploads(id) ON DELETE SET NULL;
ALTER TABLE public.sdv_reports ADD CONSTRAINT sdv_reports_sdv_upload_fk FOREIGN KEY (sdv_data_upload_id) REFERENCES public.sdv_uploads(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.sdv_site_data (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.sdv_reports(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL, subject_id TEXT NOT NULL, event_name TEXT NOT NULL, form_name TEXT NOT NULL, item_export_label TEXT NOT NULL,
  merge_key TEXT NOT NULL,
  edit_date_time TIMESTAMPTZ, edit_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_upload ON public.sdv_site_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_company ON public.sdv_site_data(company_id);
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_report ON public.sdv_site_data(report_id);
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_merge_key ON public.sdv_site_data(company_id, merge_key);

CREATE TABLE IF NOT EXISTS public.sdv_sdv_data (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.sdv_reports(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL, subject_id TEXT NOT NULL, event_name TEXT NOT NULL, form_name TEXT NOT NULL, item_name TEXT NOT NULL,
  merge_key TEXT NOT NULL,
  sdv_by TEXT, sdv_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdv_sdv_data_upload ON public.sdv_sdv_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_sdv_sdv_data_company ON public.sdv_sdv_data(company_id);
CREATE INDEX IF NOT EXISTS idx_sdv_sdv_data_report ON public.sdv_sdv_data(report_id);
CREATE INDEX IF NOT EXISTS idx_sdv_sdv_data_merge_key ON public.sdv_sdv_data(company_id, merge_key);

ALTER TABLE public.sdv_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_site_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_sdv_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdv_rep_select" ON public.sdv_reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id));
CREATE POLICY "sdv_rep_insert" ON public.sdv_reports FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id));
CREATE POLICY "sdv_rep_update" ON public.sdv_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id));
CREATE POLICY "sdv_rep_delete" ON public.sdv_reports FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id));

CREATE POLICY "sdv_up_select" ON public.sdv_uploads FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id));
CREATE POLICY "sdv_up_insert" ON public.sdv_uploads FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id));
CREATE POLICY "sdv_up_update" ON public.sdv_uploads FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id));
CREATE POLICY "sdv_up_delete" ON public.sdv_uploads FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id));

CREATE POLICY "sdv_sd_select" ON public.sdv_site_data FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data.company_id));
CREATE POLICY "sdv_sd_insert" ON public.sdv_site_data FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data.company_id));
CREATE POLICY "sdv_sd_delete" ON public.sdv_site_data FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data.company_id));

CREATE POLICY "sdv_dd_select" ON public.sdv_sdv_data FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_sdv_data.company_id));
CREATE POLICY "sdv_dd_insert" ON public.sdv_sdv_data FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_sdv_data.company_id));
CREATE POLICY "sdv_dd_delete" ON public.sdv_sdv_data FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = sdv_sdv_data.company_id));

-- SDV materialized view (report-based; empty until reports exist)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.sdv_merged_view AS
WITH site_dedup AS (
  SELECT DISTINCT ON (report_id, merge_key)
    id, upload_id, company_id, report_id, merge_key, site_name, subject_id, event_name, form_name, item_export_label, edit_date_time, edit_by
  FROM public.sdv_site_data
  WHERE report_id IS NOT NULL
  ORDER BY report_id, merge_key, edit_date_time DESC NULLS LAST, created_at DESC
),
sdv_dedup AS (
  SELECT DISTINCT ON (report_id, merge_key)
    id, upload_id, company_id, report_id, merge_key, site_name, subject_id, event_name, form_name, item_name, sdv_by, sdv_date
  FROM public.sdv_sdv_data
  WHERE report_id IS NOT NULL
  ORDER BY report_id, merge_key, sdv_date DESC NULLS LAST, created_at DESC
)
SELECT
  COALESCE(site.id, sdv.id) as record_id,
  COALESCE(site.company_id, sdv.company_id) as company_id,
  COALESCE(site.report_id, sdv.report_id) as report_id,
  COALESCE(site.merge_key, sdv.merge_key) as merge_key,
  COALESCE(site.site_name, sdv.site_name) as site_name,
  COALESCE(site.subject_id, sdv.subject_id) as subject_id,
  COALESCE(site.event_name, sdv.event_name) as event_name,
  COALESCE(site.form_name, sdv.form_name) as form_name,
  site.item_export_label, sdv.item_name,
  COALESCE(site.item_export_label, sdv.item_name) as item_display,
  site.edit_date_time, site.edit_by, sdv.sdv_by, sdv.sdv_date,
  CASE WHEN site.id IS NOT NULL AND sdv.id IS NOT NULL THEN 'both' WHEN site.id IS NOT NULL THEN 'site_data_only' ELSE 'sdv_data_only' END as data_source,
  CASE WHEN sdv.sdv_date IS NOT NULL THEN true ELSE false END as is_verified,
  site.upload_id as site_upload_id, sdv.upload_id as sdv_upload_id
FROM site_dedup site
FULL OUTER JOIN sdv_dedup sdv ON site.report_id = sdv.report_id AND site.merge_key = sdv.merge_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sdv_merged_view_pk ON public.sdv_merged_view(report_id, merge_key);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_view_report ON public.sdv_merged_view(report_id);
GRANT SELECT ON public.sdv_merged_view TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_sdv_merged_view()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.sdv_merged_view;
END;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_sdv_merged_view TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_aggregations(
  p_report_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_event_filter TEXT DEFAULT NULL,
  p_form_filter TEXT DEFAULT NULL,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (total_items BIGINT, verified_items BIGINT, sdv_percent NUMERIC, site_data_only_count BIGINT, sdv_data_only_count BIGINT, both_count BIGINT, total_sites BIGINT, total_subjects BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1) ELSE 0::NUMERIC END,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT,
    COUNT(DISTINCT v.site_name)::BIGINT, COUNT(DISTINCT v.subject_id)::BIGINT
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_event_filter IS NULL OR v.event_name = p_event_filter)
    AND (p_form_filter IS NULL OR v.form_name = p_form_filter)
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_aggregations TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_site_summary(p_report_id UUID, p_source_filter TEXT DEFAULT NULL)
RETURNS TABLE (site_name TEXT, total_items BIGINT, verified_items BIGINT, sdv_percent NUMERIC, total_subjects BIGINT, site_data_only_count BIGINT, sdv_data_only_count BIGINT, both_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT v.site_name, COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1) ELSE 0::NUMERIC END,
    COUNT(DISTINCT v.subject_id)::BIGINT,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name ORDER BY v.site_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_site_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_subject_summary(p_report_id UUID, p_site_name TEXT, p_source_filter TEXT DEFAULT NULL)
RETURNS TABLE (site_name TEXT, subject_id TEXT, total_items BIGINT, verified_items BIGINT, sdv_percent NUMERIC, site_data_only_count BIGINT, sdv_data_only_count BIGINT, both_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT v.site_name, v.subject_id, COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1) ELSE 0::NUMERIC END,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id AND v.site_name = p_site_name AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name, v.subject_id ORDER BY v.subject_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_subject_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_event_summary(p_report_id UUID, p_site_name TEXT, p_subject_id TEXT, p_source_filter TEXT DEFAULT NULL)
RETURNS TABLE (site_name TEXT, subject_id TEXT, event_name TEXT, total_items BIGINT, verified_items BIGINT, sdv_percent NUMERIC, site_data_only_count BIGINT, sdv_data_only_count BIGINT, both_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT v.site_name, v.subject_id, v.event_name, COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1) ELSE 0::NUMERIC END,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id AND v.site_name = p_site_name AND v.subject_id = p_subject_id AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name, v.subject_id, v.event_name ORDER BY v.event_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_event_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_form_summary(p_report_id UUID, p_site_name TEXT, p_subject_id TEXT, p_event_name TEXT, p_source_filter TEXT DEFAULT NULL)
RETURNS TABLE (site_name TEXT, subject_id TEXT, event_name TEXT, form_name TEXT, total_items BIGINT, verified_items BIGINT, sdv_percent NUMERIC, site_data_only_count BIGINT, sdv_data_only_count BIGINT, both_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT v.site_name, v.subject_id, v.event_name, v.form_name, COUNT(*)::BIGINT, COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1) ELSE 0::NUMERIC END,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT, COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id AND v.site_name = p_site_name AND v.subject_id = p_subject_id AND v.event_name = p_event_name AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name, v.subject_id, v.event_name, v.form_name ORDER BY v.form_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_form_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_item_details(p_report_id UUID, p_site_name TEXT, p_subject_id TEXT, p_event_name TEXT, p_form_name TEXT, p_source_filter TEXT DEFAULT NULL)
RETURNS TABLE (site_name TEXT, subject_id TEXT, event_name TEXT, form_name TEXT, item_display TEXT, item_export_label TEXT, item_name TEXT, is_verified BOOLEAN, data_source TEXT, edit_date_time TIMESTAMPTZ, edit_by TEXT, sdv_date TIMESTAMPTZ, sdv_by TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT v.site_name, v.subject_id, v.event_name, v.form_name, v.item_display, v.item_export_label, v.item_name, v.is_verified, v.data_source, v.edit_date_time, v.edit_by, v.sdv_date, v.sdv_by
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id AND v.site_name = p_site_name AND v.subject_id = p_subject_id AND v.event_name = p_event_name AND v.form_name = p_form_name AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  ORDER BY v.item_display;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_item_details TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_filter_options(p_report_id UUID)
RETURNS TABLE (site_names TEXT[], subject_ids TEXT[], event_names TEXT[], form_names TEXT[], data_sources TEXT[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT ARRAY_AGG(DISTINCT v.site_name ORDER BY v.site_name), ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id), ARRAY_AGG(DISTINCT v.event_name ORDER BY v.event_name), ARRAY_AGG(DISTINCT v.form_name ORDER BY v.form_name), ARRAY['site_data_only', 'sdv_data_only', 'both']::TEXT[]
  FROM public.sdv_merged_view v WHERE v.report_id = p_report_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_filter_options TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sdv_cascading_filter_options(p_report_id UUID, p_site_filter TEXT DEFAULT NULL, p_subject_filter TEXT DEFAULT NULL, p_event_filter TEXT DEFAULT NULL)
RETURNS TABLE (subject_ids TEXT[], event_names TEXT[], form_names TEXT[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id), ARRAY_AGG(DISTINCT v.event_name ORDER BY v.event_name), ARRAY_AGG(DISTINCT v.form_name ORDER BY v.form_name)
  FROM public.sdv_merged_view v
  WHERE v.report_id = p_report_id AND (p_site_filter IS NULL OR v.site_name = p_site_filter) AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter) AND (p_event_filter IS NULL OR v.event_name = p_event_filter);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_cascading_filter_options TO authenticated;
