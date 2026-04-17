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
--   • Tables dropped in later migrations (e.g. kanban task_labels, subject_milestones)
--     are not referenced here.
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
DELETE FROM public.trip_report_status_events;
DELETE FROM public.visit_report_attachments;
DELETE FROM public.trip_report_action_items;
DELETE FROM public.trip_report_crf_entries;
DELETE FROM public.trip_report_attendees;
DELETE FROM public.trip_report_question_responses;
DELETE FROM public.follow_up_items;
DELETE FROM public.trip_report_findings;
DELETE FROM public.trip_reports;
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
DELETE FROM public.site_budget_line_items;
DELETE FROM public.site_budgets;
DELETE FROM public.financial_contracts;
DELETE FROM public.finance_approval_templates;
DELETE FROM public.study_procedure_visit_costs;
DELETE FROM public.budget_line_items;
DELETE FROM public.study_budget_sections;
DELETE FROM public.study_budgets;
DELETE FROM public.study_visit_definitions;
DELETE FROM public.study_budget_templates;
DELETE FROM public.payment_schedules;
DELETE FROM public.site_payments;

-- =============================================================================
-- SECTION 11 — CTMS directory
-- =============================================================================
DELETE FROM public.directory_assignment_history;
DELETE FROM public.directory_audit_log;
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
