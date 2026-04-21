-- =====================================================
-- Study CRFs: Single-Visit Assignment
-- Convert study_crfs <-> study_visit_definitions from M:N to 1:N.
-- Each CRF now belongs to exactly one visit via study_crfs.visit_definition_id.
-- The previous join table study_visit_crfs is dropped.
-- =====================================================

ALTER TABLE public.study_crfs
  ADD COLUMN visit_definition_id UUID
    REFERENCES public.study_visit_definitions(id) ON DELETE CASCADE;

UPDATE public.study_crfs c
SET visit_definition_id = svc.visit_definition_id
FROM (
  SELECT DISTINCT ON (crf_id) crf_id, visit_definition_id
  FROM public.study_visit_crfs
  ORDER BY crf_id, sort_order, created_at
) svc
WHERE svc.crf_id = c.id;

-- Any CRF with no surviving assignment is orphaned under the new 1:N model.
DELETE FROM public.study_crfs WHERE visit_definition_id IS NULL;

ALTER TABLE public.study_crfs
  ALTER COLUMN visit_definition_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_crfs_visit_definition_id
  ON public.study_crfs(visit_definition_id);

DROP TABLE IF EXISTS public.study_visit_crfs;
