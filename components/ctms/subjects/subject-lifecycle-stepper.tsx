'use client';

import { Fragment } from 'react';

import { cn } from '@/lib/utils';
import type { SubjectLifecycleStep, SubjectLifecycleSub } from '@/lib/subject-page-metrics';

function sublineForDisplay(sub: SubjectLifecycleSub): string {
  if (sub === 'pending') return 'Pending';
  if (sub.kind === 'date') {
    return sub.value.replace(/^Date:\s*/i, '').trim();
  }
  return sub.value;
}

type SubjectLifecycleStepperProps = {
  steps: SubjectLifecycleStep[];
  className?: string;
};

/**
 * The horizontal segment after this step: blue if this stage is done (complete)
 * or in progress (current) — matches a blue progress line to the next node.
 */
function isConnectorAfterStepBlue(step: SubjectLifecycleStep): boolean {
  if (step.state === 'terminal') return false;
  return step.state === 'complete' || step.state === 'current';
}

function StepSegmentConnector({ blue }: { blue: boolean }) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center self-center sm:w-10 md:w-12"
      aria-hidden
    >
      <div className="flex w-full min-w-0 items-center justify-center">
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', blue ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600')}
        />
        <div
          className={cn(
            'mx-1 h-0.5 min-w-0 max-w-full flex-1 rounded-full',
            blue ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600',
          )}
        />
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', blue ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600')}
        />
      </div>
    </div>
  );
}

export function SubjectLifecycleStepper({ steps, className }: SubjectLifecycleStepperProps) {
  return (
    <div
      className={cn(
        'w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200/90 bg-white p-0 shadow-sm',
        'dark:border-slate-800 dark:bg-slate-950/40',
        className,
      )}
    >
      <ol
        className="box-border flex w-full min-w-0 list-none items-stretch gap-0 px-2 py-3.5 sm:px-3 sm:py-4 md:px-4"
        role="list"
        aria-label="Subject lifecycle"
      >
        {steps.map((s, i) => {
          const isCurrent = s.state === 'current';
          const isComplete = s.state === 'complete';
          const isPending = s.state === 'pending';
          const isTerm = s.state === 'terminal';
          const sub = sublineForDisplay(s.sub);

          return (
            <Fragment key={s.id}>
              {i > 0 ? <StepSegmentConnector blue={isConnectorAfterStepBlue(steps[i - 1]!)} /> : null}
              <li
                className="min-w-0 flex-1 list-none"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className={cn(
                    'h-full min-h-0 rounded-lg border',
                    isCurrent
                      && 'border-blue-200/70 bg-blue-50/95 px-2 py-2.5 sm:px-2.5 sm:py-2.5 ring-1 ring-inset ring-blue-200/40 dark:border-blue-800/70 dark:bg-blue-950/30 dark:ring-blue-800/45',
                    !isCurrent
                      && 'border-slate-200/80 bg-white px-1.5 py-2 dark:border-slate-800 dark:bg-slate-950/20',
                  )}
                >
                  <div
                    className={cn(
                      'flex gap-2.5',
                      isCurrent
                        ? 'min-h-8 items-center'
                        : 'min-h-8 items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                        isTerm && 'bg-amber-600 text-white',
                        !isTerm && isCurrent
                          && 'bg-blue-600 text-white',
                        !isTerm && isComplete
                          && 'bg-sky-500 text-white dark:bg-sky-600',
                        !isTerm && isPending
                          && 'border border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100',
                      )}
                    >
                      {s.number}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        className={cn(
                          'text-[10px] font-bold leading-tight',
                          isCurrent
                            && 'text-blue-800 dark:text-blue-200',
                          isTerm
                            && 'text-amber-900 dark:text-amber-100',
                          !isCurrent
                            && !isTerm
                            && 'text-foreground',
                        )}
                      >
                        {s.label}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 text-[10px] font-normal leading-tight',
                          isCurrent
                            && 'text-blue-600 dark:text-blue-300/90',
                          isTerm
                            && 'text-amber-800 dark:text-amber-200/90',
                          isComplete
                            && !isCurrent
                            && 'text-slate-600 dark:text-slate-300',
                          isPending
                            && !isCurrent
                            && !isTerm
                            && 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {sub}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
