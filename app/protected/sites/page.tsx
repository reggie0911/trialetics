import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { createClient } from '@/lib/server';

type SiteRow = {
  id: string;
  study_id: string;
  site_number: string | null;
  name: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  target_enrollment: number | null;
  activation_date: string | null;
  studies: { title: string | null; protocol_number: string | null } | null;
};

function locationLabel(site: SiteRow): string {
  return [site.city, site.state].filter(Boolean).join(', ') || 'Location not set';
}

export default async function SitesPage() {
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
      .from('study_sites')
      .select('id, study_id, site_number, name, city, state, status, target_enrollment, activation_date, studies(title, protocol_number)')
      .in('study_id', studyIds)
      .order('site_number', { ascending: true })
      .limit(200)
    : { data: [] };

  const sites = (data ?? []) as unknown as SiteRow[];
  const activeSites = sites.filter((site) => site.status === 'activated' || site.status === 'enrolling').length;

  return (
    <main className="p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Global workflow</p>
            <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cross-study site index with status, location, and study links.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/protected">Back to dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{sites.length}</div><div className="text-xs text-muted-foreground">Total sites</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{activeSites}</div><div className="text-xs text-muted-foreground">Active or enrolling</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{sites.reduce((sum, site) => sum + (site.target_enrollment ?? 0), 0)}</div><div className="text-xs text-muted-foreground">Enrollment target</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study Sites</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sites.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No sites are configured across your studies yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Site</th>
                      <th className="px-4 py-3 font-medium">Study</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Target</th>
                      <th className="px-4 py-3 font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sites.map((site) => (
                      <tr key={site.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{[site.site_number, site.name].filter(Boolean).join(' · ') || 'Unnamed site'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{site.studies?.protocol_number ?? site.studies?.title ?? 'Study'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{locationLabel(site)}</td>
                        <td className="px-4 py-3"><StatusBadge status={site.status ?? 'identified'} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{site.target_enrollment ?? 0}</td>
                        <td className="px-4 py-3">
                          <Link className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400" href={`/protected/studies/${site.study_id}/sites`}>
                            Open
                          </Link>
                        </td>
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
