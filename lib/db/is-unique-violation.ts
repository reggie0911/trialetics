/**
 * True for Postgres unique-constraint violations (SQLSTATE 23505), or when the
 * driver only surfaces a message containing "duplicate" / "unique".
 *
 * Use to make idempotent inserts safe (e.g. study_team_members assignments
 * keyed by `UNIQUE(study_id, profile_id, role)`).
 */
export function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '23505' ||
    error.message?.includes('duplicate') === true ||
    error.message?.includes('unique') === true
  );
}
