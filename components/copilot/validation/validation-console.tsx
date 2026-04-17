'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';

interface CaseSummary {
  id: string;
  description: string;
  expectation: string;
}

interface ValidationRunRow {
  id: string;
  agent_id: string;
  agent_version: string;
  total_cases: number;
  passed: number;
  failed: number;
  duration_ms: number | null;
  results: { caseId: string; passed: boolean; error?: string }[];
  created_at: string;
}

interface Props {
  cases: Record<string, CaseSummary[]>;
  runs: ValidationRunRow[];
}

export function ValidationConsole({ cases, runs }: Props) {
  const agentIds = Object.keys(cases);
  const [selected, setSelected] = useState<string>(agentIds[0] ?? '');

  const selectedCases = cases[selected] ?? [];
  const selectedRuns = runs.filter((r) => r.agent_id === selected).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {agentIds.map((id) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={[
              'rounded-full border px-3 py-1 text-xs',
              selected === id
                ? 'border-[var(--copilot-accent)] bg-[color-mix(in_oklab,_var(--copilot-accent)_8%,_var(--background))]'
                : 'bg-background hover:border-[var(--copilot-accent)]',
            ].join(' ')}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Golden cases ({selectedCases.length})
          </p>
          {selectedCases.length === 0 ? (
            <p className="text-xs text-muted-foreground">No golden cases registered yet.</p>
          ) : (
            <ul className="space-y-2">
              {selectedCases.map((c) => (
                <li key={c.id} className="rounded-md border bg-background p-3">
                  <p className="text-sm font-normal">{c.description}</p>
                  <p className="text-xs text-muted-foreground">{c.expectation}</p>
                  <code className="text-[10px] text-muted-foreground">{c.id}</code>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Recent runs
          </p>
          {selectedRuns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No runs yet for this agent.</p>
          ) : (
            <ul className="space-y-2">
              {selectedRuns.map((run) => {
                const passing = run.passed === run.total_cases && run.total_cases > 0;
                return (
                  <li key={run.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-normal">v{run.agent_version}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()} &middot; {run.duration_ms ?? 0}ms
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${passing ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}
                      >
                        {run.passed}/{run.total_cases} passing
                      </Badge>
                    </div>
                    {run.failed > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-destructive">
                        {run.results
                          .filter((r) => !r.passed)
                          .map((r) => (
                            <li key={r.caseId}>
                              &bull; <code>{r.caseId}</code>
                              {r.error ? ` — ${r.error}` : ''}
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
