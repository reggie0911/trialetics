import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

import { createClient } from '@/lib/server';
import { buildReadiness, persistReadiness } from '@/lib/copilot/readiness-builder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReadinessView } from '@/components/copilot/readiness/readiness-view';

export const dynamic = 'force-dynamic';

interface SearchParams {
  refresh?: string;
}

export default async function InspectionReadinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { refresh } = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const wantsRefresh = refresh === '1';

  let snapshot = null as Awaited<ReturnType<typeof buildReadiness>> | null;

  if (!wantsRefresh) {
    const { data: existing } = await supabase
      .from('copilot_readiness_snapshots')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('scope_kind', 'portfolio')
      .is('scope_id', null)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Server component evaluated per-request (force-dynamic), so Date.now()
      // is intentional here — we want fresh-vs-stale to reflect the request time.
      // eslint-disable-next-line react-hooks/purity
      const ageMs = Date.now() - new Date(existing.generated_at).getTime();
      if (ageMs < 60 * 60 * 1000) {
        snapshot = {
          scopeKind: existing.scope_kind,
          scopeId: existing.scope_id,
          score: existing.score,
          grade: existing.grade,
          factors: (existing.breakdown ?? []) as Awaited<ReturnType<typeof buildReadiness>>['factors'],
          recommendations: (existing.recommendations ?? []) as Awaited<ReturnType<typeof buildReadiness>>['recommendations'],
          agentId: existing.agent_id,
          agentVersion: existing.agent_version,
          generatedAt: existing.generated_at,
        };
      }
    }
  }

  if (!snapshot) {
    snapshot = await buildReadiness(supabase, {
      scopeKind: 'portfolio',
      scopeId: null,
      companyId: profile.company_id,
    });
    await persistReadiness(supabase, profile.company_id, snapshot, user.id);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <ShieldCheck className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Inspection Readiness
          </h1>
          <p className="text-sm text-muted-foreground">
            A live, audit-grade snapshot of how inspection-ready your portfolio is, with the levers to lift each factor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/protected/copilot/inspection-readiness?refresh=1" className="text-xs">
              Recalculate
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/protected/copilot" className="text-xs">
              <ChevronLeft className="mr-1 h-3 w-3" /> Command Center
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">Portfolio readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadinessView snapshot={snapshot} />
        </CardContent>
      </Card>
    </div>
  );
}
