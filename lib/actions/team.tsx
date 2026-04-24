'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritable, assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import { createAdminClient } from '@/lib/server-admin';
import { sendEmail } from '@/lib/email';
import { InviteUser } from '@/emails/invite-user';
import { AddedToStudy } from '@/emails/added-to-study';
import { isUniqueViolation } from '@/lib/db/is-unique-violation';
import type {
  TeamRole,
  StudyTeamMember,
  StudyTeamMemberWithProfile,
  TeamMemberRole,
  TeamMemberWithStudies,
} from '@/lib/types/ctms';
import { TEAM_ROLE_LABEL } from '@/lib/types/ctms';
import { studySelectLabel } from '@/lib/ctms/study-display';
import {
  JOIN_STUDY_ID_META_KEY,
  JOIN_STUDY_ROLE_META_KEY,
} from '@/lib/auth/study-assignment-on-signup';

const STUDY_TEAM_ROLE_CONSTRAINT_HINT =
  'Study role is not allowed by the database. Apply pending Supabase migrations (e.g. 20260325000000 or 20260327000000) so study_team_members roles match the app.';

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

async function getAdminProfile(): Promise<{ id: string; company_id: string; role: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile;
}

// =====================================================
// Team Roles
// =====================================================

export async function getTeamRoles(): Promise<TeamRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team_roles')
    .select('*')
    .order('role_name');
  if (error) throw new Error(error.message);
  return (data as unknown as TeamRole[]) ?? [];
}

