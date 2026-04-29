import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { createClient } from '@/lib/server';

type VisitRow = {
  id: string;
  study_id: string;
  visit_type: string | null;
  planned_date: string | null;
  status: string | null;
  study_sites: { site_number: string | null; name: string | null } | null;
  studies: { title: string | null; protocol_number: string | null } | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

function formatDate(value: string | null): string {
  if (!value) return 'Date pending';
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function titleCase(value: string | null): string {
  return (value ?? 'monitoring').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function VisitsPage() {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login');

  const { data: studies } = await supabase
    .from('studies')
    .select('id')
    .eq('company_id', profile.company_id);
  const studyIds = ((studies ?? []) as Array<{ id: string }>).map((study) => study.id);

  const { data } = studyIds.length > 0
    ? await supabase
      .from('monitoring_visits')
      .select('id, study_id, visit_type, planned_date, status, study_sites(site_number, name), studies(title, protocol_number), profiles(first_name, last_name)')
      .in('study_id', studyIds)
      .order('planned_date', { ascending: true, nullsFirst: false })
      .limit(100)
    : { data: [] };

  const visits = (data ?? []) as unknown as VisitRow[];
  const upcoming = visits.filter((visit) => visit.planned_date && visit.planned_date >= new Date().toISOString().slice(0, 10));

  return (
    <main className="p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Global workflow</p>
            <h1 className="text-2xl font-semibold tracking-tight">Visits</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cross-study monitoring visits sorted by planned date.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/protected">Back to dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{visits.length}</div><div className="text-xs text-muted-foreground">Total visits</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{upcoming.length}</div><div className="text-xs text-muted-foreground">Upcoming</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{visits.filter((visit) => visit.status === 'completed').length}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit Calendar List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {visits.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No monitoring visits found across your studies.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Visit</th>
                      <th className="px-4 py-3 font-medium">Study</th>
                      <th className="px-4 py-3 font-medium">Site</th>
                      <th className="px-4 py-3 font-medium">Monitor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(visit.planned_date)}</td>
                        <td className="px-4 py-3 font-medium">
                          <Link className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400" href={`/protected/studies/${visit.study_id}/visits/${visit.id}`}>
                            {titleCase(visit.visit_type)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{visit.studies?.protocol_number ?? visit.studies?.title ?? 'Study'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{[visit.study_sites?.site_number, visit.study_sites?.name].filter(Boolean).join(' · ') || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{[visit.profiles?.first_name, visit.profiles?.last_name].filter(Boolean).join(' ') || 'Unassigned'}</td>
                        <td className="px-4 py-3"><StatusBadge status={visit.status ?? 'planned'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
