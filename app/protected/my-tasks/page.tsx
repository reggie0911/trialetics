import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/server';

type TaskRow = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  protocol_id: string | null;
  assigned_to_id: string | null;
  due_date: string | null;
  category: string | null;
  protocol: { id: string; title: string | null; protocol_number: string | null } | null;
};

function formatDate(value: string | null): string {
  if (!value) return 'No due date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

async function getProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/auth/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login');
  return { supabase, profile };
}

export default async function MyTasksPage() {
  const { supabase, profile } = await getProfile();
  const { data } = await supabase
    .from('action_items')
    .select('id, title, status, priority, protocol_id, assigned_to_id, due_date, category, protocol:studies(id, title, protocol_number)')
    .eq('company_id', profile.company_id)
    .eq('assigned_to_id', profile.id)
    .not('status', 'in', '("resolved","closed")')
    .order('due_date', { ascending: true, nullsFirst: false });

  const tasks = (data ?? []) as unknown as TaskRow[];
  const overdueCount = tasks.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10)).length;

  return (
    <main className="p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Global workflow</p>
            <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open action items assigned to you across all studies.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/protected">Back to dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{tasks.length}</div><div className="text-xs text-muted-foreground">Open assigned tasks</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{overdueCount}</div><div className="text-xs text-muted-foreground">Overdue</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-semibold">{tasks.filter((task) => task.priority === 'critical' || task.priority === 'high').length}</div><div className="text-xs text-muted-foreground">High priority</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned Action Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No open tasks are assigned to you.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Study</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Due</th>
                      <th className="px-4 py-3 font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{task.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{task.protocol?.protocol_number ?? task.protocol?.title ?? 'General'}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{task.priority ?? 'medium'}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(task.due_date)}</td>
                        <td className="px-4 py-3">
                          <Link className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400" href={task.protocol_id ? `/protected/studies/${task.protocol_id}/tasks` : '/protected/my-tasks'}>
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
