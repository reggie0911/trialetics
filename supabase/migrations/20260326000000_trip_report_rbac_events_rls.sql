-- =====================================================
-- Trip report audit events + tighter SELECT on trip_reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trip_report_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_status_events_report
  ON public.trip_report_status_events(trip_report_id);
CREATE INDEX IF NOT EXISTS idx_trip_report_status_events_created
  ON public.trip_report_status_events(created_at DESC);

ALTER TABLE public.trip_report_status_events ENABLE ROW LEVEL SECURITY;

-- Company members can read audit rows for reports in their company
CREATE POLICY "trip_report_status_events_select" ON public.trip_report_status_events
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Inserts performed via service role in server actions (no INSERT policy for authenticated)

DROP POLICY IF EXISTS "trip_reports_select" ON public.trip_reports;

CREATE POLICY "trip_reports_select" ON public.trip_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_visits mv
      JOIN public.studies s ON mv.study_id = s.id
      WHERE mv.id = trip_reports.visit_id
        AND s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      trip_reports.report_status = 'approved_and_signed'
      OR (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.study_team_members stm
        JOIN public.monitoring_visits mv2 ON mv2.id = trip_reports.visit_id
        WHERE stm.study_id = mv2.study_id
          AND stm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          AND stm.is_active = true
          AND stm.role IN (
            'clinical_research_associate',
            'clinical_project_manager'
          )
      )
    )
  );
