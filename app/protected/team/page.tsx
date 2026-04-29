import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPendingInvitations, getTeamDirectory, getTeamRoles } from '@/lib/actions/team';

function displayName(row: { first_name: string | null; last_name: string | null; email: string | null }): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.email || 'Unnamed user';
}

export default async function TeamPage() {
  const [members, invitations, roles] = await Promise.all([
    getTeamDirectory().catch(() => []),
    getPendingInvitations().catch(() => []),
    getTeamRoles().catch(() => []),
  ]);

  return (
    <main className="p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin workflow</p>
            <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Company users, study assignments, pending invitations, and role library.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/protected/studies">Back to admin overview</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{members.length}</div><div className="text-xs text-muted-foreground">Active users</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{invitations.length}</div><div className="text-xs text-muted-foreground">Pending invites</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{roles.length}</div><div className="text-xs text-muted-foreground">Custom roles</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No company users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Platform Role</th>
                      <th className="px-4 py-3 font-medium">Study Assignments</th>
                      <th className="px-4 py-3 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((member) => (
                      <tr key={member.profile_id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{displayName(member)}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline">{member.app_role}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{member.assignments.length}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {member.last_sign_in_at ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(member.last_sign_in_at)) : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Pending Invitations</CardTitle></CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">No pending invitations.</div>
              ) : (
                <ul className="divide-y">
                  {invitations.map((invite) => (
                    <li key={invite.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{invite.email}</div>
                        <div className="truncate text-xs text-muted-foreground">{invite.role} · {invite.study_role ?? 'No study role'}</div>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Role Library</CardTitle></CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">No custom team roles configured.</div>
              ) : (
                <ul className="divide-y">
                  {roles.map((role) => (
                    <li key={role.id} className="py-3">
                      <div className="text-sm font-medium">{role.role_name}</div>
                      <div className="text-xs text-muted-foreground">{role.description ?? 'No description'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
