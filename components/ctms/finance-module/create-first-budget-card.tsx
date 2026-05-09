'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createStudyBudget } from '@/lib/actions/study-finance-module';

interface CreateFirstBudgetCardProps {
  studyId: string;
}

export function CreateFirstBudgetCard({ studyId }: CreateFirstBudgetCardProps) {
  const router = useRouter();
  const [name, setName] = useState('Study Operating Budget');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createStudyBudget({ studyId, name });
      if (result.error || !result.data) {
        const message = result.error ?? 'Failed to create budget.';
        setError(message);
        toast.error(message);
        return;
      }
      toast.success('Budget created. Add categories and line items to start a draft version.');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Create the first budget for this study</CardTitle>
        <CardDescription className="text-xs">
          Every clinical trial budget starts as a draft. After you create the budget, add a draft
          version, populate categories and line items, then submit and approve to activate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="budget-name" className="text-xs">
            Budget Name
          </Label>
          <Input
            id="budget-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="text-xs h-9"
            style={{ fontSize: 12 }}
          />
        </div>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create budget'}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
