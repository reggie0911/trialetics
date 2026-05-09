'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateStudyFinanceSettings } from '@/lib/actions/study-finance-module';
import type { FmWorkspace } from '@/lib/finance-module/types';

interface WorkspaceSettingsFormProps {
  studyId: string;
  workspace: FmWorkspace;
}

export function WorkspaceSettingsForm({ studyId, workspace }: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [baseCurrency, setBaseCurrency] = useState(workspace.base_currency);
  const [fiscalStart, setFiscalStart] = useState(workspace.fiscal_period_start ?? '');
  const [fiscalEnd, setFiscalEnd] = useState(workspace.fiscal_period_end ?? '');
  const [financeOwnerUserId, setFinanceOwnerUserId] = useState(workspace.finance_owner_user_id ?? '');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const trimmedOwner = financeOwnerUserId.trim();
      const { error } = await updateStudyFinanceSettings({
        studyId,
        updatedAt: workspace.updated_at,
        baseCurrency,
        fiscalPeriodStart: fiscalStart || null,
        fiscalPeriodEnd: fiscalEnd || null,
        financeOwnerUserId: trimmedOwner === '' ? null : trimmedOwner,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Workspace settings updated.');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Workspace Settings</CardTitle>
        <CardDescription className="text-[11px]">
          Manage base currency, fiscal period, and finance owner for this study workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="base-currency" className="text-[11px]">
              Base Currency (ISO 4217)
            </Label>
            <Input
              id="base-currency"
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fiscal-start" className="text-[11px]">
              Fiscal Period Start
            </Label>
            <Input
              id="fiscal-start"
              type="date"
              value={fiscalStart}
              onChange={(event) => setFiscalStart(event.target.value)}
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fiscal-end" className="text-[11px]">
              Fiscal Period End
            </Label>
            <Input
              id="fiscal-end"
              type="date"
              value={fiscalEnd}
              onChange={(event) => setFiscalEnd(event.target.value)}
              className="text-xs"
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="finance-owner" className="text-[11px]">
              Finance owner (user UUID)
            </Label>
            <Input
              id="finance-owner"
              value={financeOwnerUserId}
              onChange={(event) => setFinanceOwnerUserId(event.target.value)}
              placeholder="Optional — directory user id"
              className="text-xs font-mono"
            />
          </div>
        </div>
        <Button size="sm" className="mt-4" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
