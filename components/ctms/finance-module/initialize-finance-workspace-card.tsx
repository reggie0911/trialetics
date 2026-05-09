'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeStudyFinanceWorkspace } from '@/lib/actions/study-finance-module';
import { toast } from 'sonner';

interface InitializeFinanceWorkspaceCardProps {
  studyId: string;
}

export function InitializeFinanceWorkspaceCard({ studyId }: InitializeFinanceWorkspaceCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialize = () => {
    setError(null);
    startTransition(async () => {
      const result = await initializeStudyFinanceWorkspace({ studyId, baseCurrency: 'USD' });
      if (result.error || !result.data) {
        const message = result.error ?? 'Failed to initialize.';
        setError(message);
        toast.error(message);
        return;
      }
      toast.success('Finance workspace initialized for this study.');
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Set up the Finance Module for this study</CardTitle>
        <CardDescription className="text-xs">
          Initialize the finance workspace to unlock budgets, vendors, invoices, purchase orders, site
          payments, forecasting, approvals, and reports for this study. The workspace defaults to USD;
          you can change the base currency later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={initialize} disabled={isPending}>
          {isPending ? 'Initializing…' : 'Initialize finance workspace'}
        </Button>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
