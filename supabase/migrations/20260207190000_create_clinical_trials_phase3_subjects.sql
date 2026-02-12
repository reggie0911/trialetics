-- ============================================================================
-- Clinical Trials Phase 3: Subject Management & Visit Scheduling
-- ============================================================================
-- This migration adds:
-- 1. Subjects table with screening/enrollment tracking
-- 2. Subject visit templates (protocol-level)
-- 3. Template visits and activities
-- 4. Subject visits (actual visits)
-- 5. Subject activities (actual activities)
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Subject status
DO $$ BEGIN
  CREATE TYPE subject_status AS ENUM (
    'screening',
    'enrolled',
    'completed',
    'terminated',
    'screen_failure',
    'rescreened',
    'randomized',
    'withdrawn',
    'early_terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Template status
DO $$ BEGIN
  CREATE TYPE template_status AS ENUM (
    'in_progress',
    'approved',
    'obsolete'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Time unit
DO $$ BEGIN
  CREATE TYPE time_unit AS ENUM (
    'days',
    'weeks',
    'months'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Visit status
DO $$ BEGIN
  CREATE TYPE visit_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'missed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Visit type
DO $$ BEGIN
  CREATE TYPE visit_type AS ENUM (
    'screening',
    'rescreening',
    'enrollment',
    'baseline',
    'treatment',
    'follow_up',
    'early_termination',
    'end_of_study',
    'unscheduled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activity status
DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped',
    'not_applicable'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SUBJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  screening_number TEXT,
  subject_number TEXT,
  enrollment_id TEXT,
  status subject_status NOT NULL DEFAULT 'screening',
  encounter_date DATE,
  enrollment_date DATE,
  screening_date DATE,
  completion_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  screen_failure_reason TEXT,
  screen_failure_date DATE,
  randomization_id TEXT,
  randomization_date DATE,
  withdrawn_reason TEXT,
  withdrawn_date DATE,
  early_termination_reason TEXT,
  early_terminated_date DATE,
  rescreening_date DATE,
  informed_consent_versions JSONB DEFAULT '[]'::jsonb,
  use_last_completed_visit_for_reschedule BOOLEAN DEFAULT false,
  demographic_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, subject_number)
);

CREATE INDEX IF NOT EXISTS idx_subjects_site ON public.subjects(site_id);
CREATE INDEX IF NOT EXISTS idx_subjects_company ON public.subjects(company_id);
CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects(status);
CREATE INDEX IF NOT EXISTS idx_subjects_screening_number ON public.subjects(screening_number);

-- RLS for subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subjects in their company"
  ON public.subjects FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert subjects in their company"
  ON public.subjects FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update subjects in their company"
  ON public.subjects FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete subjects in their company"
  ON public.subjects FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_subjects_updated_at ON public.subjects;
CREATE TRIGGER set_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUBJECT VISIT TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_visit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status template_status NOT NULL DEFAULT 'in_progress',
  is_active BOOLEAN DEFAULT true,
  approval_date DATE,
  start_date DATE,
  end_date DATE,
  change_summary TEXT,
  comments TEXT,
  irb_approval_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(protocol_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_visit_templates_protocol ON public.subject_visit_templates(protocol_id);
CREATE INDEX IF NOT EXISTS idx_visit_templates_company ON public.subject_visit_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_templates_active ON public.subject_visit_templates(is_active);

-- RLS for subject_visit_templates
ALTER TABLE public.subject_visit_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visit templates in their company"
  ON public.subject_visit_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert visit templates in their company"
  ON public.subject_visit_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update visit templates in their company"
  ON public.subject_visit_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete visit templates in their company"
  ON public.subject_visit_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_visit_templates_updated_at ON public.subject_visit_templates;
CREATE TRIGGER set_visit_templates_updated_at
  BEFORE UPDATE ON public.subject_visit_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TEMPLATE VISITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.subject_visit_templates(id) ON DELETE CASCADE,
  visit_name TEXT NOT NULL,
  visit_type visit_type NOT NULL,
  sequence INTEGER NOT NULL,
  day_from_baseline INTEGER NOT NULL DEFAULT 0,
  visit_window_before INTEGER DEFAULT 0,
  visit_window_after INTEGER DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_template_visits_template ON public.template_visits(template_id);
CREATE INDEX IF NOT EXISTS idx_template_visits_company ON public.template_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_template_visits_sequence ON public.template_visits(template_id, sequence);

-- RLS for template_visits
ALTER TABLE public.template_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template visits in their company"
  ON public.template_visits FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert template visits in their company"
  ON public.template_visits FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update template visits in their company"
  ON public.template_visits FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete template visits in their company"
  ON public.template_visits FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- TEMPLATE ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_visit_id UUID NOT NULL REFERENCES public.template_visits(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  activity_type TEXT,
  sequence INTEGER,
  is_required BOOLEAN DEFAULT true,
  duration_value INTEGER,
  duration_unit time_unit,
  payment_flag BOOLEAN DEFAULT true,
  payment_amount NUMERIC(10,2),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_activities_visit ON public.template_activities(template_visit_id);
CREATE INDEX IF NOT EXISTS idx_template_activities_company ON public.template_activities(company_id);

-- RLS for template_activities
ALTER TABLE public.template_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template activities in their company"
  ON public.template_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert template activities in their company"
  ON public.template_activities FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update template activities in their company"
  ON public.template_activities FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete template activities in their company"
  ON public.template_activities FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- SUBJECT VISITS (Actual Visits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  template_visit_id UUID REFERENCES public.template_visits(id) ON DELETE SET NULL,
  planned_date DATE,
  scheduled_date DATE,
  actual_date DATE,
  due_date DATE,
  window_start_date DATE,
  window_end_date DATE,
  status visit_status NOT NULL DEFAULT 'scheduled',
  visit_type visit_type NOT NULL,
  visit_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  is_planned BOOLEAN DEFAULT true,
  override_status TEXT,
  crf_pages_submitted INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_visits_subject ON public.subject_visits(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_visits_site ON public.subject_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_subject_visits_company ON public.subject_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_subject_visits_status ON public.subject_visits(status);
CREATE INDEX IF NOT EXISTS idx_subject_visits_dates ON public.subject_visits(scheduled_date, actual_date);

-- RLS for subject_visits
ALTER TABLE public.subject_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subject visits in their company"
  ON public.subject_visits FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert subject visits in their company"
  ON public.subject_visits FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update subject visits in their company"
  ON public.subject_visits FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete subject visits in their company"
  ON public.subject_visits FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_subject_visits_updated_at ON public.subject_visits;
CREATE TRIGGER set_subject_visits_updated_at
  BEFORE UPDATE ON public.subject_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUBJECT ACTIVITIES (Actual Activities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_visit_id UUID NOT NULL REFERENCES public.subject_visits(id) ON DELETE CASCADE,
  template_activity_id UUID REFERENCES public.template_activities(id) ON DELETE SET NULL,
  activity_name TEXT NOT NULL,
  activity_type TEXT,
  status activity_status NOT NULL DEFAULT 'pending',
  completed_date DATE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_activities_visit ON public.subject_activities(subject_visit_id);
CREATE INDEX IF NOT EXISTS idx_subject_activities_company ON public.subject_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_subject_activities_status ON public.subject_activities(status);
CREATE INDEX IF NOT EXISTS idx_subject_activities_assigned ON public.subject_activities(assigned_to);

-- RLS for subject_activities
ALTER TABLE public.subject_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subject activities in their company"
  ON public.subject_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert subject activities in their company"
  ON public.subject_activities FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update subject activities in their company"
  ON public.subject_activities FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete subject activities in their company"
  ON public.subject_activities FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_subject_activities_updated_at ON public.subject_activities;
CREATE TRIGGER set_subject_activities_updated_at
  BEFORE UPDATE ON public.subject_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUBJECT STATUS HISTORY (MVG - Multi-Value Group)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  visit_type visit_type,
  status subject_status NOT NULL,
  status_date DATE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_status_history_subject ON public.subject_status_history(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_status_history_company ON public.subject_status_history(company_id);
CREATE INDEX IF NOT EXISTS idx_subject_status_history_primary ON public.subject_status_history(subject_id, is_primary) WHERE is_primary = true;

-- RLS for subject_status_history
ALTER TABLE public.subject_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subject status history in their company"
  ON public.subject_status_history FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert subject status history in their company"
  ON public.subject_status_history FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update subject status history in their company"
  ON public.subject_status_history FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete subject status history in their company"
  ON public.subject_status_history FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_subject_status_history_updated_at ON public.subject_status_history;
CREATE TRIGGER set_subject_status_history_updated_at
  BEFORE UPDATE ON public.subject_status_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUBJECT TRANSFER HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subject_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  from_site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  to_site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  reason TEXT,
  status_at_transfer subject_status,
  transferred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transferred_by_email TEXT,
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_transfer_history_subject ON public.subject_transfer_history(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_transfer_history_company ON public.subject_transfer_history(company_id);
CREATE INDEX IF NOT EXISTS idx_subject_transfer_history_from_site ON public.subject_transfer_history(from_site_id);
CREATE INDEX IF NOT EXISTS idx_subject_transfer_history_to_site ON public.subject_transfer_history(to_site_id);

-- RLS for subject_transfer_history
ALTER TABLE public.subject_transfer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subject transfer history in their company"
  ON public.subject_transfer_history FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert subject transfer history in their company"
  ON public.subject_transfer_history FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update subject transfer history in their company"
  ON public.subject_transfer_history FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete subject transfer history in their company"
  ON public.subject_transfer_history FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function to generate screening number
CREATE OR REPLACE FUNCTION generate_screening_number(
  p_site_id UUID,
  p_subject_id TEXT,
  p_encounter_date DATE
) RETURNS TEXT AS $$
DECLARE
  v_site_number TEXT;
  v_screening_number TEXT;
BEGIN
  -- Get site number
  SELECT site_number INTO v_site_number
  FROM public.clinical_sites
  WHERE id = p_site_id;
  
  -- Generate screening number: SITE-SUBJECT-YYYYMMDD
  v_screening_number := v_site_number || '-' || p_subject_id || '-' || TO_CHAR(p_encounter_date, 'YYYYMMDD');
  
  RETURN v_screening_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate date with time unit offset
CREATE OR REPLACE FUNCTION calculate_date_offset(
  p_base_date DATE,
  p_offset INTEGER,
  p_unit time_unit
) RETURNS DATE AS $$
BEGIN
  IF p_unit = 'days' THEN
    RETURN p_base_date + (p_offset || ' days')::INTERVAL;
  ELSIF p_unit = 'weeks' THEN
    RETURN p_base_date + (p_offset || ' weeks')::INTERVAL;
  ELSIF p_unit = 'months' THEN
    RETURN p_base_date + (p_offset || ' months')::INTERVAL;
  ELSE
    RETURN p_base_date + (p_offset || ' days')::INTERVAL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule subject visits from template
CREATE OR REPLACE FUNCTION schedule_subject_visits(
  p_subject_id UUID,
  p_schedule_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_company_id UUID;
  v_site_id UUID;
  v_protocol_id UUID;
  v_template_id UUID;
  v_visit_record RECORD;
  v_activity_record RECORD;
  v_subject_visit_id UUID;
  v_planned_date DATE;
  v_window_start DATE;
  v_window_end DATE;
  v_visits_created INTEGER := 0;
BEGIN
  -- Get subject details
  SELECT s.company_id, s.site_id, cs.protocol_id
  INTO v_company_id, v_site_id, v_protocol_id
  FROM public.subjects s
  JOIN public.clinical_sites cs ON s.site_id = cs.id
  WHERE s.id = p_subject_id;
  
  -- Get active template for protocol
  SELECT id INTO v_template_id
  FROM public.subject_visit_templates
  WHERE protocol_id = v_protocol_id
    AND is_active = true
    AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'No active approved template found for protocol';
  END IF;
  
  -- Copy template visits to subject visits
  FOR v_visit_record IN
    SELECT * FROM public.template_visits
    WHERE template_id = v_template_id
    ORDER BY sequence
  LOOP
    -- Calculate planned date
    IF v_visit_record.lead_time_value IS NOT NULL AND v_visit_record.lead_time_unit IS NOT NULL THEN
      v_planned_date := calculate_date_offset(p_schedule_date, v_visit_record.lead_time_value, v_visit_record.lead_time_unit);
    ELSE
      v_planned_date := calculate_date_offset(p_schedule_date, v_visit_record.day_from_baseline, 'days');
    END IF;
    
    -- Calculate window dates
    v_window_start := calculate_date_offset(v_planned_date, -v_visit_record.visit_window_before, COALESCE(v_visit_record.window_unit, 'days'));
    v_window_end := calculate_date_offset(v_planned_date, v_visit_record.visit_window_after, COALESCE(v_visit_record.window_unit, 'days'));
    
    -- Insert subject visit
    INSERT INTO public.subject_visits (
      company_id, subject_id, site_id, template_visit_id,
      visit_name, visit_type, sequence, is_planned,
      planned_date, scheduled_date, due_date,
      window_start_date, window_end_date,
      status, metadata
    ) VALUES (
      v_company_id, p_subject_id, v_site_id, v_visit_record.id,
      v_visit_record.visit_name, v_visit_record.visit_type, v_visit_record.sequence, v_visit_record.is_planned,
      v_planned_date, v_planned_date, v_planned_date,
      v_window_start, v_window_end,
      'scheduled', v_visit_record.metadata
    ) RETURNING id INTO v_subject_visit_id;
    
    v_visits_created := v_visits_created + 1;
    
    -- Copy template activities to subject activities
    FOR v_activity_record IN
      SELECT * FROM public.template_activities
      WHERE template_visit_id = v_visit_record.id
    LOOP
      INSERT INTO public.subject_activities (
        company_id, subject_visit_id, template_activity_id,
        activity_name, activity_type, status, metadata
      ) VALUES (
        v_company_id, v_subject_visit_id, v_activity_record.id,
        v_activity_record.activity_name, v_activity_record.activity_type,
        'pending', v_activity_record.metadata
      );
    END LOOP;
  END LOOP;
  
  RETURN v_visits_created;
END;
$$ LANGUAGE plpgsql;

-- Function to update subject status from visit completion
CREATE OR REPLACE FUNCTION update_subject_status_from_visit(
  p_subject_visit_id UUID
) RETURNS VOID AS $$
DECLARE
  v_subject_id UUID;
  v_company_id UUID;
  v_visit_type visit_type;
  v_actual_date DATE;
  v_template_visit_id UUID;
  v_is_status_tracking BOOLEAN;
  v_visit_status subject_status;
  v_new_status subject_status;
BEGIN
  -- Get visit details
  SELECT subject_id, company_id, visit_type, actual_date, template_visit_id
  INTO v_subject_id, v_company_id, v_visit_type, v_actual_date, v_template_visit_id
  FROM public.subject_visits
  WHERE id = p_subject_visit_id;
  
  -- Check if this is a status tracking visit
  IF v_template_visit_id IS NOT NULL THEN
    SELECT is_status_tracking_visit, visit_status
    INTO v_is_status_tracking, v_visit_status
    FROM public.template_visits
    WHERE id = v_template_visit_id;
    
    IF v_is_status_tracking THEN
      -- Determine the new status based on visit type
      IF v_visit_type = 'screening' THEN
        v_new_status := 'screening';
      ELSIF v_visit_type = 'rescreening' THEN
        v_new_status := 'rescreened';
      ELSIF v_visit_type = 'enrollment' THEN
        v_new_status := 'enrolled';
      ELSIF v_visit_type = 'end_of_study' THEN
        v_new_status := 'completed';
      ELSE
        v_new_status := COALESCE(v_visit_status, v_new_status);
      END IF;
      
      -- Clear existing primary status
      UPDATE public.subject_status_history
      SET is_primary = false
      WHERE subject_id = v_subject_id AND is_primary = true;
      
      -- Insert new status record
      INSERT INTO public.subject_status_history (
        company_id, subject_id, visit_type, status, status_date, is_primary
      ) VALUES (
        v_company_id, v_subject_id, v_visit_type, v_new_status, v_actual_date, true
      );
      
      -- Update subject status
      UPDATE public.subjects
      SET status = v_new_status
      WHERE id = v_subject_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
