-- ============================================================================
-- Trip Report Layout Redesign - Schema Migrations
-- Adds fields for new single-page layout: Study Info, Site/Sponsor Attendees,
-- Monitored CRF, Questions (Yes/No/N/D/N/A), Narrative, Open/Closed Actions
-- ============================================================================

-- ============================================================================
-- 1. trip_report_attendees - add attendee_type (site|sponsor) and role
-- ============================================================================

ALTER TABLE public.trip_report_attendees
  ADD COLUMN IF NOT EXISTS attendee_type TEXT NOT NULL DEFAULT 'site' CHECK (attendee_type IN ('site', 'sponsor')),
  ADD COLUMN IF NOT EXISTS role TEXT;

-- Backfill existing rows
UPDATE public.trip_report_attendees SET attendee_type = 'site' WHERE attendee_type IS NULL;

-- Drop old unique constraint and add new one (allows same contact in both site and sponsor)
ALTER TABLE public.trip_report_attendees DROP CONSTRAINT IF EXISTS trip_report_attendees_trip_report_id_contact_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS trip_report_attendees_trip_report_contact_type_key
  ON public.trip_report_attendees(trip_report_id, contact_id, attendee_type);

COMMENT ON COLUMN public.trip_report_attendees.attendee_type IS 'Site attendee (site staff) or Sponsor attendee (e.g. CRA)';
COMMENT ON COLUMN public.trip_report_attendees.role IS 'Role of attendee (e.g. Principal Investigator, Co-Principal Investigator, Clinical Research Associate)';

-- ============================================================================
-- 2. trip_report_crf_tracking - add crf_name and sdv_type (Partial/Complete)
-- ============================================================================

ALTER TABLE public.trip_report_crf_tracking
  ADD COLUMN IF NOT EXISTS crf_name TEXT,
  ADD COLUMN IF NOT EXISTS sdv_type TEXT CHECK (sdv_type IN ('partial', 'complete'));

-- Backfill: use visit_name as crf_name fallback, source_verified -> sdv_type
UPDATE public.trip_report_crf_tracking SET crf_name = visit_name WHERE crf_name IS NULL AND visit_name IS NOT NULL;
UPDATE public.trip_report_crf_tracking SET sdv_type = CASE WHEN source_verified THEN 'complete' ELSE 'partial' END WHERE sdv_type IS NULL AND source_verified = true;
UPDATE public.trip_report_crf_tracking SET sdv_type = 'partial' WHERE sdv_type IS NULL AND source_verified = false;

COMMENT ON COLUMN public.trip_report_crf_tracking.crf_name IS 'Name of the CRF (e.g. 12 Month Visit, 18 Month Visit)';
COMMENT ON COLUMN public.trip_report_crf_tracking.sdv_type IS 'Partial or Complete SDV (Source Document Verification)';

-- ============================================================================
-- 3. trip_report_checklist_items - add response (yes|no|nd|na) and reviewer_comments
-- ============================================================================

ALTER TABLE public.trip_report_checklist_items
  ADD COLUMN IF NOT EXISTS response TEXT CHECK (response IN ('yes', 'no', 'nd', 'na')),
  ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

COMMENT ON COLUMN public.trip_report_checklist_items.response IS 'Question response: Yes, No, N/D (Not Determined), N/A (Not Applicable)';
COMMENT ON COLUMN public.trip_report_checklist_items.reviewer_comments IS 'Reviewer comments for this question';

-- ============================================================================
-- 4. trip_report_follow_up_items - add action item fields
-- ============================================================================

ALTER TABLE public.trip_report_follow_up_items
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS date_opened DATE,
  ADD COLUMN IF NOT EXISTS action_due_date DATE,
  ADD COLUMN IF NOT EXISTS date_resolved DATE,
  ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- Backfill: activity -> description
UPDATE public.trip_report_follow_up_items SET description = activity WHERE description IS NULL AND activity IS NOT NULL;
-- Backfill: completed_date -> date_resolved for closed items
UPDATE public.trip_report_follow_up_items SET date_resolved = (completed_date::date) WHERE date_resolved IS NULL AND completed_date IS NOT NULL AND status = 'done';

COMMENT ON COLUMN public.trip_report_follow_up_items.category IS 'Action item category (e.g. Case Report Form (CRF), Investigational Product)';
COMMENT ON COLUMN public.trip_report_follow_up_items.description IS 'Detailed description of the action item';
COMMENT ON COLUMN public.trip_report_follow_up_items.date_opened IS 'Date the action item was opened';
COMMENT ON COLUMN public.trip_report_follow_up_items.action_due_date IS 'Date the action is due';
COMMENT ON COLUMN public.trip_report_follow_up_items.date_resolved IS 'Date the action item was resolved (for closed items)';
COMMENT ON COLUMN public.trip_report_follow_up_items.reviewer_comments IS 'Reviewer comments for this action item';

-- ============================================================================
-- 5. trip_reports - add narrative and section reviewer comments
-- ============================================================================

ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS narrative TEXT,
  ADD COLUMN IF NOT EXISTS study_info_reviewer_comments TEXT,
  ADD COLUMN IF NOT EXISTS site_attendees_reviewer_comments TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_attendees_reviewer_comments TEXT,
  ADD COLUMN IF NOT EXISTS crf_reviewer_comments TEXT;

COMMENT ON COLUMN public.trip_reports.narrative IS 'Free-text narrative section for the trip report';
COMMENT ON COLUMN public.trip_reports.study_info_reviewer_comments IS 'Reviewer comments for Study Information section';
COMMENT ON COLUMN public.trip_reports.site_attendees_reviewer_comments IS 'Reviewer comments for Site Attendees section';
COMMENT ON COLUMN public.trip_reports.sponsor_attendees_reviewer_comments IS 'Reviewer comments for Sponsor Attendees section';
COMMENT ON COLUMN public.trip_reports.crf_reviewer_comments IS 'Reviewer comments for Monitored CRF section';

-- ============================================================================
-- 6. site_visits - add visit_end for Study Information
-- ============================================================================

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS visit_end TIMESTAMPTZ;

COMMENT ON COLUMN public.site_visits.visit_end IS 'End date/time of the site visit (for visit length calculation)';
