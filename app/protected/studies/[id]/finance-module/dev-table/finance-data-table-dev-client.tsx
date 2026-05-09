'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

type DemoRow = { id: string; label: string; amount: number; status: string };

export function FinanceDataTableDevClient({ studyId }: { studyId: string }) {
  const perms = useFmPermissions(studyId);

  const data = useMemo<DemoRow[]>(
    () => [
      { id: '1', label: 'Startup pass-through', amount: 4200, status: 'Open' },
      { id: '2', label: 'Monitoring visits (Q1)', amount: 11800, status: 'Open' },
      { id: '3', label: 'IRB renewal', amount: 950, status: 'Closed' },
    ],
    [],
  );

  const columns = useMemo<ColumnDef<DemoRow>[]>(
    () => [
      {
        accessorKey: 'label',
        header: 'Description',
        cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Amount (USD)',
        cell: ({ getValue }) => Number(getValue()).toLocaleString(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Internal preview for the shared <code className="rounded bg-muted px-1">FinanceDataTable</code> primitive.
        {perms.isSuccess ? (
          <span className="ml-1">{perms.data.canWrite ? 'You have write access.' : 'Read-only study or closed.'}</span>
        ) : null}
      </p>
      <FinanceDataTable urlPrefix="fmt_dev" columns={columns} data={data} getRowId={(r) => r.id} />
    </div>
  );
}
