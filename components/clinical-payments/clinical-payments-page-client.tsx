'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClinicalPaymentsPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export function ClinicalPaymentsPageClient({
  companyId: _companyId,
  profileId: _profileId,
  email: _email,
}: ClinicalPaymentsPageClientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Clinical Payments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          The Clinical Payments module is being set up. Use the Demo Mode to explore sample data and workflows.
        </p>
        <p className="text-xs text-muted-foreground rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 p-3">
          <span className="font-medium text-foreground">Budgets and invoices:</span> manage study budgets, vendor and
          site invoices, and approvals in{' '}
          <Link href="/protected/financials" className="text-primary underline font-medium hover:text-primary/90">
            Financials
          </Link>
          . Data is not shared automatically between Clinical Payments and Financials.
        </p>
      </CardContent>
    </Card>
  );
}
