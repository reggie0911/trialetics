-- =====================================================
-- Trip Report 21 CFR Part 11 controls
--
-- Adds first-class signature manifestation columns (printed name,
-- attestation text, server-set timestamps, content hash) to trip_reports;
-- introduces an append-only trip_report_signature_audit table; enforces
-- DB-level immutability of trip_report_status_events and the new audit
-- table via BEFORE UPDATE/DELETE triggers; locks signed-content columns
-- on trip_reports once the report reaches approved_and_signed; and
-- tightens the trip_reports_update RLS policy to a study-team-gated
-- predicate (CRA / CPM on study or company admin) so company members at
-- large can no longer update arbitrary trip reports.
-- =====================================================

-- ----- Signature manifestation columns on trip_reports -----
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS author_submission_printed_name      TEXT NULL,
  ADD COLUMN IF NOT EXISTS author_submission_attestation_text  TEXT NULL,
  ADD COLUMN IF NOT EXISTS author_submission_signed_at_db      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS author_submission_content_hash      TEXT NULL,
  ADD COLUMN IF NOT EXISTS approval_printed_name               TEXT NULL,
  ADD COLUMN IF NOT EXISTS approval_attestation_text           TEXT NULL,
  ADD COLUMN IF NOT EXISTS approval_signed_at_db               TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approval_content_hash               TEXT NULL;

