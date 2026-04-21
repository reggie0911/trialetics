-- Extend the visit_type / visit_report_type CHECK constraints to allow the
-- new 'training' code (Training Visit, abbrev TV) used by both the
-- monitoring-visit dropdown and the trip-report template dropdown.
--
-- monitoring_visits.visit_type keeps its legacy values
-- (routine / for_cause / pre_study / interim) so existing rows continue to
-- pass the constraint; only newly created visits are limited to the active
-- five via the UI dropdown in components/ctms/visits/visits-tab.tsx.
--
-- visit_report_templates.visit_report_type only ever accepted the modern
-- five values (sqv / siv / monitoring / close_out) so we just add 'training'
-- to that smaller set.

ALTER TABLE public.monitoring_visits
  DROP CONSTRAINT IF EXISTS monitoring_visits_visit_type_check;

ALTER TABLE public.monitoring_visits
  ADD CONSTRAINT monitoring_visits_visit_type_check
  CHECK (visit_type IN (
    'routine', 'for_cause', 'close_out', 'pre_study', 'interim',
    'sqv', 'siv', 'monitoring', 'training'
  ));

ALTER TABLE public.visit_report_templates
  DROP CONSTRAINT IF EXISTS visit_report_templates_visit_report_type_check;

ALTER TABLE public.visit_report_templates
  ADD CONSTRAINT visit_report_templates_visit_report_type_check
  CHECK (visit_report_type IN ('sqv', 'siv', 'monitoring', 'close_out', 'training'));
