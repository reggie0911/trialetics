'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ReadinessSnapshot } from '@/lib/copilot/readiness-builder';

const GRADE_CLASS: Record<ReadinessSnapshot['grade'], string> = {
  A: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  B: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  C: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  D: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  F: 'bg-destructive/15 text-destructive',
};

export function ReadinessView({ snapshot }: { snapshot: ReadinessSnapshot }) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <span className="text-5xl font-normal" style={{ color: 'var(--copilot-accent)' }}>
          {snapshot.score}
        </span>
        <Badge className={`text-sm ${GRADE_CLASS[snapshot.grade]}`} variant="secondary">
          Grade {snapshot.grade}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Generated {new Date(snapshot.generatedAt).toLocaleString()} &middot; agent {snapshot.agentId} v{snapshot.agentVersion}
        </span>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">Factors</p>
        {snapshot.factors.map((f) => (
          <div key={f.id} className="space-y-1.5 rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-normal">{f.label}</p>
              <span className="text-xs text-muted-foreground">
                {f.score}/100 &middot; weight {(f.weight * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={f.score} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{f.rationale}</p>
            {f.remediation && (
              <p className="text-[11px] text-foreground/80">
                <span className="font-normal text-foreground">Lift:</span> {f.remediation}
              </p>
            )}
            {f.href && (
              <Link href={f.href} className="inline-flex items-center text-[11px] text-[var(--copilot-accent)] hover:underline">
                Open module <ChevronRight className="ml-0.5 h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {snapshot.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">Recommended next actions</p>
          <ul className="space-y-1.5">
            {snapshot.recommendations.map((r) => (
              <li key={r.id} className="rounded-md border bg-background p-2.5 text-xs">
                <span className="text-foreground">{r.label}</span>{' '}
                <code className="text-[10px] text-muted-foreground">via {r.agentId}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
