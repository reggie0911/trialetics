-- =====================================================
-- Backfill: ensure every study has a study_team_members row
-- =====================================================
-- Context:
--   The Team tab filters members through `scopeTeamMembersToStudy`, which
--   only returns profiles that have at least one row in `study_team_members`
--   for the current study. Historically `createStudy` did NOT auto-assign
--   the creator, so for older studies the Team tab can render empty even
--   though a company admin set the study up.
--
--   `studies` has no `created_by` column, so we approximate "the initial
--   admin who set up the study" with the earliest-created admin profile in
--   the same company. One row per study, role = 'clinical_project_manager',
--   is_active = true. Idempotent via NOT EXISTS so re-running is a no-op.
--
-- Going-forward inserts are handled in `lib/actions/studies.ts > createStudy`.

INSERT INTO public.study_team_members (study_id, profile_id, role, is_active)
SELECT
  s.id AS study_id,
  first_admin.profile_id,
  'clinical_project_manager' AS role,
  true AS is_active
FROM public.studies s
JOIN LATERAL (
  SELECT p.id AS profile_id
  FROM public.profiles p
  WHERE p.company_id = s.company_id
    AND p.role = 'admin'
  ORDER BY p.created_at ASC NULLS LAST, p.id ASC
  LIMIT 1
) first_admin ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.study_team_members existing
  WHERE existing.study_id = s.id
);
