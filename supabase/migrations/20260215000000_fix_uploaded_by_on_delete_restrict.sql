-- =====================================================
-- Fix uploaded_by / profile_id FK: ON DELETE SET NULL → RESTRICT
-- =====================================================
-- These tables have uploaded_by/profile_id as NOT NULL but used ON DELETE SET NULL,
-- which caused "null value violates not-null constraint" when deleting profiles.
-- Changing to ON DELETE RESTRICT prevents profile deletion when uploads exist.
-- =====================================================

-- patient_uploads
ALTER TABLE public.patient_uploads
  DROP CONSTRAINT IF EXISTS patient_uploads_uploaded_by_fkey,
  ADD CONSTRAINT patient_uploads_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ae_uploads
ALTER TABLE public.ae_uploads
  DROP CONSTRAINT IF EXISTS ae_uploads_uploaded_by_fkey,
  ADD CONSTRAINT ae_uploads_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- document_uploads
ALTER TABLE public.document_uploads
  DROP CONSTRAINT IF EXISTS document_uploads_uploaded_by_fkey,
  ADD CONSTRAINT document_uploads_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ecrf_uploads
ALTER TABLE public.ecrf_uploads
  DROP CONSTRAINT IF EXISTS ecrf_uploads_uploaded_by_fkey,
  ADD CONSTRAINT ecrf_uploads_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- mc_uploads
ALTER TABLE public.mc_uploads
  DROP CONSTRAINT IF EXISTS mc_uploads_uploaded_by_fkey,
  ADD CONSTRAINT mc_uploads_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- vw_uploads
ALTER TABLE public.vw_uploads
  DROP CONSTRAINT IF EXISTS vw_uploads_uploaded_by_fkey,
  ADD CONSTRAINT vw_uploads_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- sdv_uploads (uses profile_id)
ALTER TABLE public.sdv_uploads
  DROP CONSTRAINT IF EXISTS sdv_uploads_profile_id_fkey,
  ADD CONSTRAINT sdv_uploads_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- sdv_reports (uses profile_id)
ALTER TABLE public.sdv_reports
  DROP CONSTRAINT IF EXISTS sdv_reports_profile_id_fkey,
  ADD CONSTRAINT sdv_reports_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- upload_jobs (uses created_by)
ALTER TABLE public.upload_jobs
  DROP CONSTRAINT IF EXISTS upload_jobs_created_by_fkey,
  ADD CONSTRAINT upload_jobs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
