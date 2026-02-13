-- Phase 4: Tracker Modules — Protocol Scoping
-- Adds optional protocol_id to all tracker upload tables for CTMS-centric filtering
-- Per plan: protocol scoping, protocol selector in UIs, CTMS navigation to trackers

-- ============================================================================
-- 1. ae_uploads
-- ============================================================================
ALTER TABLE public.ae_uploads
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ae_uploads_protocol_id ON public.ae_uploads(protocol_id);

COMMENT ON COLUMN public.ae_uploads.protocol_id IS 'Optional protocol scope for CTMS-centric filtering';

-- ============================================================================
-- 2. ecrf_uploads
-- ============================================================================
ALTER TABLE public.ecrf_uploads
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ecrf_uploads_protocol_id ON public.ecrf_uploads(protocol_id);

COMMENT ON COLUMN public.ecrf_uploads.protocol_id IS 'Optional protocol scope for CTMS-centric filtering';

-- ============================================================================
-- 3. sdv_uploads
-- ============================================================================
ALTER TABLE public.sdv_uploads
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sdv_uploads_protocol_id ON public.sdv_uploads(protocol_id);

COMMENT ON COLUMN public.sdv_uploads.protocol_id IS 'Optional protocol scope for CTMS-centric filtering';

-- ============================================================================
-- 4. vw_uploads
-- ============================================================================
ALTER TABLE public.vw_uploads
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vw_uploads_protocol_id ON public.vw_uploads(protocol_id);

COMMENT ON COLUMN public.vw_uploads.protocol_id IS 'Optional protocol scope for CTMS-centric filtering';

-- ============================================================================
-- 5. mc_uploads
-- ============================================================================
ALTER TABLE public.mc_uploads
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mc_uploads_protocol_id ON public.mc_uploads(protocol_id);

COMMENT ON COLUMN public.mc_uploads.protocol_id IS 'Optional protocol scope for CTMS-centric filtering';

-- ============================================================================
-- 6. patient_uploads
-- ============================================================================
ALTER TABLE public.patient_uploads
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_uploads_protocol_id ON public.patient_uploads(protocol_id);

COMMENT ON COLUMN public.patient_uploads.protocol_id IS 'Optional protocol scope for CTMS-centric filtering';
