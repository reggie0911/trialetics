-- =====================================================================
-- Trip-report bulk signing: signing_session_id on the audit table.
--
-- 21 CFR 11.200(a)(1)(ii) allows subsequent signings within a single
-- continuous controlled session to use only one identification component
-- after the initial two-factor challenge. The bulk-approve flow
-- (`approveReportsBulk`) issues one password reverification + one
-- printed-name + one attestation challenge per batch and then writes one
-- signature audit row per report. To keep the per-record manifestation
-- AND tie the rows back to the single session a regulator would ask
-- about, we stamp every audit row in the batch with a shared UUID.
--
-- Single-report signings keep `signing_session_id = NULL` (no behavior
-- change for the existing per-report `submitReport` / `approveReport`
-- / `voidApproval` flows).
--
-- The append-only triggers added in
-- 20260602000000_trip_report_part11_controls.sql continue to apply:
-- the column can only ever be written on INSERT; UPDATE/DELETE on the
-- audit table is blocked at the trigger level.
-- =====================================================================

ALTER TABLE public.trip_report_signature_audit
  ADD COLUMN IF NOT EXISTS signing_session_id UUID NULL;

-- Partial index because the vast majority of rows (single-report
-- signings) will have NULL here; only batch signings populate it and
-- those are the only rows we ever look up by session.
CREATE INDEX IF NOT EXISTS idx_trip_report_signature_audit_session
  ON public.trip_report_signature_audit (signing_session_id)
  WHERE signing_session_id IS NOT NULL;