export async function createTeamRole(
  roleName: string,
  description?: string
): Promise<{ data: TeamRole | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('team_roles')
      .insert({
        company_id: companyId,
        role_name: roleName,
        description: description || null,
      })
      .select()
      .single();
    if (error) {
      if (error.message.includes('duplicate')) {
        return { data: null, error: 'A role with this name already exists.' };
      }
      return { data: null, error: error.message };
    }
    revalidatePath('/protected/team');
    revalidatePath('/protected/studies', 'layout');
    return { data: data as unknown as TeamRole, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteTeamRole(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('team_roles').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/protected/team');
    revalidatePath('/protected/studies', 'layout');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Study Team Members
// =====================================================

export async function getStudyTeamMembers(studyId: string): Promise<StudyTeamMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_team_members')
    .select('*, profiles(first_name, last_name, email, avatar_url), team_roles(role_name), study_sites(site_number, name)')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyTeamMemberWithProfile[]) ?? [];
}

export async function getCompanyProfiles(): Promise<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('company_id', companyId)
    .order('first_name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface AddTeamMemberInput {
  study_id: string;
  profile_id: string;
  role: TeamMemberRole;
  custom_role_id?: string;
  site_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function addTeamMember(
  input: AddTeamMemberInput
): Promise<{ data: StudyTeamMember | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data, error } = await supabase
      .from('study_team_members')
      .insert({
        study_id: input.study_id,
        profile_id: input.profile_id,
        role: input.role,
        custom_role_id: input.custom_role_id || null,
        site_id: input.site_id || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return { data: null, error: 'This person already has this role on this study.' };
      }
      if (error.message.includes('study_team_members_role_check')) {
        return { data: null, error: STUDY_TEAM_ROLE_CONSTRAINT_HINT };
      }
      return { data: null, error: error.message };
    }

    revalidateStudyCtmsLayout(input.study_id);
    revalidatePath('/protected/team');
    return { data: data as unknown as StudyTeamMember, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface UpdateTeamMemberInput {
  id: string;
  study_id: string;
  role?: TeamMemberRole;
  custom_role_id?: string;
  site_id?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export async function updateTeamMember(
  input: UpdateTeamMemberInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { error: writeGuard };

    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('study_team_members')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) {
      if (error.message.includes('study_team_members_role_check')) {
        return { error: STUDY_TEAM_ROLE_CONSTRAINT_HINT };
      }
      return { error: error.message };
    }

    revalidateStudyCtmsLayout(study_id);
    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function removeTeamMember(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase
      .from('study_team_members')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Company-wide Team Directory
// =====================================================

export async function getTeamDirectory(): Promise<TeamMemberWithStudies[]> {
  const companyId = await getCompanyId();
  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, user_id, first_name, last_name, email, avatar_url, role')
    .eq('company_id', companyId)
    .order('first_name');

  if (profilesError) throw new Error(profilesError.message);
  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p) => p.id);

  const { data: assignments, error: assignError } = await admin
    .from('study_team_members')
    .select('id, study_id, profile_id, role, is_active, custom_role_id, team_roles(role_name), studies(title, study_name, protocol_number), study_sites(name)')
    .in('profile_id', profileIds);

  if (assignError) throw new Error(assignError.message);

  // Best-effort fetch of last sign-in from auth.users via the admin API.
  // Failures here are non-fatal — the directory still renders without "Last Active".
  const lastSignInByUserId = new Map<string, string | null>();
  try {
    let page = 1;
    const perPage = 200;
    // Cap pagination to avoid runaway loops in unexpectedly large companies.
    for (let i = 0; i < 25; i++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const users = data?.users ?? [];
      if (users.length === 0) break;
      for (const u of users) {
        lastSignInByUserId.set(u.id, u.last_sign_in_at ?? null);
      }
      if (users.length < perPage) break;
      page += 1;
    }
  } catch {
    // Swallow — last_sign_in_at will be null for everyone.
  }

  return profiles.map((profile) => {
    const memberAssignments = (assignments ?? [])
      .filter((a: Record<string, unknown>) => a.profile_id === profile.id)
      .map((a: Record<string, unknown>) => {
        const studyRecord = a.studies as
          | { title?: string | null; study_name?: string | null; protocol_number?: string | null }
          | null;
        const studyLabel = studyRecord
          ? studySelectLabel({
              study_name: studyRecord.study_name ?? null,
              protocol_number: studyRecord.protocol_number ?? '',
              title: studyRecord.title ?? '—',
            })
          : '—';
        return {
          id: a.id as string,
          study_id: a.study_id as string,
          study_title: studyLabel,
          protocol_number: (studyRecord?.protocol_number ?? '').trim(),
          role: a.role as TeamMemberRole,
          custom_role_name: (a.team_roles as Record<string, unknown> | null)?.role_name as string | null,
          site_name: (a.study_sites as Record<string, unknown> | null)?.name as string | null,
          is_active: a.is_active as boolean,
        };
      });

    return {
      profile_id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      app_role: (profile.role as 'admin' | 'user') ?? 'user',
      last_sign_in_at: lastSignInByUserId.get(profile.user_id as string) ?? null,
      assignments: memberAssignments,
    };
  });
}

/**
 * Best-effort company domain for the current user's company. Used by the
 * Study Team dashboard's "External Users" KPI to flag members whose email
 * domain doesn't match the org. There is no `companies.domain` column
 * today, so we derive from the most common email domain among admins, then
 * fall back to the requesting user's domain.
 */
export async function getCompanyDomain(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, email')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return null;

    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from('profiles')
      .select('email, role')
      .eq('company_id', profile.company_id);

    const domainCounts = new Map<string, number>();
    for (const row of profiles ?? []) {
      const email = (row as { email?: string | null }).email ?? '';
      const role = (row as { role?: string | null }).role ?? '';
      const at = email.indexOf('@');
      if (at < 0) continue;
      const domain = email.slice(at + 1).toLowerCase().trim();
      if (!domain) continue;
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + (role === 'admin' ? 2 : 1));
    }

    if (domainCounts.size > 0) {
      let best: string | null = null;
      let bestCount = -1;
      for (const [domain, count] of domainCounts) {
        if (count > bestCount) {
          best = domain;
          bestCount = count;
        }
      }
      if (best) return best;
    }

    const fallbackEmail = (profile.email as string | null) ?? user.email ?? null;
    if (!fallbackEmail) return null;
    const at = fallbackEmail.indexOf('@');
    return at >= 0 ? fallbackEmail.slice(at + 1).toLowerCase().trim() : null;
  } catch {
    return null;
  }
}

// =====================================================
// Profile Management
// =====================================================

export interface UpdateProfileInput {
  profile_id: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'user';
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { profile_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(cleanUpdates)
      .eq('id', profile_id);

    if (error) return { error: error.message };

    revalidatePath('/protected/team');
    revalidatePath('/protected/studies', 'layout');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Pending Invitations
// =====================================================

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  invited_at: string;
  invited_by_name?: string;
}

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  try {
    const supabase = await createClient();
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, role, first_name, last_name, invited_at, invited_by')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .gt('invited_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('invited_at', { ascending: false });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        const msg = (error as { message?: string; code?: string }).message
          ?? (error as { code?: string }).code
          ?? Object.prototype.toString.call(error);
        console.warn('getPendingInvitations:', msg);
      }
      return [];
    }

    if (!data || data.length === 0) return [];

    const inviterIds = [...new Set(data.map((r: Record<string, unknown>) => r.invited_by as string).filter(Boolean))];
    if (inviterIds.length === 0) {
      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        email: row.email as string,
        role: row.role as string,
        first_name: row.first_name as string | null,
        last_name: row.last_name as string | null,
        invited_at: row.invited_at as string,
        invited_by_name: undefined,
      }));
    }

    const { data: inviterProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', inviterIds);

    const inviterMap = new Map(
      (inviterProfiles ?? []).map((p: Record<string, unknown>) => [
        p.id,
        [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || undefined,
      ])
    );

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      email: row.email as string,
      role: row.role as string,
      first_name: row.first_name as string | null,
      last_name: row.last_name as string | null,
      invited_at: row.invited_at as string,
      invited_by_name: inviterMap.get(row.invited_by as string),
    }));
  } catch {
    return [];
  }
}

