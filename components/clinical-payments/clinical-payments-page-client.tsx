'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClinicalPaymentsPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export function ClinicalPaymentsPageClient({ companyId }: ClinicalPaymentsPageClientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Clinical Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          The Clinical Payments module is being set up. Use the Demo Mode to explore sample data and workflows.
        </p>
      </CardContent>
    </Card>
  );
}
