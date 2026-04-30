'use client';

import { useRouter } from 'next/navigation';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InstitutionRow } from '@/lib/types/directory';
import { ORG_TYPE_GROUP_LABEL } from '@/lib/directory/organization-display';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

import {
  FLAT_ORGANIZATION_COLUMNS,
  OrganizationTableCell,
} from '@/components/ctms/directory/organizations/grouped-organizations-table';

const HEADER_LABELS: Record<string, string> = {
  type: 'Type',
  org: 'Organization',
  country: 'Country',
  region: 'Region',
  status: 'Status',
  form: 'Form',
  actions: 'Actions',
};

export function DirectoryFlatOrganizationsTable({
  institutions,
  fromQuery,
  emptyMessage = 'No organizations in this list.',
  id = 'directory-organizations-table-flat',
}: {
  institutions: InstitutionRow[];
  fromQuery: string;
  emptyMessage?: string;
  id?: string;
}) {
  const router = useRouter();

  if (institutions.length === 0) {
    return (
      <DirectoryEmptyState
        title={emptyMessage}
        description="Add organizations or adjust the current filters to populate this view."
        id={id}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-background shadow-sm" aria-label="All organizations" id={id}>
      <div className="max-h-[min(60vh,560px)] overflow-y-auto">
        <Table className="w-full min-w-[900px] text-xs">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-medium min-w-[7rem]">{HEADER_LABELS.type}</TableHead>
              {FLAT_ORGANIZATION_COLUMNS.map((col) => (
                <TableHead
                  key={col}
                  className={
                    col === 'actions'
                      ? 'text-[10px] font-medium text-right w-[7rem]'
                      : 'text-[10px] font-medium'
                  }
                >
                  {HEADER_LABELS[col]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.map((inst) => {
              const typeLabels = ORG_TYPE_GROUP_LABEL[inst.organization_type] ?? {
                singular: inst.organization_type,
                plural: '',
              };
              return (
                <TableRow key={inst.id} className="h-11">
                  <TableCell className="align-middle max-w-[9rem]">
                    <span className="text-xs font-medium text-foreground truncate block" title={typeLabels.singular}>
                      {typeLabels.singular}
                    </span>
                  </TableCell>
                  {FLAT_ORGANIZATION_COLUMNS.map((col) => (
                    <OrganizationTableCell
                      key={col}
                      col={col}
                      inst={inst}
                      fromQuery={fromQuery}
                      onOpen={(orgId) => router.push(`/protected/directory/institutions/${orgId}${fromQuery}`)}
                    />
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
