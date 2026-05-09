'use client';

import { Check } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InvoiceApprovalWorkflowStepperProps {
  currentStatus: 'submitted' | 'under_review' | 'approved' | 'paid' | 'draft' | 'rejected' | 'disputed';
}

const STEPS: Array<{ key: string; label: string }> = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approval' },
  { key: 'paid', label: 'Payment' },
];

const ORDER: Record<string, number> = {
  submitted: 1,
  under_review: 2,
  approved: 3,
  paid: 4,
  rejected: 0,
  disputed: 0,
  draft: 0,
};

export function InvoiceApprovalWorkflowStepper({ currentStatus }: InvoiceApprovalWorkflowStepperProps) {
  const currentIndex = ORDER[currentStatus] ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Invoice Approval Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex items-center gap-3 text-xs">
          {STEPS.map((step, idx) => {
            const stepIndex = idx + 1;
            const isComplete = stepIndex < currentIndex;
            const isCurrent = stepIndex === currentIndex;
            return (
              <li key={step.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-medium',
                    isComplete
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : stepIndex}
                </div>
                <span
                  className={cn(
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {idx < STEPS.length - 1 ? (
                  <div className="h-px w-6 bg-border" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
