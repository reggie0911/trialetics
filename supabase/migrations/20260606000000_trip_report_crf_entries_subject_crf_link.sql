-- trip_report_crf_entries: optional traceability links to the eCRF tracking
-- matrix (subject + subject_visit + subject_crf). Existing free-text rows are
-- preserved by leaving every new column nullable.
--
-- Once these are populated, the visit-report UI can render a live status
-- strip (DE / SDV / LOCK / Query) next to each recorded entry by joining
-- back to subject_crfs, and the bulk-add picker uses the partial unique
-- index below to skip duplicates.

ALTER TABLE public.trip_report_crf_entries
  ADD COLUMN IF NOT EXISTS subject_id       UUID NULL REFERENCES public.subjects(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_visit_id UUID NULL REFERENCES public.subject_visits(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_crf_id   UUID NULL REFERENCES public.subject_crfs(id)    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trip_report_crf_entries_subject
  ON public.trip_report_crf_entries(subject_id)
  WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_report_crf_entries_subject_visit
  ON public.trip_report_crf_entries(subject_visit_id)
  WHERE subject_visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_report_crf_entries_subject_crf
  ON public.trip_report_crf_entries(subject_crf_id)
  WHERE subject_crf_id IS NOT NULL;

-- Partial unique index: only one entry per (report, source subject_crf) when
-- the link is set. Free-text rows (subject_crf_id IS NULL) are not covered,
-- preserving the original "anything goes" behaviour for legacy snapshots.
CREATE UNIQUE INDEX IF NOT EXISTS trip_report_crf_entries_subject_crf_unique
  ON public.trip_report_crf_entries(trip_report_id, subject_crf_id)
  WHERE subject_crf_id IS NOT NULL;
