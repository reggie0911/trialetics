'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { enqueueFinanceExportJob } from '@/lib/actions/study-finance-module';

interface ReportsActionsPanelProps {
  studyId: string;
}

export function ReportsActionsPanel({ studyId }: ReportsActionsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const queueExport = (kind: 'budget' | 'invoices' | 'vendors', label: string) => {
    startTransition(async () => {
      const { error } = await enqueueFinanceExportJob({ studyId, kind });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`${label} export queued. Open Data exports below to download when complete.`);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Data exports</CardTitle>
        <CardDescription className="text-xs">
          Queue CSV snapshots for the Budget tracker, Invoice register, and Vendor spend summaries. Jobs appear in the
          Data exports table with status and download when complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="justify-start text-xs"
          disabled={pending}
          onClick={() => queueExport('budget', 'Budget data')}
        >
          <Download className="size-3.5 mr-2" />
          Budget tracker (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start text-xs"
          disabled={pending}
          onClick={() => queueExport('invoices', 'Invoice register')}
        >
          <Download className="size-3.5 mr-2" />
          Invoice register (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start text-xs"
          disabled={pending}
          onClick={() => queueExport('vendors', 'Vendor spend')}
        >
          <Download className="size-3.5 mr-2" />
          Vendor spend summary (CSV)
        </Button>
      </CardContent>
    </Card>
  );
}
