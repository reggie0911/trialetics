'use client';

import { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFieldName } from '@/lib/utils';
import { getUserProjects } from '@/lib/actions/projects';
import { assignOrganizationToProject } from '@/lib/actions/organizations';
import type { AssignedProtocol } from '@/lib/actions/projects';
import {
  OrganizationWithRelations,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';

interface UnassignedSitesTableProps {
  sites: OrganizationWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  companyId: string;
}

type RowSelection = Record<string, { projectId: string; regionId: string }>;

export function UnassignedSitesTable({
  sites,
  total,
  page,
  pageSize,
  onPageChange,
  onRefresh,
}: UnassignedSitesTableProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<AssignedProtocol[]>([]);
  const [rowSelections, setRowSelections] = useState<RowSelection>({});
  const [savingOrgId, setSavingOrgId] = useState<string | null>(null);

  useEffect(() => {
    getUserProjects().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setProjects(res.data as AssignedProtocol[]);
      }
    });
  }, []);

  const setSelection = (orgId: string, projectId: string, regionId: string) => {
    setRowSelections((prev) => ({
      ...prev,
      [orgId]: { projectId, regionId },
    }));
  };

  const getSelection = (orgId: string) => rowSelections[orgId] || { projectId: '', regionId: '' };

  const handleSave = async (org: OrganizationWithRelations) => {
    const { projectId, regionId } = getSelection(org.id);
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    const project = projects.find((p) => p.id === projectId);
    const needsRegion = project?.regions_required && (project?.countries?.length ?? 0) > 0;
    if (needsRegion && !regionId) {
      toast({
        title: 'Error',
        description: 'Please select a region',
        variant: 'destructive',
      });
      return;
    }

    setSavingOrgId(org.id);
    try {
      const result = await assignOrganizationToProject({
        organization_id: org.id,
        protocol_id: projectId,
        role: 'site',
        region_id: needsRegion ? regionId : null,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
      });

      if (result.success) {
        toast({
          title: 'Site assigned',
          description: `${org.name} has been assigned to the project successfully.`,
        });
        setRowSelections((prev) => {
          const next = { ...prev };
          delete next[org.id];
          return next;
        });
        onRefresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign site',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSavingOrgId(null);
    }
  };

  const getProjectLabel = (p: AssignedProtocol) => {
    const label = [p.protocol_number, p.protocol_name].filter(Boolean).join(' - ') || 'Unknown Project';
    return label;
  };

  const AssignCell = ({ org }: { org: OrganizationWithRelations }) => {
    const { projectId, regionId } = getSelection(org.id);
    const project = projects.find((p) => p.id === projectId);
    const showRegion = project?.regions_required && (project?.countries?.length ?? 0) > 0;
    const region = project?.countries?.find((c) => c.id === regionId);
    const canSave = projectId && (!showRegion || regionId);

    return (
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <Select
          value={projectId}
          onValueChange={(v) => v && setSelection(org.id, v, '')}
        >
          <SelectTrigger className="h-8 text-xs">
            {project ? (
              <span className="truncate capitalize">
                {getProjectLabel(project)}
              </span>
            ) : (
              <span className={projectId ? 'text-muted-foreground' : ''}>
                {projects.length === 0 ? 'No Projects Available' : 'Select Project'}
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {getProjectLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showRegion && (
          <Select
            value={regionId}
            onValueChange={(v) => v && setSelection(org.id, projectId, v)}
          >
            <SelectTrigger className="h-8 text-xs">
              {region ? (
                <span className="truncate capitalize">
                  {region.countryName}
                </span>
              ) : (
                <span className="text-muted-foreground">Select Region</span>
              )}
            </SelectTrigger>
            <SelectContent>
              {(project?.countries || []).map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.countryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  const columns: ColumnDef<OrganizationWithRelations>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'site_id',
      header: 'Site ID',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.site_id || '—'}</span>
      ),
    },
    {
      accessorKey: 'organization_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {ORGANIZATION_TYPE_LABELS[row.original.organization_type] || formatFieldName(row.original.organization_type)}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {ENTITY_STATUS_LABELS[status as keyof typeof ENTITY_STATUS_LABELS] || formatFieldName(status)}
          </Badge>
        );
      },
    },
    {
      id: 'state',
      header: 'State',
      cell: ({ row }) => {
        const addresses = row.original.addresses || [];
        const primaryAddress = addresses.find((a: { is_primary?: boolean }) => a.is_primary) || addresses[0];
        return <span className="text-xs">{primaryAddress?.state || '—'}</span>;
      },
    },
    {
      id: 'country',
      header: 'Country',
      cell: ({ row }) => {
        const addresses = row.original.addresses || [];
        const primaryAddress = addresses.find((a: { is_primary?: boolean }) => a.is_primary) || addresses[0];
        return <span className="text-xs">{primaryAddress?.country || '—'}</span>;
      },
    },
    {
      id: 'assign',
      header: 'Assign',
      cell: ({ row }) => <AssignCell org={row.original} />,
    },
    {
      id: 'save',
      header: '',
      cell: ({ row }) => {
        const org = row.original;
        const { projectId } = getSelection(org.id);
        const project = projects.find((p) => p.id === projectId);
        const showRegion = project?.regions_required && (project?.countries?.length ?? 0) > 0;
        const { regionId } = getSelection(org.id);
        const canSave = projectId && (!showRegion || regionId);
        const isSaving = savingOrgId === org.id;

        return (
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs"
            disabled={!canSave || isSaving}
            onClick={() => handleSave(org)}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: sites,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-muted/50 text-xs font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                    <p className="text-xs">No unassigned sites found.</p>
                    <p className="text-xs">All clinical sites have been assigned to at least one project.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} unassigned sites
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="text-xs h-7"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="text-xs h-7"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
