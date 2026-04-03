import { getTeamDirectory, getTeamRoles, getPendingInvitations, getJoinLinks } from '@/lib/actions/team';
import { getStudies } from '@/lib/actions/studies';
import { TeamDirectory } from '@/components/ctms/team/team-directory';
import { createClient } from '@/lib/server';

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('user_id', user.id).single()
    : { data: null };

  const isAdmin = profile?.role === 'admin';

  const [members, studies, teamRoles, pendingInvitations, joinLinks] = await Promise.all([
    getTeamDirectory(),
    getStudies(),
    getTeamRoles(),
    getPendingInvitations(),
    isAdmin ? getJoinLinks() : Promise.resolve([]),
  ]);

  return (
    <div className="p-6 space-y-6" suppressHydrationWarning>
      <div data-onboarding="page-team">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Company-wide team directory and study assignments.
        </p>
      </div>
      <TeamDirectory
        members={members}
        studies={studies}
        teamRoles={teamRoles}
        pendingInvitations={pendingInvitations}
        joinLinks={joinLinks}
        isAdmin={isAdmin}
      />
    </div>
  );
}
