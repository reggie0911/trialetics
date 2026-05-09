-- =============================================================================
-- NUCLEAR WIPE — ALL PUBLIC DATA + ALL AUTH USERS (Supabase / Postgres)
-- =============================================================================
--
-- Purpose: Full dev/staging reset — removes every row from public application
-- tables (in FK-safe order), then deletes every auth user. Schema, RLS policies,
-- triggers, and storage bucket definitions are preserved.
--
-- STORAGE: Hosted Supabase blocks direct DELETE on storage.objects
-- (storage.protect_delete). Clear files with the Storage API first or after:
--   node supabase/scripts/wipe_storage.mjs
--   (set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
--
-- HOW TO RUN
--   • Supabase Dashboard → SQL Editor, as postgres or a role that bypasses RLS.
--   • psql:
--       psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/wipe_all_data.sql
--     Use the Postgres connection (port 5432), not the PostgREST URL.
--
-- SAFETY
--   • Irreversible without backup or PITR. Do not run on production unless
--     you intend to destroy all tenant data and accounts.
--   • The main transaction is wrapped in BEGIN/COMMIT below — review, then run.
--   • Pre-check queries are included; run them alone first if desired.
--
-- NOTES
--   • Tables dropped in later migrations (e.g. kanban task_labels, subject_milestones,
--     site_startup_checklist, study_visit_crfs) are not referenced here.
--   • The transaction sets `SET LOCAL session_replication_role = 'replica'` so the
--     following BEFORE DELETE / BEFORE UPDATE guards (which RAISE EXCEPTION) do not
--     fire and the wipe can proceed:
--       – Part 11 trip_report_status_events / trip_report_signature_audit
--       – Finance Module fm_audit_logs (append-only)
--       – Finance Module fm_budget_versions / fm_budget_line_items immutability
--       – Copilot append-only logs: copilot_audit_log, copilot_draft_versions,
--         copilot_fill_audit
--     `SET LOCAL` is reverted automatically at COMMIT/ROLLBACK.
--   • After wipe, new signups still get company + profile via handle_new_user.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRE-CHECKS (run alone; inspect counts — optional)
-- -----------------------------------------------------------------------------
-- SELECT 'studies' AS t, COUNT(*)::bigint AS n FROM public.studies
-- UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
-- UNION ALL SELECT 'companies', COUNT(*) FROM public.companies
-- UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users
-- UNION ALL SELECT 'storage.objects', COUNT(*) FROM storage.objects;

BEGIN;

-- Bypass user-defined triggers for this transaction so RAISE EXCEPTION guards do
-- not fire on append-only / immutable tables: Part 11 trip_report_status_events,
-- trip_report_signature_audit; Finance Module fm_audit_logs, fm_budget_versions,
-- fm_budget_line_items; Copilot copilot_audit_log, copilot_draft_versions,
-- copilot_fill_audit. Reverted automatically at COMMIT.
SET LOCAL session_replication_role = 'replica';

-- =============================================================================
-- SECTION 1 — Storage (run wipe_storage.mjs; SQL DELETE is blocked on hosted Supabase)
-- =============================================================================
-- DELETE FROM storage.objects;  -- not allowed: use node supabase/scripts/wipe_storage.mjs

-- =============================================================================
-- SECTION 2 — Tracker / upload domains (leaf → parent)
-- =============================================================================
DELETE FROM public.sdv_sdv_data;
DELETE FROM public.sdv_site_data;
DELETE FROM public.sdv_uploads;
DELETE FROM public.sdv_reports;

DELETE FROM public.mc_column_configs;
DELETE FROM public.mc_records;
DELETE FROM public.mc_uploads;
DELETE FROM public.mc_header_mappings;

DELETE FROM public.vw_column_configs;
DELETE FROM public.vw_records;
DELETE FROM public.vw_uploads;
DELETE FROM public.vw_header_mappings;

DELETE FROM public.ecrf_column_configs;
DELETE FROM public.ecrf_records;
DELETE FROM public.ecrf_uploads;
DELETE FROM public.ecrf_header_mappings;

DELETE FROM public.column_configs;
DELETE FROM public.patients;
DELETE FROM public.patient_uploads;
DELETE FROM public.header_mappings;

DELETE FROM public.ae_column_configs;
DELETE FROM public.ae_records;
DELETE FROM public.ae_uploads;
DELETE FROM public.ae_header_mappings;

DELETE FROM public.custom_field_values;
DELETE FROM public.custom_fields;
DELETE FROM public.custom_tracker_definitions;

-- =============================================================================
-- SECTION 3 — Brand-Forge
-- =============================================================================
DELETE FROM public.bf_share_links;
DELETE FROM public.bf_brand_kit_versions;
DELETE FROM public.bf_exports;
DELETE FROM public.bf_mockups;
DELETE FROM public.bf_material_themes;
DELETE FROM public.bf_recruitment_kits;
DELETE FROM public.bf_brand_directions;
DELETE FROM public.bf_brand_kits;
DELETE FROM public.bf_logo_concepts;
DELETE FROM public.bf_brand_inputs;
DELETE FROM public.bf_projects;

-- =============================================================================
-- SECTION 4 — Time & expense
-- =============================================================================
DELETE FROM public.expense_approval_decisions;
DELETE FROM public.timesheet_approval_decisions;
DELETE FROM public.expense_receipt_files;
DELETE FROM public.expense_lines;
DELETE FROM public.expense_reports;
DELETE FROM public.timesheet_entries;
DELETE FROM public.timesheet_periods;
DELETE FROM public.time_expense_approval_templates;
DELETE FROM public.expense_categories;
DELETE FROM public.time_activity_types;
DELETE FROM public.company_time_expense_settings;

-- =============================================================================
-- SECTION 5 — EISF
-- =============================================================================
DELETE FROM public.eisf_audit_log;
DELETE FROM public.eisf_review_events;
DELETE FROM public.eisf_document_request_comments;
DELETE FROM public.eisf_document_requests;
DELETE FROM public.eisf_required_document_rules;
DELETE FROM public.eisf_document_versions;
DELETE FROM public.eisf_documents;
DELETE FROM public.eisf_site_folders;
DELETE FROM public.eisf_document_categories;

-- =============================================================================
-- SECTION 6 — eTMF (includes TMF reference catalog — full nuclear wipe)
-- =============================================================================
DELETE FROM public.etmf_audit_log;
DELETE FROM public.etmf_documents;
DELETE FROM public.etmf_staff_expected_documents;
DELETE FROM public.etmf_expected_documents;
DELETE FROM public.tmf_reference_model;

-- =============================================================================
-- SECTION 7 — IP management
-- =============================================================================
DELETE FROM public.ip_order_documents;
DELETE FROM public.ip_ledger_entries;
DELETE FROM public.ip_lot_locations;
DELETE FROM public.ip_lots;
DELETE FROM public.ip_item_site_links;
DELETE FROM public.ip_orders;
DELETE FROM public.ip_items;

-- =============================================================================
-- SECTION 8 — Visit / trip reports & monitoring
-- =============================================================================
-- trip_report_status_events / trip_report_signature_audit have BEFORE DELETE
-- triggers that RAISE EXCEPTION (Part 11). The session_replication_role = replica
-- set above lets these DELETEs succeed.
-- trip_reports.template_version_id is RESTRICT, so version tables must be wiped
-- after trip_reports. visit_report_template_versions.template_id is RESTRICT,
-- so versions must be wiped before templates.
DELETE FROM public.trip_report_status_events;
DELETE FROM public.trip_report_signature_audit;
DELETE FROM public.trip_report_action_items;
DELETE FROM public.trip_report_crf_entries;
DELETE FROM public.trip_report_attendees;
DELETE FROM public.trip_report_question_responses;
DELETE FROM public.visit_report_attachments;
DELETE FROM public.follow_up_items;
DELETE FROM public.trip_report_findings;
DELETE FROM public.trip_reports;
DELETE FROM public.visit_report_template_question_versions;
DELETE FROM public.visit_report_template_versions;
DELETE FROM public.visit_report_template_questions;
DELETE FROM public.visit_report_templates;
DELETE FROM public.monitoring_visits;

-- =============================================================================
-- SECTION 9 — Tasks & study milestones (post–kanban-rebuild schema)
-- =============================================================================
DELETE FROM public.task_comments;
DELETE FROM public.tasks;
DELETE FROM public.study_milestones;

-- =============================================================================
-- SECTION 10 — Financials
-- =============================================================================
DELETE FROM public.finance_transaction_log;
DELETE FROM public.finance_payment_allocations;
DELETE FROM public.finance_payments;
DELETE FROM public.invoice_budget_allocations;
DELETE FROM public.finance_invoice_decisions;
DELETE FROM public.finance_invoices;
-- finance_purchase_orders (migration 20260504000000): optional table — some DBs
-- never had this migration; skip DELETE when the relation is absent.
DO $wipe_finance_purchase_orders$
BEGIN
  IF to_regclass('public.finance_purchase_orders') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.finance_purchase_orders';
  END IF;
END;
$wipe_finance_purchase_orders$;
DELETE FROM public.site_budget_line_items;
DELETE FROM public.site_budgets;
DELETE FROM public.financial_contracts;
DELETE FROM public.finance_approval_templates;
DELETE FROM public.study_procedure_visit_costs;
DELETE FROM public.budget_line_items;
DELETE FROM public.study_budget_sections;
DELETE FROM public.study_budgets;
-- eCRF chain: subject_crfs → study_crf*/study_ecrf_template_versions
-- (subject_crf_metric_events cascades from subject_crfs but is wiped explicitly).
-- study_ecrf_template_versions is RESTRICT-referenced by subject_crfs, study_crfs,
-- and study_crf_questions, so it must be wiped after them.
DELETE FROM public.subject_crf_metric_events;
DELETE FROM public.subject_crfs;
DELETE FROM public.study_crf_questions;
DELETE FROM public.study_crfs;
DELETE FROM public.study_ecrf_template_versions;
DELETE FROM public.study_visit_definitions;
DELETE FROM public.study_budget_templates;
DELETE FROM public.payment_schedules;
DELETE FROM public.site_payments;

-- =============================================================================
-- SECTION 10b — Finance Module (fm_*)
-- =============================================================================
-- All fm_* tables RESTRICT-reference public.studies (and most reference
-- public.companies / public.study_sites). They MUST be wiped before Section 13
-- (study_sites) and Section 14 (studies) or those deletes will fail.
--
-- Append-only / immutability triggers on fm_audit_logs, fm_budget_versions, and
-- fm_budget_line_items are bypassed by the session_replication_role = 'replica'
-- set at the top of this transaction.
--
-- Order: cross-cut leaves → audit/approvals/change-orders → site payment
-- schedules → invoice/payment chain → POs → budget line items → budget versions
-- (self-FK is SET NULL) → budget categories → budgets (active_version_id is
-- SET NULL) → contracts → vendors → workspaces.

-- Cross-cut leaf tables (study_id/company_id RESTRICT only)
DELETE FROM public.fm_table_view;
DELETE FROM public.fm_entity_comment;
DELETE FROM public.fm_approval_policy;
DELETE FROM public.fm_approval_delegation;
DELETE FROM public.fm_forecast_scenario;
DELETE FROM public.fm_export_job;
DELETE FROM public.fm_scheduled_report;

-- Audit, approvals, change orders (leaves)
DELETE FROM public.fm_audit_logs;
DELETE FROM public.fm_approval_requests;
DELETE FROM public.fm_change_orders;

-- Site payment schedules (RESTRICT → study_sites)
DELETE FROM public.fm_site_payment_schedules;

-- Invoice / payment chain
-- fm_payments.invoice_id is SET NULL; fm_invoice_line_items CASCADE from invoice.
DELETE FROM public.fm_payments;
DELETE FROM public.fm_invoice_line_items;
DELETE FROM public.fm_invoices;

-- Purchase orders (referenced by fm_invoices.purchase_order_id SET NULL)
DELETE FROM public.fm_purchase_orders;

-- Budget chain (children → parents)
-- fm_budget_line_items RESTRICT → budget_versions; line items also reference
-- categories RESTRICT and SET NULL FKs to vendors/contracts.
DELETE FROM public.fm_budget_line_items;
-- fm_budget_versions has self-FK supersedes_by_version_id ON DELETE SET NULL,
-- so a single DELETE clears all rows safely.
DELETE FROM public.fm_budget_versions;
DELETE FROM public.fm_budget_categories;
-- fm_budgets.active_version_id → fm_budget_versions ON DELETE SET NULL (handled).
DELETE FROM public.fm_budgets;

-- Contracts → vendors → workspaces (parents last)
DELETE FROM public.fm_contracts;
DELETE FROM public.fm_vendors;
DELETE FROM public.fm_workspaces;

-- =============================================================================
-- SECTION 10c — Copilot / AI suite (copilot_*)
-- =============================================================================
-- Tenant rows reference public.companies / auth.users with ON DELETE CASCADE
-- (or SET NULL on optional user FKs), so Section 17 alone would clean almost
-- everything. We delete explicitly here so:
--   • residual rows with company_id = NULL (e.g. some copilot_validation_runs)
--     are removed
--   • the Copilot domain is fully zeroed before Section 17 fires
--
-- Append-only triggers on copilot_audit_log, copilot_draft_versions, and
-- copilot_fill_audit are bypassed by the session_replication_role = 'replica'
-- set at the top of this transaction.
--
-- Inter-copilot FKs are all CASCADE (or SET NULL on copilot_fill_audit.proposal_id
-- and copilot_document_extractions.source_chunk_id), so child-first order below
-- is defensive rather than strictly required.

-- Briefings & memory & telemetry
DELETE FROM public.copilot_briefing_items;
DELETE FROM public.copilot_briefings;
DELETE FROM public.copilot_memory;
DELETE FROM public.copilot_audit_log;
DELETE FROM public.copilot_telemetry;

-- Documents (chunks/extractions/links CASCADE from copilot_documents)
DELETE FROM public.copilot_document_extractions;
DELETE FROM public.copilot_document_links;
DELETE FROM public.copilot_document_chunks;
DELETE FROM public.copilot_documents;

-- Drafts (versions CASCADE from drafts)
DELETE FROM public.copilot_draft_versions;
DELETE FROM public.copilot_drafts;

-- Work queues & collab
DELETE FROM public.copilot_work_queue_items;
DELETE FROM public.copilot_work_queues;
DELETE FROM public.copilot_collab_messages;
DELETE FROM public.copilot_collab_sessions;

-- Personas, playbooks, scenarios, readiness, reports, validation
DELETE FROM public.copilot_personas;
DELETE FROM public.copilot_playbook_runs;
DELETE FROM public.copilot_playbooks;
DELETE FROM public.copilot_scenarios;
DELETE FROM public.copilot_readiness_snapshots;
DELETE FROM public.copilot_report_definitions;
DELETE FROM public.copilot_validation_runs;

-- Form fills (fill_audit.proposal_id is SET NULL → audit can clear independently)
DELETE FROM public.copilot_fill_audit;
DELETE FROM public.copilot_proposals;
DELETE FROM public.copilot_field_mappings;
DELETE FROM public.copilot_templates;

-- =============================================================================
-- SECTION 11 — CTMS directory
-- =============================================================================
DELETE FROM public.directory_assignment_history;
DELETE FROM public.directory_audit_log;
DELETE FROM public.directory_comments;
DELETE FROM public.committee_members;
DELETE FROM public.committees;
DELETE FROM public.institution_study_site;
DELETE FROM public.institution_study;
DELETE FROM public.directory_contact_institution;
DELETE FROM public.directory_contact_study_site;
DELETE FROM public.directory_contact_study;
DELETE FROM public.directory_contact_secondary_roles;
DELETE FROM public.directory_contacts;
DELETE FROM public.institutions;
DELETE FROM public.directory_roles;
DELETE FROM public.directory_role_categories;

-- =============================================================================
-- SECTION 12 — Subjects & study team
-- =============================================================================
DELETE FROM public.subject_visit_events;
DELETE FROM public.subject_visits;
DELETE FROM public.subjects;
DELETE FROM public.study_team_members;
DELETE FROM public.team_roles;

-- =============================================================================
-- SECTION 13 — Sites, countries, regulatory
-- =============================================================================
-- site_startup_checklist was dropped in 20260316500000
DELETE FROM public.site_contacts;
DELETE FROM public.study_sites;
DELETE FROM public.regulatory_submissions;
DELETE FROM public.study_countries;

-- =============================================================================
-- SECTION 14 — Studies
-- =============================================================================
DELETE FROM public.studies;

-- =============================================================================
-- SECTION 15 — Reporting & analytics (CTMS reports module + KRIs)
-- =============================================================================
DELETE FROM public.report_exports_audit;
DELETE FROM public.report_runs_audit;
DELETE FROM public.report_definitions;
DELETE FROM public.kri_values;
DELETE FROM public.kri_definitions;
DELETE FROM public.saved_reports;

-- =============================================================================
-- SECTION 16 — Platform / company-level
-- =============================================================================
DELETE FROM public.transactions;
DELETE FROM public.platform_documentation;
DELETE FROM public.company_module_audit;
DELETE FROM public.docs_feedback;
DELETE FROM public.email_log;
DELETE FROM public.company_join_links;
DELETE FROM public.invitations;
DELETE FROM public.subscriptions;

-- =============================================================================
-- SECTION 17 — Core tenant tables
-- =============================================================================
DELETE FROM public.profiles;
DELETE FROM public.companies;

-- =============================================================================
-- SECTION 18 — Auth (requires privileged role; clears all login accounts)
-- =============================================================================
-- If DELETE fails on FK, uncomment and run these first (same transaction), then retry users:
-- DELETE FROM auth.sessions;
-- DELETE FROM auth.refresh_tokens;
-- DELETE FROM auth.mfa_factors;
-- DELETE FROM auth.identities;

DELETE FROM auth.users;

COMMIT;

-- =============================================================================
-- Done. Re-run PRE-CHECKS — all counts should be 0 (TMF catalog empty if wiped).
-- =============================================================================
