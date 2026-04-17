import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportBuilder } from '@/components/copilot/reports/report-builder';

export const dynamic = 'force-dynamic';

export default async function CopilotReportsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const { data: saved } = await supabase
    .from('copilot_report_definitions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(40);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <BarChart3 className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Natural-Language Report Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Type what you want; the Copilot turns it into a structured spec you can preview, save, and re-run.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/protected/copilot" className="text-xs">
            <ChevronLeft className="mr-1 h-3 w-3" /> Command Center
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">Build a report</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportBuilder savedDefinitions={saved ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
