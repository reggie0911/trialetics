import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, FlaskConical } from 'lucide-react';

import { createClient } from '@/lib/server';
import { GOLDEN_CASES, listValidationRuns } from '@/lib/copilot/validation-runner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidationConsole } from '@/components/copilot/validation/validation-console';

export const dynamic = 'force-dynamic';

export default async function CopilotValidationPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const runs = await listValidationRuns(supabase, undefined, 50);

  // Strip the evaluator function before sending to the client.
  const cases = Object.fromEntries(
    Object.entries(GOLDEN_CASES).map(([k, v]) => [
      k,
      v.map((c) => ({ id: c.id, description: c.description, expectation: c.expectation })),
    ])
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <FlaskConical className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Validation Evidence
          </h1>
          <p className="text-sm text-muted-foreground">
            Golden test cases per agent + version. Every run is immutable evidence for an inspector.
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
          <CardTitle className="text-sm font-normal">Catalogue + recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          <ValidationConsole cases={cases} runs={runs as unknown as Parameters<typeof ValidationConsole>[0]['runs']} />
        </CardContent>
      </Card>
    </div>
  );
}
