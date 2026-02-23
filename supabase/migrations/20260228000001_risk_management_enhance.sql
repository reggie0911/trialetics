-- Risk Management Enhancement
-- Add KRI linkage, governance review fields, and summary view

-- ============================================================================
-- Add columns to protocol_risks
-- ============================================================================

ALTER TABLE public.protocol_risks
  ADD COLUMN IF NOT EXISTS kri_link_id UUID REFERENCES public.kri_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS governance_review_date DATE,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_protocol_risks_kri_link ON public.protocol_risks(kri_link_id);
CREATE INDEX IF NOT EXISTS idx_protocol_risks_category ON public.protocol_risks(category);

-- ============================================================================
-- Risk Register Summary View
-- ============================================================================

CREATE OR REPLACE VIEW public.risk_register_summary AS
SELECT
  pr.protocol_id,
  pr.company_id,
  COUNT(*) AS total_risks,
  COUNT(*) FILTER (WHERE pr.status = 'open') AS open_risks,
  COUNT(*) FILTER (WHERE pr.status = 'in_progress') AS in_progress_risks,
  COUNT(*) FILTER (WHERE pr.status = 'resolved') AS resolved_risks,
  COUNT(*) FILTER (WHERE pr.status = 'closed') AS closed_risks,
  COUNT(*) FILTER (WHERE pr.risk_level = 'critical') AS critical_risks,
  COUNT(*) FILTER (WHERE pr.risk_level = 'high') AS high_risks,
  COUNT(*) FILTER (WHERE pr.risk_level = 'medium') AS medium_risks,
  COUNT(*) FILTER (WHERE pr.risk_level = 'low') AS low_risks,
  MAX(pr.updated_at) AS last_updated
FROM public.protocol_risks pr
GROUP BY pr.protocol_id, pr.company_id;

COMMENT ON VIEW public.risk_register_summary IS 'Aggregated risk counts per protocol by level and status';
