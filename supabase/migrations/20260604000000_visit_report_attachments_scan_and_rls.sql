-- Visit Report Attachments: virus-scan lifecycle + tightened storage RLS.
--
-- Adds a scan_status lifecycle (pending / clean / infected / error / skipped)
-- and replaces the broad authenticated-only storage.objects policies with
-- company-scoped, path-derived report_id checks. Existing rows default to
-- scan_status='pending' so the retry sweep can backfill them.

-- 1. scan_status lifecycle on the metadata table -----------------------------

ALTER TABLE public.visit_report_attachments
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'clean', 'infected', 'error', 'skipped')),
  ADD COLUMN IF NOT EXISTS scan_status_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS scan_engine TEXT NULL,
  ADD COLUMN IF NOT EXISTS scan_signature TEXT NULL,
  ADD COLUMN IF NOT EXISTS scan_error TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_vra_scan_status_pending
  ON public.visit_report_attachments (created_at)
  WHERE scan_status = 'pending';

-- 2. Tighten storage.objects policies ----------------------------------------
--
-- Object keys are laid out as `{trip_report_id}/{uuid}-{encoded_file_name}`,
-- so `(storage.foldername(name))[1]::uuid` resolves to the trip_report_id.
-- All policies join through trip_reports -> monitoring_visits -> studies and
-- match the caller's company_id (mirroring the table-level RLS).

DROP POLICY IF EXISTS "visit_report_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "visit_report_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "visit_report_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "visit_report_attachments_insert" ON storage.objects;

CREATE POLICY "visit_report_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visit-report-attachments'
    AND auth.uid() IS NOT NULL
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT tr.id
      FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
        AND COALESCE(tr.report_status, tr.status, 'report_pending')
            IN ('report_pending', 'authoring', 'returned')
    )
  );

CREATE POLICY "visit_report_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'visit-report-attachments'
    AND auth.uid() IS NOT NULL
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT tr.id
      FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "visit_report_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'visit-report-attachments'
    AND auth.uid() IS NOT NULL
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT tr.id
      FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
        AND COALESCE(tr.report_status, tr.status, 'report_pending')
            IN ('report_pending', 'authoring', 'returned')
    )
  );

-- Intentionally no UPDATE policy on storage.objects for this bucket.
-- Objects are immutable at the storage layer; replacements happen via
-- delete + insert. See docs/VISIT_REPORT_ATTACHMENTS_SECURITY.md.