-- ----- Append-only signature audit table -----
CREATE TABLE IF NOT EXISTS public.trip_report_signature_audit (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_report_id       UUID NOT NULL REFERENCES public.trip_reports(id) ON DELETE RESTRICT,
  kind                 TEXT NOT NULL CHECK (kind IN ('author_submit', 'approver_approve', 'void_approval')),
  actor_profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  printed_name         TEXT NOT NULL,
  attestation_text     TEXT NOT NULL,
  content_hash         TEXT NULL,
  password_verified    BOOLEAN NOT NULL,
  reason               TEXT NULL,
  signed_at_db         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address           INET NULL,
  user_agent           TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_trip_report_signature_audit_report
  ON public.trip_report_signature_audit (trip_report_id);
CREATE INDEX IF NOT EXISTS idx_trip_report_signature_audit_signed_at
  ON public.trip_report_signature_audit (signed_at_db DESC);

ALTER TABLE public.trip_report_signature_audit ENABLE ROW LEVEL SECURITY;

-- Company-scoped SELECT (mirrors trip_report_status_events_select)
DROP POLICY IF EXISTS "trip_report_signature_audit_select" ON public.trip_report_signature_audit;
CREATE POLICY "trip_report_signature_audit_select" ON public.trip_report_signature_audit
  FOR SELECT USING (
    trip_report_id IN (
      SELECT tr.id FROM public.trip_reports tr
      JOIN public.monitoring_visits mv ON tr.visit_id = mv.id
      JOIN public.studies s ON mv.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- No INSERT / UPDATE / DELETE policy: writes go through the service role
-- helper in lib/trip-report-audit.ts, and the immutability trigger below
-- blocks UPDATE/DELETE for every role (including service role).

-- =====================================================
-- DB-enforced immutability of audit tables
--
-- Both helpers below are SECURITY DEFINER so they cannot be sidestepped
-- by switching role at the connection level, and they raise EXCEPTION
-- regardless of the calling role (including service_role / postgres).
-- =====================================================

CREATE OR REPLACE FUNCTION public.tg_trip_report_status_events_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'trip_report_status_events is append-only; UPDATE is not permitted';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'trip_report_status_events is append-only; DELETE is not permitted';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_report_status_events_immutable
  ON public.trip_report_status_events;
CREATE TRIGGER trg_trip_report_status_events_immutable
  BEFORE UPDATE OR DELETE ON public.trip_report_status_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_trip_report_status_events_immutable();

CREATE OR REPLACE FUNCTION public.tg_trip_report_signature_audit_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'trip_report_signature_audit is append-only; UPDATE is not permitted';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'trip_report_signature_audit is append-only; DELETE is not permitted';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_report_signature_audit_immutable
  ON public.trip_report_signature_audit;
CREATE TRIGGER trg_trip_report_signature_audit_immutable
  BEFORE UPDATE OR DELETE ON public.trip_report_signature_audit
  FOR EACH ROW EXECUTE FUNCTION public.tg_trip_report_signature_audit_immutable();

-- =====================================================
-- Post-approval lock on signed content
--
-- Once a trip_report row reaches report_status='approved_and_signed', the
-- signed payload (responses, narrative, attendees, CRF entries, action
-- items, attachments, reviewer comments, signature columns) is frozen at
-- the DB level. The only sanctioned exit is the void path, which sets
-- report_status to 'returned' (and therefore changes OLD.report_status
-- from approved_and_signed via the same UPDATE — that case is handled by
-- only blocking when OLD.report_status is approved_and_signed AND the
-- NEW.report_status is also approved_and_signed, OR when the NEW row
-- still claims approved_and_signed but a locked column is being mutated.
--
-- Post-visit milestone dates remain editable per the locked-in product
-- decision (lock_content_only).
-- =====================================================

CREATE OR REPLACE FUNCTION public.tg_trip_reports_lock_signed_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  unlocking BOOLEAN;
BEGIN
  IF OLD.report_status IS DISTINCT FROM 'approved_and_signed' THEN
    RETURN NEW;
  END IF;

  -- Allow the void path: the only legal exit from approved_and_signed is
  -- a transition to 'returned'. We allow the row to also clear the
  -- approver / approval_signature columns in that same UPDATE.
  unlocking := (NEW.report_status = 'returned');

  IF NOT unlocking THEN
    -- Signature manifestation columns: never editable post-approval.
    IF NEW.author_submission_signature_data    IS DISTINCT FROM OLD.author_submission_signature_data
    OR NEW.author_submission_signed_at         IS DISTINCT FROM OLD.author_submission_signed_at
    OR NEW.author_submission_printed_name      IS DISTINCT FROM OLD.author_submission_printed_name
    OR NEW.author_submission_attestation_text  IS DISTINCT FROM OLD.author_submission_attestation_text
    OR NEW.author_submission_signed_at_db      IS DISTINCT FROM OLD.author_submission_signed_at_db
    OR NEW.author_submission_content_hash      IS DISTINCT FROM OLD.author_submission_content_hash
    OR NEW.approval_signature_data             IS DISTINCT FROM OLD.approval_signature_data
    OR NEW.approval_signed_at                  IS DISTINCT FROM OLD.approval_signed_at
    OR NEW.approval_printed_name               IS DISTINCT FROM OLD.approval_printed_name
    OR NEW.approval_attestation_text           IS DISTINCT FROM OLD.approval_attestation_text
    OR NEW.approval_signed_at_db               IS DISTINCT FROM OLD.approval_signed_at_db
    OR NEW.approval_content_hash               IS DISTINCT FROM OLD.approval_content_hash
    OR NEW.approved_by                         IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_date                       IS DISTINCT FROM OLD.approved_date
    OR NEW.report_status                       IS DISTINCT FROM OLD.report_status
    THEN
      RAISE EXCEPTION
        'trip_reports row %: signature/approval columns are locked once the report is approved_and_signed (use voidApproval to unlock)',
        OLD.id;
    END IF;

    -- Signed content columns: narrative, reviewer section comments, and
    -- per-question response data is owned by trip_report_question_responses
    -- (RLS + the same trigger pattern is applied at write-time on those
    -- child tables via the trip_reports_update RLS policy below; this
    -- trigger fires on the parent only). The narrative column lives on
    -- trip_reports itself.
    IF NEW.narrative IS DISTINCT FROM OLD.narrative
    OR NEW.reviewer_comments_site_attendees IS DISTINCT FROM OLD.reviewer_comments_site_attendees
    OR NEW.reviewer_comments_sponsor_attendees IS DISTINCT FROM OLD.reviewer_comments_sponsor_attendees
    OR NEW.reviewer_comments_monitored_crfs IS DISTINCT FROM OLD.reviewer_comments_monitored_crfs
    OR NEW.reviewer_comments_narrative IS DISTINCT FROM OLD.reviewer_comments_narrative
    OR NEW.reviewer_comments_open_actions IS DISTINCT FROM OLD.reviewer_comments_open_actions
    OR NEW.reviewer_comments_attachments IS DISTINCT FROM OLD.reviewer_comments_attachments
    THEN
      RAISE EXCEPTION
        'trip_reports row %: signed report content is locked once the report is approved_and_signed',
        OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_reports_lock_signed_columns
  ON public.trip_reports;
CREATE TRIGGER trg_trip_reports_lock_signed_columns
  BEFORE UPDATE ON public.trip_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_trip_reports_lock_signed_columns();

-- =====================================================
-- Tightened RLS: trip_reports UPDATE
--
-- Replace the 20260315500000 company-wide trip_reports_update policy with
-- a CRA-or-CPM-on-study check (mirrors canViewTripReportContent). Company
-- admins retain UPDATE so they can void approvals.
-- =====================================================

DROP POLICY IF EXISTS "trip_reports_update" ON public.trip_reports;
CREATE POLICY "trip_reports_update" ON public.trip_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_visits mv
      JOIN public.studies s ON mv.study_id = s.id
      WHERE mv.id = trip_reports.visit_id
        AND s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND (
      (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
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
