'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteStatus } from '@/lib/types/ctms';

const STEPS: { status: SiteStatus; label: string }[] = [
  { status: 'identified', label: 'Identified' },
  { status: 'selected', label: 'Selected' },
  { status: 'initiated', label: 'Initiated' },
  { status: 'activated', label: 'Activated' },
  { status: 'enrolling', label: 'Enrolling' },
  { status: 'closed', label: 'Closed' },
];

const STATUS_STEP_COLORS: Record<
  SiteStatus,
  { circle: string; bar: string; border: string }
> = {
  identified: { circle: 'bg-violet-500 text-white', bar: 'bg-violet-500', border: 'border-violet-500' },
  selected: { circle: 'bg-blue-500 text-white', bar: 'bg-blue-500', border: 'border-blue-500' },
  initiated: { circle: 'bg-cyan-500 text-white', bar: 'bg-cyan-500', border: 'border-cyan-500' },
  activated: { circle: 'bg-emerald-500 text-white', bar: 'bg-emerald-500', border: 'border-emerald-500' },
  enrolling: { circle: 'bg-green-500 text-white', bar: 'bg-green-500', border: 'border-green-500' },
  closed: { circle: 'bg-slate-600 text-white', bar: 'bg-slate-600', border: 'border-slate-600' },
};

interface SiteActivationStepperProps {
  currentStatus: SiteStatus;
}

export function SiteActivationStepper({ currentStatus }: SiteActivationStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="flex w-1/2 gap-4">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step.status} className="flex flex-1 flex-col gap-1.5 min-w-0">
            {/* Icon + Label row */}
            <div className="flex items-center gap-1.5">
              {/* Checkmark for completed, dashed circle for current, nothing for future */}
              {isCompleted && (
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                    STATUS_STEP_COLORS[step.status].circle
                  )}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </div>
              )}
              {isCurrent && (
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed bg-transparent',
                    STATUS_STEP_COLORS[currentStatus].border
                  )}
                />
              )}
              <span
                className={cn(
                  'text-[10px] whitespace-nowrap font-normal truncate',
                  (isCompleted || isCurrent) && 'text-foreground',
                  isFuture && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Bar below */}
            <div
              className={cn(
                'h-1 w-full rounded-full transition-colors',
                isCompleted && STATUS_STEP_COLORS[step.status].bar,
                isCurrent && STATUS_STEP_COLORS[currentStatus].bar,
                isFuture && 'bg-muted-foreground/20'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
