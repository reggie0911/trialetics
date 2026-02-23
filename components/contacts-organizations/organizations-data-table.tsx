'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Building2, Users, FolderOpen, Download, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFieldName } from '@/lib/utils';
import { deleteOrganization } from '@/lib/actions/organizations';
import {
  OrganizationWithRelations,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';

interface OrganizationsDataTableProps {
  organizations: OrganizationWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (org: OrganizationWithRelations) => void;
  onEdit: (org: OrganizationWithRelations) => void;
  onRefresh: () => void;
}

export function OrganizationsDataTable({
  organizations,
  total,
  page,
  pageSize,
  onPageChange,
  onView,
  onEdit,
  onRefresh,
}: OrganizationsDataTableProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrganizationWithRelations | null>(null);

  const handleDelete = async () => {
    if (!orgToDelete) return;

    const result = await deleteOrganization(orgToDelete.id);
    if (result.success) {
      toast({
        title: 'Organization archived',
        description: `${orgToDelete.name} has been archived successfully.`,
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to archive organization',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setOrgToDelete(null);
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
      accessorKey: 'organization_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('organization_type') as string;
        return (
          <Badge variant="outline" className="text-xs">
            {ORGANIZATION_TYPE_LABELS[type as keyof typeof ORGANIZATION_TYPE_LABELS] || formatFieldName(type)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            variant={status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
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
        const primaryAddress = addresses.find((a: any) => a.is_primary) || addresses[0];
        return <span className="text-xs">{primaryAddress?.state || '—'}</span>;
      },
    },
    {
      id: 'country',
      header: 'Country',
      cell: ({ row }) => {
        const addresses = row.original.addresses || [];
        const primaryAddress = addresses.find((a: any) => a.is_primary) || addresses[0];
        return <span className="text-xs">{primaryAddress?.country || '—'}</span>;
      },
    },
    {
      id: 'contacts',
      header: 'Contacts',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span>{row.original.contacts_count || 0}</span>
        </div>
      ),
    },
    {
      id: 'projects',
      header: 'Projects',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs">
          <FolderOpen className="h-3 w-3 text-muted-foreground" />
          <span>{row.original.projects_count || 0}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const org = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(org)} className="text-xs">
                <Eye className="mr-2 h-3 w-3" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(org)} className="text-xs">
                <Pencil className="mr-2 h-3 w-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive text-xs"
                onClick={() => {
                  setOrgToDelete(org);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: organizations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const totalPages = Math.ceil(total / pageSize);

  const handleExportCSV = () => {
    try {
      // Create simplified columns for CSV export
      const csvColumns = [
        { header: 'Name', getValue: (o: OrganizationWithRelations) => o.name },
        { header: 'Type', getValue: (o: OrganizationWithRelations) => ORGANIZATION_TYPE_LABELS[o.organization_type] || formatFieldName(o.organization_type) },
        { header: 'Status', getValue: (o: OrganizationWithRelations) => ENTITY_STATUS_LABELS[o.status] || formatFieldName(o.status) },
        { header: 'State', getValue: (o: OrganizationWithRelations) => {
          const addresses = o.addresses || [];
          const primaryAddress = addresses.find((a: any) => a.is_primary) || addresses[0];
          return primaryAddress?.state || '';
        }},
        { header: 'Country', getValue: (o: OrganizationWithRelations) => {
          const addresses = o.addresses || [];
          const primaryAddress = addresses.find((a: any) => a.is_primary) || addresses[0];
          return primaryAddress?.country || '';
        }},
        { header: 'Contacts', getValue: (o: OrganizationWithRelations) => String(o.contacts_count || 0) },
        { header: 'Projects', getValue: (o: OrganizationWithRelations) => String(o.projects_count || 0) },
      ];

      const headers = csvColumns.map(col => col.header);
      const rows = organizations.map(org => 
        csvColumns.map(col => col.getValue(org))
      );

      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => {
            const cellStr = String(cell ?? '').replace(/"/g, '""');
            return `"${cellStr}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `organizations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export successful',
        description: 'Organizations data has been exported to CSV.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export organizations data.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      toast({
        title: 'Print failed',
        description: 'Failed to print page.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Export and Print Buttons */}
      {organizations.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-7"
          >
            <Download className="h-3 w-3 mr-1" />
            Download CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-7"
          >
            <Printer className="h-3 w-3 mr-1" />
            Print
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-muted/50 text-xs font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onView(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => {
                      if (cell.column.id === 'actions') {
                        e.stopPropagation();
                      }
                    }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                    <p className="text-xs">No organizations found.</p>
                    <p className="text-xs">Add your first organization to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} organizations
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Archive Organization?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will archive &quot;{orgToDelete?.name}&quot; and mark it as inactive.
              The organization can be reactivated later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="text-xs">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
