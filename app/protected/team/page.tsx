import { getTeamDirectory, getTeamRoles } from '@/lib/actions/team';
import { getStudies } from '@/lib/actions/studies';
import { TeamDirectory } from '@/components/ctms/team/team-directory';

export default async function TeamPage() {
  const [members, studies, teamRoles] = await Promise.all([
    getTeamDirectory(),
    getStudies(),
    getTeamRoles(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Company-wide team directory and study assignments.
        </p>
      </div>
      <TeamDirectory members={members} studies={studies} teamRoles={teamRoles} />
    </div>
  );
}
