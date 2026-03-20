import type { SupabaseClient } from '@supabase/supabase-js';

import type { TeamMemberRole } from '@/lib/types/ctms';

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '23505' ||
    error.message?.includes('duplicate') === true ||
    error.message?.includes('unique') === true
  );
}

/**
 * Complete pending email invitation: mark accepted and insert study_team_members when study_id set.
 * Idempotent for duplicate (study_id, profile_id, role).
 */
export async function applyPendingInvitationStudyAssignment(
  admin: SupabaseClient,
  input: { profileId: string; companyId: string; email: string }
): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();

  const { data: inv, error: invErr } = await admin
    .from('invitations')
    .select('id, study_id, study_role')
    .eq('company_id', input.companyId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (invErr) {
    console.error('[applyPendingInvitationStudyAssignment] invitation fetch:', invErr.message);
    return { ok: false, error: invErr.message };
  }

  if (!inv) {
    return { ok: true };
  }

  const { error: updErr } = await admin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', inv.id)
    .eq('status', 'pending');

  if (updErr) {
    console.error('[applyPendingInvitationStudyAssignment] invitation update:', updErr.message);
    return { ok: false, error: updErr.message };
  }

  if (!inv.study_id) {
    return { ok: true };
  }

  const role = (inv.study_role || 'clinical_research_associate') as TeamMemberRole;

  const { error: insErr } = await admin.from('study_team_members').insert({
    study_id: inv.study_id,
    profile_id: input.profileId,
    role,
  });

  if (insErr) {
    if (isUniqueViolation(insErr)) {
      return { ok: true };
    }
    console.error('[applyPendingInvitationStudyAssignment] study_team_members insert:', insErr.message);
    return { ok: false, error: insErr.message };
  }

  return { ok: true };
}

export const JOIN_STUDY_ID_META_KEY = 'join_study_id';
export const JOIN_STUDY_ROLE_META_KEY = 'join_study_role';

/**
 * Create study_team_members from join-link signUp metadata (join_study_id / join_study_role).
 * Validates study belongs to the same company as the profile.
 */
export async function applyJoinLinkStudyAssignmentFromUserMetadata(
  admin: SupabaseClient,
  input: { profileId: string; companyId: string; userMetadata: Record<string, unknown> }
): Promise<{ ok: boolean; error?: string }> {
  const joinStudyId = input.userMetadata[JOIN_STUDY_ID_META_KEY];
  if (joinStudyId == null || joinStudyId === '') {
    return { ok: true };
  }
  const studyIdStr = String(joinStudyId);

  const { data: study, error: studyErr } = await admin
    .from('studies')
    .select('id, company_id')
    .eq('id', studyIdStr)
    .maybeSingle();

  if (studyErr) {
    console.error('[applyJoinLinkStudyAssignmentFromUserMetadata] study fetch:', studyErr.message);
    return { ok: false, error: studyErr.message };
  }
  if (!study) {
    console.error('[applyJoinLinkStudyAssignmentFromUserMetadata] study not found');
    return { ok: false, error: 'Study not found' };
  }
  if (study.company_id !== input.companyId) {
    console.error('[applyJoinLinkStudyAssignmentFromUserMetadata] study company mismatch');
    return { ok: false, error: 'Study does not belong to this company' };
  }

  const roleRaw = input.userMetadata[JOIN_STUDY_ROLE_META_KEY];
  const role = (roleRaw != null && roleRaw !== '' ? String(roleRaw) : 'clinical_research_associate') as TeamMemberRole;

  const { error: insErr } = await admin.from('study_team_members').insert({
    study_id: studyIdStr,
    profile_id: input.profileId,
    role,
  });

  if (insErr) {
    if (isUniqueViolation(insErr)) {
      return { ok: true };
    }
    console.error('[applyJoinLinkStudyAssignmentFromUserMetadata] study_team_members insert:', insErr.message);
    return { ok: false, error: insErr.message };
  }

  return { ok: true };
}
