-- Visit Report standard sections: narrative, attendees, CRF entries, action items

-- 1. Narrative on trip_reports
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS narrative TEXT;

-- 2. Trip report attendees (site + sponsor)
CREATE TABLE IF NOT EXISTS public.trip_report_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT,
  attendee_type TEXT NOT NULL CHECK (attendee_type IN ('site', 'sponsor')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_attendees_report ON public.trip_report_attendees(trip_report_id);

ALTER TABLE public.trip_report_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_report_attendees_select" ON public.trip_report_attendees
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_attendees_insert" ON public.trip_report_attendees
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_attendees_update" ON public.trip_report_attendees
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_attendees_delete" ON public.trip_report_attendees
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- 3. Monitored CRF entries
CREATE TABLE IF NOT EXISTS public.trip_report_crf_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  subject_number TEXT,
  crf_name TEXT,
  sdv_status TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_crf_entries_report ON public.trip_report_crf_entries(trip_report_id);

ALTER TABLE public.trip_report_crf_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_report_crf_entries_select" ON public.trip_report_crf_entries
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_crf_entries_insert" ON public.trip_report_crf_entries
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_crf_entries_update" ON public.trip_report_crf_entries
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_crf_entries_delete" ON public.trip_report_crf_entries
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- 4. Action items (open/closed)
CREATE TABLE IF NOT EXISTS public.trip_report_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  owner TEXT,
  due_date DATE,
  resolution_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_report_action_items_report ON public.trip_report_action_items(trip_report_id);

ALTER TABLE public.trip_report_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_report_action_items_select" ON public.trip_report_action_items
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_action_items_insert" ON public.trip_report_action_items
  FOR INSERT WITH CHECK (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_action_items_update" ON public.trip_report_action_items
  FOR UPDATE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "trip_report_action_items_delete" ON public.trip_report_action_items
  FOR DELETE USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
