'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, CircleDashed, CircleDot, Loader2, ShieldAlert, SkipForward } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlaybookDefinition, PlaybookStepState } from '@/lib/copilot/playbook-runner';

interface PlaybookRunLite {
  id: string;
  playbookId: string;
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  currentStep: number;
  stepStates: PlaybookStepState[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface Props {
  playbook: PlaybookDefinition;
  initialRun: PlaybookRunLite;
}

export function PlaybookStepper({ playbook, initialRun }: Props) {
  const [run, setRun] = useState<PlaybookRunLite>(initialRun);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const advance = async (stepIndex: number, outcome: 'completed' | 'skipped' | 'blocked') => {
    setPendingIdx(stepIndex);
    setError(null);
    try {
      const res = await fetch(`/api/ai/playbooks/${run.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepIndex,
          outcome,
          note: note.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { run?: PlaybookRunLite; error?: string };
      if (!res.ok || !json.run) {
        setError(json.error ?? 'Could not advance step');
        return;
      }
      setRun(json.run);
      setNote('');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPendingIdx(null);
    }
  };

  return (
    <ol className="space-y-3">
      {playbook.steps.map((step, idx) => {
        const state: PlaybookStepState = run.stepStates[idx] ?? { status: 'pending' };
        const isActive = idx === run.currentStep && run.status === 'running';
        const isCompleted = state.status === 'completed';
        const isSkipped = state.status === 'skipped';
        const isBlocked = state.status === 'blocked';

        return (
          <li
            key={step.id}
            className={[
              'rounded-md border p-4 transition-colors',
              isActive ? 'bg-[color-mix(in_oklab,_var(--copilot-accent)_8%,_var(--background))]' : 'bg-background',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : isSkipped ? (
                  <SkipForward className="h-4 w-4 text-muted-foreground" />
                ) : isBlocked ? (
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                ) : isActive ? (
                  <CircleDot className="h-4 w-4" style={{ color: 'var(--copilot-accent)' }} />
                ) : (
                  <CircleDashed className="h-4 w-4 text-muted-foreground" />
                )}
              </span>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-normal">
                    Step {idx + 1}. {step.title}
                  </p>
                  {step.requiresApproval && (
                    <Badge variant="outline" className="text-[10px]">e-sign required</Badge>
                  )}
                  {step.etaMinutes !== undefined && (
                    <span className="text-[10px] text-muted-foreground">ETA {step.etaMinutes}m</span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
                {state.status !== 'pending' && (
                  <p className="text-[11px] text-muted-foreground">
                    {state.status === 'completed' ? 'Completed' : state.status === 'skipped' ? 'Skipped' : 'In progress'}
                    {state.completedAt ? ` \u00B7 ${new Date(state.completedAt).toLocaleString()}` : ''}
                    {state.note ? ` \u00B7 "${state.note}"` : ''}
                  </p>
                )}
                {step.agentHint && (
                  <p className="text-[11px] text-muted-foreground">
                    Agent hint: <code>{step.agentHint}</code>
                  </p>
                )}
                {step.href && (
                  <Link href={step.href} className="inline-flex items-center text-[11px] text-[var(--copilot-accent)] hover:underline">
                    Open module <ChevronRight className="ml-0.5 h-3 w-3" />
                  </Link>
                )}

                {isActive && (
                  <div className="space-y-2 pt-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`note-${idx}`} className="text-xs">Step note (optional)</Label>
                        <Textarea
                          id={`note-${idx}`}
                          rows={2}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="What did you do, what's outstanding?"
                        />
                      </div>
                      {step.requiresApproval && (
                        <div className="space-y-1">
                          <Label htmlFor={`reason-${idx}`} className="text-xs">Reason for advance</Label>
                          <Input
                            id={`reason-${idx}`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Required by 21 CFR Part 11"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={pendingIdx === idx || (step.requiresApproval && !reason.trim())}
                        onClick={() => void advance(idx, 'completed')}
                      >
                        {pendingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">Mark complete</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingIdx === idx}
                        onClick={() => void advance(idx, 'skipped')}
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        <span className="ml-1.5">Skip</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingIdx === idx}
                        onClick={() => void advance(idx, 'blocked')}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span className="ml-1.5">Mark blocked</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
      {error && <li className="text-xs text-destructive">{error}</li>}
      {run.status === 'completed' && (
        <li className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          Playbook complete. All step transitions are recorded in the audit log.
        </li>
      )}
    </ol>
  );
}
