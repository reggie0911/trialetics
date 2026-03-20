-- Visit Report Attachments: upload and manage supporting documents
-- (reports, logs, screenshots, correspondence, regulatory documents)

-- 1. visit_report_attachments table
CREATE TABLE IF NOT EXISTS public.visit_report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  category TEXT CHECK (category IS NULL OR category IN ('logs', 'screenshots', 'correspondence', 'regulatory', 'other')),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_report_attachments_report ON public.visit_report_attachments(trip_report_id);

ALTER TABLE public.visit_report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit_report_attachments_select" ON public.visit_report_attachments
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "visit_report_attachments_insert" ON public.visit_report_attachments
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "visit_report_attachments_update" ON public.visit_report_attachments
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "visit_report_attachments_delete" ON public.visit_report_attachments
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- 2. Storage bucket: visit-report-attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visit-report-attachments',
  'visit-report-attachments',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']::text[];

DROP POLICY IF EXISTS "visit_report_attachments_upload" ON storage.objects;
CREATE POLICY "visit_report_attachments_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'visit-report-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "visit_report_attachments_select" ON storage.objects;
CREATE POLICY "visit_report_attachments_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'visit-report-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "visit_report_attachments_delete" ON storage.objects;
CREATE POLICY "visit_report_attachments_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'visit-report-attachments' AND auth.uid() IS NOT NULL);
