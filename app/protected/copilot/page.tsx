import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, FileText, Brain, ScrollText, Bot, ListChecks, Sigma, BarChart3, ShieldCheck, FlaskConical, Edit3, Inbox, Users, UserCog, FolderUp } from 'lucide-react';

import { createClient } from '@/lib/server';
import { loadTodayBriefing } from '@/lib/copilot/briefing-builder';
import { getMemory } from '@/lib/copilot/memory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopilotAuditFeed } from '@/components/copilot/command-center/audit-feed';
import { CopilotMemoryList } from '@/components/copilot/command-center/memory-list';

export const dynamic = 'force-dynamic';

export default async function CopilotCommandCenterPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const [briefing, memory, auditRows] = await Promise.all([
    loadTodayBriefing(supabase, user.id),
    getMemory(supabase, { userId: user.id }),
    supabase
      .from('copilot_audit_log')
      .select('id, agent_id, agent_version, action, tool_name, resource_kind, resource_id, reason, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(25)
      .then(r => r.data ?? []),
  ]);

  const greeting = profile.first_name ? `Good day, ${profile.first_name}.` : 'Good day.';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
          Trialetics Copilot
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-normal">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground">
          {greeting} Here&apos;s your portfolio at a glance, plus what the Copilot has done on your behalf.
        </p>
      </header>

      {/* Briefing snippet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-normal">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Today&apos;s briefing
            </span>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/protected/copilot/briefing">Open full briefing</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefing ? (
            <div className="space-y-2">
              <p className="text-base font-normal">{briefing.headline}</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{briefing.summary}</p>
              <p className="text-[11px] text-muted-foreground">
                Generated {new Date(briefing.generatedAt).toLocaleTimeString()} \u00B7 {briefing.items.length} item
                {briefing.items.length === 1 ? '' : 's'} \u00B7 {briefing.readAt ? 'Read' : 'Unread'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Today&apos;s briefing hasn&apos;t been generated yet.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/protected/copilot/briefing">Generate now</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Memory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-normal">
              <Brain className="h-4 w-4" />
              What I remember
              <span className="ml-auto text-[11px] text-muted-foreground">
                {memory.length} entr{memory.length === 1 ? 'y' : 'ies'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CopilotMemoryList initialEntries={memory} />
          </CardContent>
        </Card>

        {/* Audit feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-normal">
              <ScrollText className="h-4 w-4" />
              Recent Copilot activity
              <span className="ml-auto text-[11px] text-muted-foreground">
                Last {auditRows.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CopilotAuditFeed entries={auditRows} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-normal">
            <Sparkles className="h-4 w-4" />
            Operational workspaces
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <WorkspaceLink href="/protected/copilot/queue" icon={<Inbox className="h-4 w-4" />} title="Work queue" subtitle="Today, drafts, snoozed" />
          <WorkspaceLink href="/protected/copilot/drafts" icon={<Edit3 className="h-4 w-4" />} title="Draft Studio" subtitle="AI drafts with e-sign + version history" />
          <WorkspaceLink href="/protected/copilot/collab" icon={<Users className="h-4 w-4" />} title="Collab sessions" subtitle="Multi-agent roundtables" />
          <WorkspaceLink href="/protected/copilot/playbooks" icon={<ListChecks className="h-4 w-4" />} title="Playbooks" subtitle="Site activation, recovery, audit prep" />
          <WorkspaceLink href="/protected/copilot/scenarios" icon={<Sigma className="h-4 w-4" />} title="Scenarios" subtitle="What-if enrollment, timeline, spend" />
          <WorkspaceLink href="/protected/copilot/reports" icon={<BarChart3 className="h-4 w-4" />} title="NL Reports" subtitle="Plain-English report builder" />
          <WorkspaceLink href="/protected/copilot/inspection-readiness" icon={<ShieldCheck className="h-4 w-4" />} title="Inspection Readiness" subtitle="Live readiness score + factors" />
          <WorkspaceLink href="/protected/copilot/validation" icon={<FlaskConical className="h-4 w-4" />} title="Validation" subtitle="Golden tests + agent evidence" />
          <WorkspaceLink href="/protected/copilot/personas" icon={<UserCog className="h-4 w-4" />} title="Persona settings" subtitle="Tone, role, guardrails" />
          <WorkspaceLink href="/protected/copilot/documents" icon={<FolderUp className="h-4 w-4" />} title="Documents" subtitle="Upload, classify, ask, link" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-normal">
            <Bot className="h-4 w-4" />
            Specialist agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            42+ specialist agents are wired into the Copilot. Each one has tools for its module — from study risk
            assessment to KRI sentinels to trip report summarization. Open any module page to see the recommended
            agent in the Copilot panel, or browse the full directory in the <strong>Agents</strong> tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-md border bg-background p-3 transition-colors hover:border-[var(--copilot-accent)] hover:bg-muted/40"
    >
      <span className="flex items-center gap-2 text-sm font-normal" style={{ color: 'var(--copilot-accent)' }}>
        {icon}
        <span className="text-foreground">{title}</span>
      </span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </Link>
  );
}
