'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FmBudget, FmBudgetVersion } from '@/lib/finance-module/types';

interface BudgetRightRailProps {
  budget: FmBudget | null;
  selectedVersion: FmBudgetVersion | null;
}

export function BudgetRightRail({ budget, selectedVersion }: BudgetRightRailProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget Details</CardTitle>
      </CardHeader>
      <CardContent>
        {!budget ? (
          <p className="text-xs text-muted-foreground">
            No budget exists yet for this study. Create one to start tracking spend.
          </p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Budget Name</dt>
            <dd className="text-foreground">{budget.name}</dd>
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="text-foreground">{budget.base_currency}</dd>
            {selectedVersion ? (
              <>
                <dt className="text-muted-foreground">Selected Version</dt>
                <dd className="text-foreground">
                  Version {selectedVersion.version_number}
                  {selectedVersion.label ? ` — ${selectedVersion.label}` : ''}
                </dd>
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="text-foreground">
                  {new Date(selectedVersion.updated_at).toLocaleDateString()}
                </dd>
              </>
            ) : null}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