// =====================================================
// Invite User
// =====================================================

export interface InviteUserInput {
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'user';
  study_id: string;
  study_role: TeamMemberRole;
}

export async function inviteUser(
  input: InviteUserInput
): Promise<{ data: { invited: boolean } | null; error: string | null }> {
  try {
    const profile = await getAdminProfile();
    if (profile.role !== 'admin') {
      return { data: null, error: 'Only admins can invite users.' };
    }

    const { email, first_name, last_name, role, study_id, study_role } = input;
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      return { data: null, error: 'Email is required.' };
    }
    if (!study_id?.trim()) {
      return { data: null, error: 'Study is required.' };
    }
    if (!study_role) {
      return { data: null, error: 'Study role is required.' };
    }

    const supabaseCheck = await createClient();
    const { data: study } = await supabaseCheck
      .from('studies')
      .select('id, study_name, protocol_number')
      .eq('id', study_id)
      .eq('company_id', profile.company_id)
      .single();
    if (!study) {
      return { data: null, error: 'Invalid study selected.' };
    }

    const { error: writeGuard } = await assertStudyWritable(supabaseCheck, study_id, profile.company_id);
    if (writeGuard) return { data: null, error: writeGuard };

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { data: null, error: 'Email invite is not configured. Contact support.' };
    }

    const supabase = await createClient();
    const { data: invitationRow, error: inviteErr } = await supabase
      .from('invitations')
      .upsert(
        {
          company_id: profile.company_id,
          email: emailTrimmed,
          role,
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          invited_by: profile.id,
          status: 'pending',
          invited_at: new Date().toISOString(),
          study_id,
          study_role,
        },
        { onConflict: 'company_id,email' }
      )
      .select('id, invited_at')
      .single();

    if (inviteErr || !invitationRow) {
      console.error('Invitation record upsert error:', inviteErr);
      return {
        data: null,
        error: `Could not save invitation: ${inviteErr?.message ?? 'unknown error'}`,
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const admin = createAdminClient();

    const inviterContext = await loadInviterContext(profile.id, profile.company_id);
    const studyLabel =
      (study.study_name as string | null)?.trim() ||
      (study.protocol_number as string | null)?.trim() ||
      null;
    const roleLabel = TEAM_ROLE_LABEL[study_role] ?? null;
    const inviteeFirstName = first_name?.trim() ?? '';

    // If the email already belongs to a profile in this company, skip the
    // Supabase auth invite link (which errors for registered users) and
    // assign the existing profile to the study directly. The invitations row
    // upsert above already keeps the Pending tab in sync.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, first_name')
      .eq('company_id', profile.company_id)
      .eq('email', emailTrimmed)
      .maybeSingle();

    if (existingProfile) {
      const profileId = (existingProfile as { id: string }).id;
      const profileFirstName =
        (existingProfile as { first_name?: string | null }).first_name?.trim() ?? '';

      const { error: stmErr } = await admin.from('study_team_members').insert({
        study_id,
        profile_id: profileId,
        role: study_role,
      });

      if (stmErr && !isUniqueViolation(stmErr)) {
        console.error('[inviteUser] study_team_members insert error:', stmErr);
        if (stmErr.message?.includes('study_team_members_role_check')) {
          return { data: null, error: STUDY_TEAM_ROLE_CONSTRAINT_HINT };
        }
        return {
          data: null,
          error: `Could not add to study team: ${stmErr.message}`,
        };
      }

      const studyUrl = `${siteUrl}/protected/studies/${study_id}`;
      const sendResult = await sendEmail({
        to: emailTrimmed,
        replyTo: inviterContext.email ?? undefined,
        subject: `${inviterContext.name} added you to ${studyLabel ?? 'a study'} on Trialetics`,
        category: 'invite',
        idempotencyKey: `${invitationRow.id as string}:added-to-study`,
        template: (
          <AddedToStudy
            inviteeFirstName={inviteeFirstName || profileFirstName}
            inviterName={inviterContext.name}
            companyName={inviterContext.companyName}
            studyLabel={studyLabel ?? 'a study'}
            roleLabel={roleLabel}
            studyUrl={studyUrl}
          />
        ),
      });

      if (sendResult.error) {
        // Email failure should not roll back the membership; surface a soft warning.
        console.error('[inviteUser] AddedToStudy email send error:', sendResult.error);
      }

      revalidateStudyCtmsLayout(study_id);
      revalidatePath('/protected/team');
      return { data: { invited: true }, error: null };
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: emailTrimmed,
      options: {
        data: {
          company_id: profile.company_id,
          role: role,
          first_name: first_name?.trim() || '',
          last_name: last_name?.trim() || '',
        },
      },
    });

    if (linkError) {
      if (linkError.message.includes('already been registered') || linkError.message.includes('already exists')) {
        return { data: null, error: 'This email is already registered.' };
      }
      return { data: null, error: linkError.message };
    }

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      return { data: null, error: 'Failed to generate invite link.' };
    }

    const inviteLink = `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=invite`;

    const sendResult = await sendEmail({
      to: emailTrimmed,
      replyTo: inviterContext.email ?? undefined,
      subject: `${inviterContext.name} invited you to Trialetics`,
      category: 'invite',
      idempotencyKey: `${invitationRow.id as string}:invite`,
      template: (
        <InviteUser
          inviteeFirstName={inviteeFirstName}
          inviterName={inviterContext.name}
          companyName={inviterContext.companyName}
          studyLabel={studyLabel}
          roleLabel={roleLabel}
          acceptUrl={inviteLink}
        />
      ),
    });

    if (sendResult.error) {
      return { data: null, error: 'Failed to send invite email. Please try again.' };
    }

    revalidateStudyCtmsLayout(study_id);
    revalidatePath('/protected/team');
    return { data: { invited: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

interface InviterContext {
  name: string;
  email: string | null;
  companyName: string;
}

async function loadInviterContext(
  profileId: string,
  companyId: string,
): Promise<InviterContext> {
  const admin = createAdminClient();
  const [{ data: inviter }, { data: company }] = await Promise.all([
    admin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', profileId)
      .maybeSingle(),
    admin.from('companies').select('name').eq('id', companyId).maybeSingle(),
  ]);
  const first = (inviter as { first_name?: string | null } | null)?.first_name?.trim() ?? '';
  const last = (inviter as { last_name?: string | null } | null)?.last_name?.trim() ?? '';
  const fullName = [first, last].filter(Boolean).join(' ');
  const email = (inviter as { email?: string | null } | null)?.email?.trim() ?? null;
  return {
    name: fullName || email || 'A Trialetics teammate',
    email,
    companyName:
      (company as { name?: string | null } | null)?.name?.trim() ||
      'this organization',
  };
}

// =====================================================
// Resend & Revoke Invite
// =====================================================

export async function resendInvite(invitationId: string): Promise<{ error: string | null }> {
  try {
    const profile = await getAdminProfile();
    if (profile.role !== 'admin') {
      return { error: 'Only admins can resend invitations.' };
    }

    const supabase = await createClient();
    const { data: inv, error: fetchErr } = await supabase
      .from('invitations')
      .select('id, email, first_name, last_name, role, company_id, study_id, study_role')
      .eq('id', invitationId)
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')
      .single();

    if (fetchErr || !inv) {
      return { error: 'Invitation not found or no longer pending.' };
    }

    const emailTrimmed = (inv.email as string).trim().toLowerCase();
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { error: 'Email invite is not configured. Contact support.' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const admin = createAdminClient();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: emailTrimmed,
      options: {
        data: {
          company_id: profile.company_id,
          role: inv.role as string,
          first_name: (inv.first_name as string)?.trim() || '',
          last_name: (inv.last_name as string)?.trim() || '',
        },
      },
    });

    if (linkError) {
      if (linkError.message.includes('already been registered') || linkError.message.includes('already exists')) {
        return { error: 'This user has already accepted the invitation.' };
      }
      return { error: linkError.message };
    }

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      return { error: 'Failed to generate invite link.' };
    }

    const inviteLink = `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=invite`;

    const inviterContext = await loadInviterContext(profile.id, profile.company_id);

    let studyLabel: string | null = null;
    if (inv.study_id) {
      const { data: studyRow } = await admin
        .from('studies')
        .select('study_name, protocol_number')
        .eq('id', inv.study_id as string)
        .maybeSingle();
      const sName = (studyRow as { study_name?: string | null } | null)?.study_name?.trim() ?? '';
      const sProto =
        (studyRow as { protocol_number?: string | null } | null)?.protocol_number?.trim() ?? '';
      studyLabel = sName || sProto || null;
    }
    const roleLabel = inv.study_role
      ? (TEAM_ROLE_LABEL[inv.study_role as TeamMemberRole] ?? null)
      : null;

    const resentAt = new Date().toISOString();

    const sendResult = await sendEmail({
      to: emailTrimmed,
      replyTo: inviterContext.email ?? undefined,
      subject: `${inviterContext.name} invited you to Trialetics`,
      category: 'invite-resend',
      idempotencyKey: `${invitationId}:invite-resend:${resentAt}`,
      template: (
        <InviteUser
          inviteeFirstName={(inv.first_name as string)?.trim() ?? ''}
          inviterName={inviterContext.name}
          companyName={inviterContext.companyName}
          studyLabel={studyLabel}
          roleLabel={roleLabel}
          acceptUrl={inviteLink}
        />
      ),
    });

    if (sendResult.error) {
      return { error: 'Failed to send invite email. Please try again.' };
    }

    await supabase
      .from('invitations')
      .update({ invited_at: resentAt })
      .eq('id', invitationId)
      .eq('company_id', profile.company_id);

    revalidatePath('/protected/team');
    revalidatePath('/protected/studies', 'layout');
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function revokeInvite(invitationId: string): Promise<{ error: string | null }> {
  try {
    const profile = await getAdminProfile();
    if (profile.role !== 'admin') {
      return { error: 'Only admins can revoke invitations.' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId)
      .eq('company_id', profile.company_id)
      .eq('status', 'pending');

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

// =====================================================
// Shareable Company Join Links
// =====================================================

export interface JoinLink {
  id: string;
  company_id: string;
  token: string;
  role: string;
  label: string | null;
  study_id: string | null;
  study_role: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateJoinLinkInput {
  role: 'admin' | 'user';
  label?: string;
  expiresInDays?: number;
  maxUses?: number;
  study_id?: string;
  study_role?: TeamMemberRole;
}

export async function createJoinLink(
  input: CreateJoinLinkInput
): Promise<{ data: JoinLink | null; error: string | null }> {
  try {
    const profile = await getAdminProfile();
    if (profile.role !== 'admin') {
      return { data: null, error: 'Only admins can create join links.' };
    }

    const expiresAt =
      input.expiresInDays != null && input.expiresInDays > 0
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const studyId = input.study_id?.trim() || null;
    let studyRole: string | null = input.study_role?.trim() || null;
    if (studyId && !studyRole) {
      studyRole = 'clinical_research_associate';
    }
    if (!studyId) {
      studyRole = null;
    }

    const supabase = await createClient();
    if (studyId) {
      const { data: studyRow, error: studyErr } = await supabase
        .from('studies')
        .select('id')
        .eq('id', studyId)
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (studyErr || !studyRow) {
        return { data: null, error: 'Invalid study selected.' };
      }
      const { error: writeGuard } = await assertStudyWritable(supabase, studyId, profile.company_id);
      if (writeGuard) return { data: null, error: writeGuard };
    }

    const { data, error } = await supabase
      .from('company_join_links')
      .insert({
        company_id: profile.company_id,
        role: input.role,
        label: input.label?.trim() || null,
        study_id: studyId,
        study_role: studyRole,
        expires_at: expiresAt,
        max_uses: input.maxUses ?? null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (studyId) revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/team');
    revalidatePath('/protected/studies', 'layout');
    return { data: data as JoinLink, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function getJoinLinks(): Promise<JoinLink[]> {
  try {
    const profile = await getAdminProfile();
    if (profile.role !== 'admin') return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('company_join_links')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data as JoinLink[]) ?? [];
  } catch {
    return [];
  }
}

export async function revokeJoinLink(linkId: string): Promise<{ error: string | null }> {
  try {
    const profile = await getAdminProfile();
    if (profile.role !== 'admin') {
      return { error: 'Only admins can revoke join links.' };
    }

    const supabase = await createClient();
    const { data: linkRow } = await supabase
      .from('company_join_links')
      .select('study_id')
      .eq('id', linkId)
      .eq('company_id', profile.company_id)
      .maybeSingle();
    const linkStudyId = (linkRow as { study_id?: string | null } | null)?.study_id;
    if (linkStudyId) {
      const { error: writeGuard } = await assertStudyWritable(supabase, linkStudyId, profile.company_id);
      if (writeGuard) return { error: writeGuard };
    }

    const { error } = await supabase
      .from('company_join_links')
      .update({ is_active: false })
      .eq('id', linkId)
      .eq('company_id', profile.company_id);

    if (error) return { error: error.message };

    revalidatePath('/protected/team');
    revalidatePath('/protected/studies', 'layout');
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function validateJoinToken(token: string): Promise<{
  valid: boolean;
  companyName?: string;
  companyId?: string;
  role?: string;
  studyId?: string | null;
  studyRole?: string | null;
  error?: string;
}> {
  try {
    if (!token?.trim()) return { valid: false, error: 'Invalid link.' };

    const admin = createAdminClient();
    const { data: link, error: linkErr } = await admin
      .from('company_join_links')
      .select('id, company_id, role, study_id, study_role, expires_at, max_uses, use_count, is_active')
      .eq('token', token.trim())
      .single();

    if (linkErr || !link) return { valid: false, error: 'Invalid or expired link.' };
    if (!link.is_active) return { valid: false, error: 'This link has been revoked.' };
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { valid: false, error: 'This link has expired.' };
    }
    if (link.max_uses != null && (link.use_count ?? 0) >= link.max_uses) {
      return { valid: false, error: 'This link has reached its maximum uses.' };
    }

    const { data: company } = await admin
      .from('companies')
      .select('name')
      .eq('id', link.company_id)
      .single();

    return {
      valid: true,
      companyName: (company as { name?: string })?.name ?? 'this organization',
      companyId: link.company_id,
      role: link.role,
      studyId: (link as { study_id?: string | null }).study_id ?? null,
      studyRole: (link as { study_role?: string | null }).study_role ?? null,
    };
  } catch {
    return { valid: false, error: 'Invalid or expired link.' };
  }
}

export async function joinViaLink(
  token: string,
  email: string,
  password: string,
  firstName: string,
  lastName?: string
): Promise<{ error: string | null }> {
  try {
    const validation = await validateJoinToken(token);
    if (!validation.valid || !validation.companyId || !validation.role) {
      return { error: validation.error ?? 'Invalid or expired link.' };
    }

    const admin = createAdminClient();
    const { data: row } = await admin.from('company_join_links').select('use_count').eq('token', token).single();
    if (row) {
      await admin
        .from('company_join_links')
        .update({ use_count: (row.use_count ?? 0) + 1 })
        .eq('token', token);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/auth/callback?next=/protected`;

    const signUpData: Record<string, string> = {
      company_id: validation.companyId!,
      role: validation.role!,
      first_name: firstName?.trim() || '',
      last_name: lastName?.trim() || '',
    };
    if (validation.studyId) {
      signUpData[JOIN_STUDY_ID_META_KEY] = validation.studyId;
      signUpData[JOIN_STUDY_ROLE_META_KEY] =
        validation.studyRole?.trim() || 'clinical_research_associate';
      const { data: studyOk } = await admin
        .from('studies')
        .select('id')
        .eq('id', validation.studyId)
        .eq('company_id', validation.companyId!)
        .maybeSingle();
      if (!studyOk) {
        return { error: 'This join link references an invalid study.' };
      }
    }

    const supabase = await createClient();
    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: signUpData,
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpErr) {
      if (signUpErr.message.includes('already registered') || signUpErr.message.includes('already exists')) {
        return { error: 'An account with this email already exists. Try signing in or use a different email.' };
      }
      return { error: signUpErr.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
