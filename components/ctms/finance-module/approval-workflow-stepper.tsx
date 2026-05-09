'use client';

import { Check, Circle, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ApprovalWorkflowStepperProps {
  currentStep: number;
  totalSteps?: number;
}

const DEFAULT_STAGES = ['Submitted', 'Under Review', 'Approved', 'Completed'];

export function ApprovalWorkflowStepper({ currentStep, totalSteps = 4 }: ApprovalWorkflowStepperProps) {
  const stages =
    totalSteps === DEFAULT_STAGES.length
      ? DEFAULT_STAGES
      : Array.from({ length: totalSteps }, (_, idx) => `Step ${idx + 1}`);
  const safeCurrent = Math.max(0, Math.min(stages.length, currentStep));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Approval Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex items-center justify-between">
          {stages.map((stage, idx) => {
            const completed = idx < safeCurrent;
            const inProgress = idx === safeCurrent;
            return (
              <li key={stage} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border text-[10px] font-medium',
                    completed
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : inProgress
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {completed ? (
                    <Check className="size-3.5" />
                  ) : inProgress ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Circle className="size-2 fill-current" />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={cn(
                      'text-[11px]',
                      completed
                        ? 'text-foreground font-medium'
                        : inProgress
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                    )}
                  >
                    {stage}
                  </div>
                  {idx < stages.length - 1 ? (
                    <div
                      className={cn(
                        'h-0.5 mt-1.5 rounded-full',
                        completed ? 'bg-emerald-500' : 'bg-muted',
                      )}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
