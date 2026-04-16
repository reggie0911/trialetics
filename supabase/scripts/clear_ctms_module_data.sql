-- =============================================================================
-- CLEAR CTMS MODULE DATA (Supabase / Postgres)
-- =============================================================================
--
-- Primary operation: DELETE rows from public.studies for a company (or all).
-- Most tables that hang off studies use ON DELETE CASCADE, so this one DELETE
-- removes the operational CTMS graph for those studies, including (non-exhaustive):
--   study_countries, study_sites, subjects/visits, milestones/tasks, team members,
--   visit monitoring & reporting, trip reports, Kanban rows tied to studies,
--   financial rows scoped to study_id, study budgets / invoices / payments,
--   eTMF study documents, eISF rows, time & expense rows, IP catalog rows
--   tied to study_id, directory junctions that reference studies, etc.
--
-- Rows that only SET NULL on study delete (e.g. invitations.study_id,
-- company_join_links.study_id, kanban_boards.study_id, committees.study_id,
-- visit_report_templates.study_id) are updated by the FK; parent rows remain.
--
-- What this does NOT remove by itself:
--   • Company-level directory: institutions, directory_contacts, committees
--     (except study_id nulled), directory audit/history — see SECTION C.
--   • finance_approval_templates (company-level) — see SECTION B.
--   • custom_tracker_definitions / custom_field_values (platform tracker config)
--     — company-scoped; delete only if you intend to wipe tracker config.
--   • companies, profiles, storage objects — never touched here.
--
-- ---------------------------------------------------------------------------
-- HOW TO RUN
-- ---------------------------------------------------------------------------
-- • Supabase Dashboard → SQL Editor, as a role that bypasses RLS (postgres /
--   service role). Anon/authenticated keys cannot delete all tenant rows.
-- • psql:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/clear_ctms_module_data.sql
--   Use the Postgres connection (port 5432), not the PostgREST URL.
--
-- ---------------------------------------------------------------------------
-- SAFETY
-- ---------------------------------------------------------------------------
-- Irreversible without backup or PITR. Test on staging first.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pre-check (run alone; inspect counts)
-- -----------------------------------------------------------------------------
-- SELECT id, protocol_number, status FROM public.studies WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;
-- SELECT COUNT(*)::bigint AS n FROM public.studies WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- =============================================================================
-- SECTION A — Remove all studies for one company (recommended)
-- =============================================================================
-- 1. Replace YOUR_COMPANY_UUID below with the target company id.
-- 2. Uncomment BEGIN … COMMIT and the DELETE.
-- =============================================================================

-- BEGIN;

-- DELETE FROM public.studies
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- COMMIT;

-- =============================================================================
-- SECTION A2 — Nuclear option: remove every study in the database
-- =============================================================================
-- Same CASCADE behavior as SECTION A, but across all tenants. Use only on a
-- dev/staging reset. Uncomment with extreme care.

-- BEGIN;

-- DELETE FROM public.studies;

-- COMMIT;

-- =============================================================================
-- SECTION B — Optional: company-level finance invoice templates (after Section A)
-- =============================================================================
-- studies.finance_approval_template_id uses ON DELETE SET NULL; deleting
-- studies does not remove templates. Uncomment if you want templates gone too.

-- BEGIN;

-- DELETE FROM public.finance_approval_templates
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- COMMIT;

-- =============================================================================
-- SECTION C — Optional: CTMS directory data for the company (after Section A)
-- =============================================================================
-- Clears institutions, contacts, committees, and directory audit/history for
-- the company. Does not delete global catalog tables directory_roles /
-- directory_role_categories.
-- Order respects FKs: committees (cascade members) → audit/history → contacts → institutions.

-- BEGIN;

-- DELETE FROM public.committees
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- DELETE FROM public.directory_audit_log
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- DELETE FROM public.directory_assignment_history
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- DELETE FROM public.directory_contacts
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- DELETE FROM public.institutions
-- WHERE company_id = 'YOUR_COMPANY_UUID'::uuid;

-- COMMIT;

-- =============================================================================
-- Done. Table structures are preserved; only data matching the sections you
-- uncommented are removed.
-- =============================================================================
