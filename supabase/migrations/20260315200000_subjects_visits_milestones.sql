-- =====================================================
-- Subjects
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  subject_number TEXT NOT NULL,
  screening_number TEXT,
  randomization_number TEXT,
  status TEXT NOT NULL DEFAULT 'pre_screening' CHECK (status IN ('pre_screening', 'screening', 'screen_failed', 'randomized', 'active', 'completed', 'withdrawn', 'discontinued')),
  screening_date DATE,
  randomization_date DATE,
  completion_date DATE,
  withdrawal_date DATE,
  withdrawal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_id, subject_number)
);

CREATE INDEX IF NOT EXISTS idx_subjects_site ON public.subjects(site_id);
CREATE INDEX IF NOT EXISTS idx_subjects_study ON public.subjects(study_id);
CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects(status);

CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subjects_insert" ON public.subjects
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subjects_update" ON public.subjects
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subjects_delete" ON public.subjects
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Subject Visits
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subject_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  visit_name TEXT NOT NULL,
  visit_number INTEGER NOT NULL,
  planned_date DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'skipped')),
  window_start DATE,
  window_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_visits_subject ON public.subject_visits(subject_id);

ALTER TABLE public.subject_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subject_visits_select" ON public.subject_visits
  FOR SELECT USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_visits_insert" ON public.subject_visits
  FOR INSERT WITH CHECK (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_visits_update" ON public.subject_visits
  FOR UPDATE USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_visits_delete" ON public.subject_visits
  FOR DELETE USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Subject Milestones
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subject_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_milestones_subject ON public.subject_milestones(subject_id);

ALTER TABLE public.subject_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subject_milestones_select" ON public.subject_milestones
  FOR SELECT USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_milestones_insert" ON public.subject_milestones
  FOR INSERT WITH CHECK (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_milestones_update" ON public.subject_milestones
  FOR UPDATE USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_milestones_delete" ON public.subject_milestones
  FOR DELETE USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
